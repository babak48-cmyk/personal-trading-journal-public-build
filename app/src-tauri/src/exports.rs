use std::{fs, io::Write, path::{Path, PathBuf}};
use uuid::Uuid;
use chrono::Utc;
use rusqlite::Connection;
use serde::Serialize;
use crate::{error::AppError, paths::AppPaths, repository::{self, JournalFilterInput}, fill_corrections::{self, CorrectionHistoryEvent}, initial_risk_corrections::{self,InitialRiskCorrectionEvent},source_type_corrections::{self,SourceTypeCorrectionEvent},source_price_corrections::{self,SourcePriceCorrectionEvent}};

#[derive(Debug, Serialize)]
pub struct ExportResult {
    pub path: String,
    pub row_count: usize,
    pub created_at: String,
}

fn esc_html(s:&str)->String { s.replace('&',"&amp;").replace('<',"&lt;").replace('>',"&gt;").replace('"',"&quot;") }
fn csv_cell(s:&str)->String { format!("\"{}\"",s.replace('"',"\"\"")) }

/// Reports are evidence: never silently replace an earlier export.
fn write_new_report(path:&Path,bytes:&[u8])->Result<(),AppError>{
    let mut file=fs::OpenOptions::new().write(true).create_new(true).open(path)?;
    if let Err(err)=file.write_all(bytes).and_then(|_|file.sync_all()){
        drop(file);
        let _=fs::remove_file(path);
        return Err(err.into());
    }
    Ok(())
}

/// An export is an evidentiary artifact. Do not write a success-looking CSV
/// or HTML if even one immutable correction chain in the local journal fails.
/// Every audit family is checked globally (including rows omitted by filters).
/// Restore and backup use the same native validators; no historical rewrite.
fn verify_export_audit_chains(conn:&Connection)->Result<(),AppError>{
    fill_corrections::verify_all_correction_chains(conn)?;
    initial_risk_corrections::verify_all_initial_risk_correction_chains(conn)?;
    source_type_corrections::verify_all_source_correction_chains(conn)?;
    source_price_corrections::verify_all(conn)?;
    Ok(())
}


