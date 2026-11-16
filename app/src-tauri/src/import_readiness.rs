//! Group 11, evidence gate ONLY. Never writes to SQLite, never imports fills,
//! and makes no assumption about the user's NinjaTrader export schema.
use std::{fs::File,io::Read,path::Path};
use serde::Serialize;
use crate::error::AppError;

#[derive(Debug,Serialize)]
pub struct CsvReadinessReport {
    pub file_name:String,
    pub detected_delimiter:String,
    pub column_count:usize,
    pub headers:Vec<String>,
    pub ready_for_import:bool,
    pub rows_imported:u32,
    pub required_next_evidence:Vec<String>,
    pub privacy_notice:String,
}

/// Parse a single header record, allowing CSV quotes and doubled quotes.
/// Only header metadata is read: no trade data is persisted or imported.
fn parse_header(line:&str,separator:char)->Result<Vec<String>,AppError>{
    let mut cells=Vec::new();let mut cell=String::new();let mut chars=line.chars().peekable();
    let mut quoted=false;
    while let Some(ch)=chars.next(){
        match ch {
            '"' if quoted && chars.peek()==Some(&'"') => {chars.next();cell.push('"');},
            '"' => quoted=!quoted,
            x if x==separator && !quoted => {cells.push(cell.trim().to_string());cell.clear();},
            '\r' if !quoted => {},
            '\n' if !quoted => break,
            x => cell.push(x),
        }
    }
    if quoted {return Err(AppError::Validation("Unclosed CSV header quote; no trade imported".into()));}
    cells.push(cell.trim().to_string());
    if cells.len()<2 || cells.len()>100||cells.iter().any(|x|x.is_empty()){
        return Err(AppError::Validation("No valid multi-column CSV header detected; no trade imported".into()));
    }
    let mut set=std::collections::HashSet::new();
    if cells.iter().any(|h|!set.insert(h.to_lowercase())){
        return Err(AppError::Validation("Duplicate CSV header columns require manual mapping; no trade imported".into()));
    }
    Ok(cells)
}

/// Inspect a user-selected file only. Fail closed for oversize/suspicious
/// inputs, no implicit column->execution semantics and no database operation.
pub fn inspect_execution_csv(path:&Path)->Result<CsvReadinessReport,AppError>{
    if path.extension().and_then(|s|s.to_str()).map(|s|s.eq_ignore_ascii_case("csv"))!=Some(true){
        return Err(AppError::Validation("Choose a .csv export for READ-ONLY inspection".into()));
    }
    let meta=std::fs::metadata(path)?;
    if !meta.is_file()||meta.len()==0||meta.len()>10_000_000{
        return Err(AppError::Validation("CSV file must be nonempty and at most 10 MB".into()));
    }
    let mut bytes=Vec::new();
    File::open(path)?.take(32768).read_to_end(&mut bytes)?;
    let nl=bytes.iter().position(|b|*b==b'\n').ok_or_else(||AppError::Validation(
        "No complete header record in first 32 KB; no import".into()))?;
    let first=std::str::from_utf8(&bytes[..=nl])
        .map_err(|_|AppError::Validation("CSV header must be UTF-8; no import".into()))?
        .trim_start_matches('\u{feff}');
    let mut candidates=Vec::new();
    for delim in [',','\t',';'] {
        if let Ok(parsed)=parse_header(first,delim) {
            candidates.push((delim,parsed));
        }
    }
    if candidates.len()!=1 {
        return Err(AppError::Validation("Ambiguous CSV delimiter or quoting; require source mapping, no import".into()));
    }
    let (separator,headers)=candidates.remove(0);
    let file_name=path.file_name().and_then(|x|x.to_str()).unwrap_or("selected.csv").to_string();
    Ok(CsvReadinessReport{
        file_name,
        detected_delimiter:match separator {','=>"comma",'\t'=>"tab",_=>"semicolon"}.into(),
        column_count:headers.len(),headers,
        ready_for_import:false,rows_imported:0,
        required_next_evidence:vec![
            "User-confirmed meaning of each source column and the exact NinjaTrader export type".into(),
            "Instrument / contract snapshot, currency, tick value, account scope and local/UTC time zone".into(),
            "Execution IDs, order IDs, partial fills, buy/sell vs entry/exit mapping, commissions and fees".into(),
            "Duplicate/idempotency reconciliation against existing manual Decisions and Trades".into(),
            "A non-destructive isolated import dry run and explicit separate authorization before writing any Fill".into(),
        ],
        privacy_notice:"Header-only inspection; no positions, fills or CSV contents are imported, uploaded or stored in journal SQLite.".into(),
    })
}

#[cfg(test)]
mod tests{
    use super::*;
    #[test]
    fn detects_only_schema_without_trade_import_or_mutation(){
        let file=std::env::temp_dir().join(format!("ptj-nt-csv-inspection-{}.csv",uuid::Uuid::new_v4()));
        std::fs::write(&file,"Date,Instrument,Price,Side,Quantity\r\n2026-11-15,ES,5000,BUY,1\r\n").unwrap();
        let report=inspect_execution_csv(&file).unwrap();
        assert_eq!(report.column_count,5);
        assert_eq!(report.headers[2],"Price");
        assert_eq!(report.rows_imported,0);
        assert!(!report.ready_for_import);
        assert!(report.required_next_evidence.len()>=4);
        assert!(std::fs::read_to_string(&file).unwrap().contains("5000"));
        std::fs::remove_file(file).unwrap();
    }
    #[test]
    fn handles_quotes_and_rejects_ambiguous_or_duplicate_headers(){
        assert_eq!(parse_header("\"Date, Time\",\"Price\"\n",',').unwrap(),
            vec!["Date, Time","Price"]);
        assert!(parse_header("Date,Date\n",',').is_err());
        assert!(parse_header("Date,\"Price\n",',').is_err());
        assert!(parse_header("Date\n",',').is_err());
    }
}