pub fn export_html(conn:&Connection, paths:&AppPaths, filter:JournalFilterInput)->Result<ExportResult,AppError>{
    verify_export_audit_chains(conn)?;
    let rows=repository::list_journal_trades(conn,filter.clone())?;
    let a=repository::get_analytics_summary(conn,filter.clone())?;
    // Decision-only records cannot be inferred from the Trade table.
    // Reuse the same source and approved filter semantics as Analytics:
    // only date/instrument apply to NO_TRADE/MISSED, never trade-only
    // direction, quality, evidence or level source filters.
    let decision_rows=repository::list_decision_only_analytics(conn,filter.clone())?;
    let reason_rows=repository::list_decision_reason_analytics(conn,filter)?;
    // Compute and validate all audit chains before a report is written.
    // No correction history may be silently dropped from effective-value reports.
    let mut audits:Vec<(String,Vec<CorrectionHistoryEvent>)>=Vec::new();
    let mut risk_audits:Vec<(String,Vec<InitialRiskCorrectionEvent>)>=Vec::new();
    let mut source_audits:Vec<(String,Vec<SourceTypeCorrectionEvent>)>=Vec::new();
    let mut price_audits:Vec<(String,Vec<SourcePriceCorrectionEvent>)>=Vec::new();
    for row in &rows {
        audits.push((row.trade_id.clone(),fill_corrections::list_trade_correction_history(conn,&row.trade_id)?));
        risk_audits.push((row.trade_id.clone(),initial_risk_corrections::list_initial_risk_corrections(conn,&row.trade_id)?));
        source_audits.push((row.trade_id.clone(),source_type_corrections::list_source_corrections_for_trade(conn,&row.trade_id)?));
        price_audits.push((row.trade_id.clone(),source_price_corrections::list_for_trade(conn,&row.trade_id)?));
    }
    fs::create_dir_all(&paths.exports)?;
    let created=Utc::now();
    let path:PathBuf=paths.exports.join(format!("TradingJournal_Report_{}_{}.html",created.format("%Y%m%d_%H%M%S"),Uuid::new_v4()));
    let metric=|label:&str,value:String|format!("<div class='m'><span>{}</span><b>{}</b></div>",esc_html(label),esc_html(&value));
    let mut html=String::from("<!doctype html><html><head><meta charset='utf-8'><title>Trading Journal Report</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#1f2937}h1{margin-bottom:4px}.sub{color:#64748b}.metrics{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0}.m{border:1px solid #ddd;border-radius:10px;padding:10px 14px;min-width:120px}.m span{display:block;color:#64748b;font-size:12px}.m b{font-size:20px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-bottom:1px solid #e5e7eb;text-align:left;padding:8px;vertical-align:top}th{background:#f8fafc}.warn{padding:10px;background:#fff7ed;border:1px solid #fdba74;border-radius:8px}</style></head><body>");
    html.push_str("<h1>Personal Trading Journal</h1><div class='sub'>Readable local export</div><div class='metrics'>");
    html.push_str(&metric("Trades",a.trade_count.to_string()));
    html.push_str(&metric("Closed trades",a.closed_trade_count.to_string()));
    html.push_str(&metric("Known Net P&L / closed",format!("{}/{}",a.eligible_net_pnl_count,a.closed_trade_count)));
    html.push_str(&metric("R sample / closed",format!("{}/{}",a.eligible_r_count,a.closed_trade_count)));
    html.push_str(&metric("Win rate",a.win_rate.map(|v|format!("{:.1}%",v)).unwrap_or("—".into())));
    html.push_str(&metric("Average R",a.average_r.map(|v|format!("{:.2}R",v)).unwrap_or("—".into())));
    html.push_str(&metric("Net R of known-R trades",a.net_r.map(|v|format!("{:.2}R",v)).unwrap_or("—".into())));
    html.push_str(&metric("Expectancy",a.expectancy_r.map(|v|format!("{:.2}R",v)).unwrap_or("—".into())));
    html.push_str(&metric("Bad decision + known net profit",a.bad_decision_win_count.to_string()));
    html.push_str("</div>");
    if a.small_sample {html.push_str("<p class='warn'>Small sample — interpret performance metrics cautiously.</p>");}
    if a.eligible_net_pnl_count<a.closed_trade_count{
      html.push_str("<p class='warn'>Net P&amp;L sums only verified net outcomes; missing costs are UNKNOWN, not zero.</p>");
    }
    if a.eligible_r_count<a.closed_trade_count{
      html.push_str("<p class='warn'>R and expectancy are restricted to closed trades with known net result and valid initial risk.</p>");
    }
    html.push_str("<table><thead><tr><th>Date</th><th>Instrument</th><th>Direction</th><th>Status</th><th>Candidate</th><th>Level sources</th><th>Decision quality</th><th>Rules</th><th>Mistakes</th><th>R</th><th>Net P&amp;L</th></tr></thead><tbody>");
    for r in &rows {
        html.push_str(&format!("<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
            esc_html(&r.session_date),esc_html(&r.instrument_symbol),esc_html(&r.direction),esc_html(&r.status),esc_html(r.candidate_label.as_deref().unwrap_or("—")),
            esc_html(&r.level_sources.join(" · ")),esc_html(r.decision_quality.as_deref().unwrap_or("—")),esc_html(&r.rule_status),esc_html(&r.mistakes.join(" · ")),
            r.realized_r.map(|v|format!("{:.2}R",v)).unwrap_or("—".into()),r.net_realized_pnl.map(|v|format!("${:.2}",v)).unwrap_or("—".into())))
    }
    html.push_str("</tbody></table>");
    // Decision-only events are NOT Trades: no fabricated fills, P&L, R or
    // validity classification. Preserve separate sample and filter scope.
    let no_trade_total:i64=decision_rows.iter().map(|d|d.no_trade_count).sum();
    let missed_total:i64=decision_rows.iter().map(|d|d.missed_count).sum();
    let reason_unknown_total:i64=decision_rows.iter().map(|d|d.reason_missing_count).sum();
    html.push_str("<h2>Recorded NO_TRADE / MISSED decisions (not executed trades)</h2>");
    html.push_str("<p>Counts are original saved Decision events, not hypothetical fills, missed profits or proof of a valid opportunity. Only session date and instrument filters apply here; trade-only filters do not narrow these independent counts. No R or P&amp;L is assigned.</p>");
    html.push_str("<div class='metrics'>");
    html.push_str(&metric("NO_TRADE decisions",no_trade_total.to_string()));
    html.push_str(&metric("MISSED decisions",missed_total.to_string()));
    html.push_str(&metric("Decision reason not recorded",reason_unknown_total.to_string()));
    html.push_str("</div>");
    html.push_str("<table><thead><tr><th>Session date</th><th>Instrument</th><th>NO_TRADE</th><th>MISSED</th><th>Reasons not recorded</th></tr></thead><tbody>");
    for d in &decision_rows{
      html.push_str(&format!("<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
        esc_html(&d.session_date),esc_html(&d.instrument_symbol),
        d.no_trade_count,d.missed_count,d.reason_missing_count));
    }
    if decision_rows.is_empty(){
      html.push_str("<tr><td colspan='5'>No recorded NO_TRADE/MISSED decisions under the date/instrument filters.</td></tr>");
    }
    html.push_str("</tbody></table>");
    html.push_str("<h3>Original decision reason categories</h3>");
    html.push_str("<p>Structured codes are preserved as recorded. Free-text-only explanations are not inferred or assigned a fabricated code.</p>");
    html.push_str("<table><thead><tr><th>Date</th><th>Instrument</th><th>Decision</th><th>Recorded reason category</th><th>Count</th></tr></thead><tbody>");
    for d in &reason_rows{
      let category=match d.reason_code.as_str(){
        "[FREE_TEXT_ONLY]"=>"Free-text reason (not classified)",
        "[NO_REASON]"=>"Reason not recorded",
        other=>other
      };
      html.push_str(&format!("<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
        esc_html(&d.session_date),esc_html(&d.instrument_symbol),
        esc_html(&d.decision_type),esc_html(category),d.decision_count));
    }
    if reason_rows.is_empty(){
      html.push_str("<tr><td colspan='5'>No recorded decision reason groups for the selected date/instrument filters.</td></tr>");
    }
    html.push_str("</tbody></table>");
    html.push_str("<h2>Audited corrections</h2><p>Trade results above use effective recorded values. Every correction retains the original immutable execution event, the previous and replacement values, reason and timestamp. Original values are never rewritten.</p>");
    html.push_str("<table><thead><tr><th>Trade ID</th><th>Execution ID</th><th>Field</th><th>Revision</th><th>Previous</th><th>Replacement</th><th>Reason</th><th>Timestamp (UTC)</th><th>Operator</th><th>Correction ID</th></tr></thead><tbody>");
    let mut any=false;
    for (trade_id,events) in &audits {
        for event in events {
            any=true;
            let old=event.previous.map(|v|v.to_string()).unwrap_or("UNKNOWN".into());
            let new=event.replacement.map(|v|v.to_string()).unwrap_or("UNKNOWN".into());
            html.push_str(&format!("<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
                esc_html(trade_id),esc_html(&event.execution_id),esc_html(&event.field),
                event.revision,esc_html(&old),esc_html(&new),esc_html(&event.reason),
                esc_html(&event.recorded_at_utc),esc_html(&event.actor),esc_html(&event.correction_id)));
        }
    }
    if !any {html.push_str("<tr><td colspan='10'>No audited corrections in this report.</td></tr>");}
    html.push_str("</tbody></table>");
    html.push_str("<h2>Audited INITIAL risk-dollar corrections</h2><p>These are corrections of original recorded risk, not actual Stop Moves. Trade R is calculated from the effective initial-risk denominator; original SQLite risk snapshot remains preserved. Null means unknown, not zero.</p>");
    html.push_str("<table><thead><tr><th>Trade ID</th><th>Risk snapshot</th><th>Revision</th><th>Original</th><th>Previous</th><th>Replacement</th><th>Reason</th><th>UTC timestamp</th><th>Actor</th><th>Correction ID</th></tr></thead><tbody>");
    let mut any_risk=false;
    for (trade_id,events) in &risk_audits {
      for event in events {
        any_risk=true;
        html.push_str(&format!("<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
          esc_html(trade_id),esc_html(&event.risk_snapshot_id),event.revision,
          event.original_risk_dollars.map(|v|v.to_string()).unwrap_or("UNKNOWN".into()),
          event.previous_risk_dollars.map(|v|v.to_string()).unwrap_or("UNKNOWN".into()),
          event.replacement_risk_dollars,esc_html(&event.reason),
          esc_html(&event.recorded_at_utc),esc_html(&event.actor),esc_html(&event.correction_id)));
      }
    }
    if !any_risk {html.push_str("<tr><td colspan='10'>No initial-risk corrections for selected Trades.</td></tr>");}
    html.push_str("</tbody></table>");
    html.push_str("<h2>Audited historical Level Source type corrections</h2><p>The original Zone revision and candidate source ID are preserved. Effective historical classification is shown with a correction flag in the level-source summary; this is not an observed confirmation or actual later market revision.</p>");
    html.push_str("<table><thead><tr><th>Trade ID</th><th>Candidate source ID</th><th>Revision</th><th>Original source type ID</th><th>Previous source type ID</th><th>Replacement source type ID</th><th>Reason</th><th>UTC timestamp</th><th>Actor</th><th>Audit ID</th></tr></thead><tbody>");
    let mut any_source=false;
    for (trade_id,events) in &source_audits {
      for event in events {
        any_source=true;
        html.push_str(&format!("<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
          esc_html(trade_id),esc_html(&event.candidate_source_id),event.revision,
          esc_html(&event.original_source_type_id),esc_html(&event.previous_source_type_id),
          esc_html(&event.replacement_source_type_id),esc_html(&event.reason),
          esc_html(&event.recorded_at_utc),esc_html(&event.actor),esc_html(&event.correction_id)));
      }
    }
    if !any_source{html.push_str("<tr><td colspan='10'>No source type correction events for these Trades.</td></tr>");}
    html.push_str("</tbody></table>");
    html.push_str("<h2>Audited historical Level Source price corrections</h2><p>Original candidate_sources.source_price and Zone geometry are preserved. This correction changes only the effective historical source price, not fills or financial results.</p>");
    html.push_str("<table><thead><tr><th>Trade ID</th><th>Source ID</th><th>Revision</th><th>Original price</th><th>Previous price</th><th>Effective price</th><th>Reason</th><th>UTC timestamp</th><th>Actor</th><th>Audit ID</th></tr></thead><tbody>");
    let mut any_source_price=false;
    for (trade_id,events) in &price_audits {
      for event in events {
        any_source_price=true;
        html.push_str(&format!("<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
          esc_html(trade_id),esc_html(&event.candidate_source_id),event.revision,
          event.original_source_price.map(|p|p.to_string()).unwrap_or("Unknown".into()),
          event.previous_source_price.map(|p|p.to_string()).unwrap_or("Unknown".into()),
          event.replacement_source_price,esc_html(&event.reason),
          esc_html(&event.recorded_at_utc),esc_html(&event.actor),esc_html(&event.correction_id)));
      }
    }
    if !any_source_price{html.push_str("<tr><td colspan='10'>No historical source price correction events for these Trades.</td></tr>");}
    html.push_str("</tbody></table></body></html>");
    write_new_report(&path,html.as_bytes())?;
    Ok(ExportResult{path:path.to_string_lossy().to_string(),row_count:rows.len(),created_at:created.to_rfc3339()})
}

pub fn export_csv(conn:&Connection, paths:&AppPaths, filter:JournalFilterInput)->Result<ExportResult,AppError>{
    verify_export_audit_chains(conn)?;
    let rows=repository::list_journal_trades(conn,filter)?;
    fs::create_dir_all(&paths.exports)?;
    let created=Utc::now();
    let path=paths.exports.join(format!("TradingJournal_Trades_{}_{}.csv",created.format("%Y%m%d_%H%M%S"),Uuid::new_v4()));
    let mut out=String::from("session_date,instrument,direction,status,candidate,level_sources,decision_quality,rule_status,mistakes,realized_r_effective,net_pnl_effective,trade_id,audited_correction_count,audited_corrections_json,audited_initial_risk_correction_count,audited_initial_risk_corrections_json,audited_source_type_correction_count,audited_source_type_corrections_json,audited_source_price_correction_count,audited_source_price_corrections_json\n");
    for r in &rows {
        let events=fill_corrections::list_trade_correction_history(conn,&r.trade_id)?;
        let history_json=serde_json::to_string(&events)?;
        let risk_events=initial_risk_corrections::list_initial_risk_corrections(conn,&r.trade_id)?;
        let risk_history_json=serde_json::to_string(&risk_events)?;
        let source_events=source_type_corrections::list_source_corrections_for_trade(conn,&r.trade_id)?;
        let source_history_json=serde_json::to_string(&source_events)?;
        let source_price_events=source_price_corrections::list_for_trade(conn,&r.trade_id)?;
        let source_price_history_json=serde_json::to_string(&source_price_events)?;
        let vals=[csv_cell(&r.session_date),csv_cell(&r.instrument_symbol),csv_cell(&r.direction),csv_cell(&r.status),csv_cell(r.candidate_label.as_deref().unwrap_or("")),csv_cell(&r.level_sources.join(" | ")),csv_cell(r.decision_quality.as_deref().unwrap_or("")),csv_cell(&r.rule_status),csv_cell(&r.mistakes.join(" | ")),r.realized_r.map(|v|v.to_string()).unwrap_or_default(),r.net_realized_pnl.map(|v|v.to_string()).unwrap_or_default(),csv_cell(&r.trade_id),events.len().to_string(),csv_cell(&history_json),risk_events.len().to_string(),csv_cell(&risk_history_json),source_events.len().to_string(),csv_cell(&source_history_json),source_price_events.len().to_string(),csv_cell(&source_price_history_json)];
        out.push_str(&vals.join(","));out.push('\n');
    }
    write_new_report(&path,out.as_bytes())?;
    Ok(ExportResult{path:path.to_string_lossy().to_string(),row_count:rows.len(),created_at:created.to_rfc3339()})
}


#[cfg(test)]
mod decision_only_html_export_tests{
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn rapid_exports_preserve_prior_report_contents_and_never_replace_existing_files(){
        let conn=Connection::open_in_memory().unwrap();
        crate::db::migrate(&conn).unwrap();
        let root=std::env::temp_dir().join(format!("ptj-evidence-unique-{}",uuid::Uuid::new_v4()));
        let paths=AppPaths{
          root:root.clone(),data:root.join("data"),attachments:root.join("attachments"),
          backups:root.join("backups"),exports:root.join("exports"),logs:root.join("logs")
        };
        let filter=JournalFilterInput::default();
        let first_html=export_html(&conn,&paths,filter.clone()).unwrap();
        let first_csv=export_csv(&conn,&paths,filter.clone()).unwrap();
        let html_before=std::fs::read(&first_html.path).unwrap();
        let csv_before=std::fs::read(&first_csv.path).unwrap();
        let second_html=export_html(&conn,&paths,filter.clone()).unwrap();
        let second_csv=export_csv(&conn,&paths,filter).unwrap();
        assert_ne!(first_html.path,second_html.path);
        assert_ne!(first_csv.path,second_csv.path);
        assert_eq!(std::fs::read(&first_html.path).unwrap(),html_before);
        assert_eq!(std::fs::read(&first_csv.path).unwrap(),csv_before);
        assert_eq!(std::fs::read_dir(&paths.exports).unwrap().count(),4);
        let preserved=paths.exports.join("protected.html");
        std::fs::write(&preserved,b"ORIGINAL").unwrap();
        assert!(write_new_report(&preserved,b"REPLACEMENT").is_err(),
          "create_new must reject any preexisting file");
        assert_eq!(std::fs::read(&preserved).unwrap(),b"ORIGINAL");
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn html_exports_original_missed_and_no_trade_without_fabricating_trades_r_or_reasons(){
        let conn=Connection::open_in_memory().unwrap();
        crate::db::migrate(&conn).unwrap();
        conn.execute_batch("
          INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','Synthetic','now');
          INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value)
            VALUES('i-es','w','ES',0.25,50),('i-gc','w','GC',0.1,100);
          INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at)
            VALUES('s-es','w','i-es','2026-11-23','DEMO','now','CLOSED','now','now'),
                  ('s-gc','w','i-gc','2026-11-23','DEMO','now','CLOSED','now','now');
          INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type,reason_code,reason_note)
            VALUES('no','s-es','2026-11-23T10:00:00Z','NO_TRADE','NO_CONFIRMATION',NULL),
                  ('missed','s-es','2026-11-23T10:01:00Z','MISSED',NULL,'Opportunity needs review'),
                  ('other','s-gc','2026-11-23T10:02:00Z','MISSED',NULL,NULL);
        ").unwrap();
        let root=std::env::temp_dir().join(format!("ptj-decision-export-{}",uuid::Uuid::new_v4()));
        let paths=AppPaths{
          data:root.join("data"),attachments:root.join("attachments"),
          backups:root.join("backups"),exports:root.join("exports"),
          logs:root.join("logs"),root:root.clone()
        };
        let report=export_html(&conn,&paths,JournalFilterInput{
          instrument_symbol:Some("ES".into()),..JournalFilterInput::default()
        }).unwrap();
        assert_eq!(report.row_count,0,"decisions cannot inflate executed trade count");
        let html=std::fs::read_to_string(&report.path).unwrap();
        assert!(html.contains("Recorded NO_TRADE / MISSED decisions"));
        assert!(html.contains("<span>NO_TRADE decisions</span><b>1</b>"));
        assert!(html.contains("<span>MISSED decisions</span><b>1</b>"));
        assert!(html.contains("<span>Decision reason not recorded</span><b>0</b>"));
        assert!(html.contains("NO_CONFIRMATION"));
        assert!(html.contains("Free-text reason (not classified)"));
        assert!(!html.contains("Opportunity needs review"),
          "free-text decision notes must not be rendered as invented structured reason");
        assert!(!html.contains("<span>MISSED decisions</span><b>2</b>"),
          "GC decisions cannot enter an ES-only report");
        assert!(html.contains("<span>R sample / closed</span><b>0/0</b>"));
        assert!(html.contains("<span>Win rate</span><b>—</b>"));
        std::fs::remove_dir_all(root).unwrap();
    }
}
