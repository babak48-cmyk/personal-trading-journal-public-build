//! Isolated Package C correction foundation. DO NOT expose commands/UX
//! before effective-value analytics, export, backups and user acceptance gates.
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::error::AppError;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all="snake_case")]
pub enum FillField { Price, Quantity, Commission, Fees }
impl FillField {
    fn code(self)->&'static str {
        match self { Self::Price=>"price",Self::Quantity=>"quantity",
            Self::Commission=>"commission",Self::Fees=>"fees" }
    }
}
#[derive(Debug, Clone, Deserialize)]
pub struct FillCorrectionRequest {
    pub execution_id:String,
    pub field:FillField,
    pub expected_effective:Option<f64>,
    pub replacement:Option<f64>,
    pub reason:String,
}
#[derive(Debug, Clone, Serialize)]
pub struct FillCorrectionReceipt {
    pub correction_id:String,
    pub execution_id:String,
    pub field:String,
    pub revision:i64,
    pub previous:Option<f64>,
    pub replacement:Option<f64>,
    pub recorded_at_utc:String,
}
#[derive(Debug, Clone)]
struct CorrectedFill {
    execution_id:String, action:String, price:f64, quantity:f64,
    commission:Option<f64>,fees:Option<f64>,
}
fn field_value(row:&CorrectedFill,field:FillField)->Option<f64> {
    match field {FillField::Price=>Some(row.price),FillField::Quantity=>Some(row.quantity),
      FillField::Commission=>row.commission,FillField::Fees=>row.fees }
}
fn set_field(row:&mut CorrectedFill,field:FillField,value:Option<f64>)->Result<(),AppError>{
    match (field,value) {
        (FillField::Price,Some(v)) =>row.price=v,
        (FillField::Quantity,Some(v))=>row.quantity=v,
        (FillField::Commission,v)=>row.commission=v,
        (FillField::Fees,v)=>row.fees=v,
        _=>return Err(AppError::Validation("price and quantity cannot become unknown".into()))
    }
    Ok(())
}
fn validate_value(field:FillField,value:Option<f64>,tick:f64)->Result<(),AppError>{
    if matches!(field,FillField::Price|FillField::Quantity) && value.is_none(){
        return Err(AppError::Validation("price or quantity is mandatory".into()));
    }
    if let Some(v)=value {
        if !v.is_finite(){return Err(AppError::Validation("invalid nonfinite correction value".into()));}
        match field {
            FillField::Price if v<=0.0 || tick<=0.0 || (v/tick-(v/tick).round()).abs()>1e-8 =>
              return Err(AppError::Validation("corrected fill price must be positive and tick aligned".into())),
            FillField::Quantity if v<=0.0 || v.fract()!=0.0 =>
              return Err(AppError::Validation("corrected quantity must be a positive whole contract".into())),
            FillField::Commission|FillField::Fees if v<0.0 =>
              return Err(AppError::Validation("cost cannot be negative".into())),
            _=>{}
        }
    }
    Ok(())
}
fn effective_scalar(conn:&Connection,execution_id:&str,field:FillField,original:Option<f64>)
   ->Result<(Option<f64>,i64,Option<String>),AppError>{
    let mut stmt=conn.prepare(
      "SELECT revision,previous_is_null,previous_number,replacement_is_null,replacement_number,
              correction_id,expected_prior_correction_id
       FROM fill_correction_events WHERE execution_id=?1 AND field_code=?2 ORDER BY revision")?;
    let events=stmt.query_map(params![execution_id,field.code()],|r|
        Ok((r.get::<_,i64>(0)?,r.get::<_,i64>(1)?,r.get::<_,Option<f64>>(2)?,
            r.get::<_,i64>(3)?,r.get::<_,Option<f64>>(4)?,
            r.get::<_,String>(5)?,r.get::<_,Option<String>>(6)?)))?;
    let mut value=original;let mut revision=0_i64;let mut last:Option<String>=None;
    for event in events {
        let (next,prev_null,prev,replace_null,replacement,id,expected_id)=event?;
        let old=if prev_null==1{None}else{prev};
        let new=if replace_null==1{None}else{replacement};
        if next!=revision+1||old!=value||expected_id!=last {
            return Err(AppError::Validation("ambiguous or tampered correction chain".into()));
        }
        value=new;revision=next;last=Some(id);
    }
    Ok((value,revision,last))
}
fn read_effective_fills(conn:&Connection,trade_id:&str)->Result<Vec<CorrectedFill>,AppError>{
    let mut stmt=conn.prepare(
      "SELECT execution_id,action,price,quantity,commission,fees FROM execution_fills
       WHERE trade_id=?1 ORDER BY COALESCE(occurred_at,''),rowid")?;
    let rows=stmt.query_map([trade_id],|r|Ok(CorrectedFill{
      execution_id:r.get(0)?,action:r.get(1)?,price:r.get(2)?,quantity:r.get(3)?,
      commission:r.get(4)?,fees:r.get(5)?
    }))?;
    let mut fills=rows.collect::<Result<Vec<_>,_>>()?;
    for fill in &mut fills {
        for field in [FillField::Price,FillField::Quantity,FillField::Commission,FillField::Fees] {
            let (current,_,_)=effective_scalar(conn,&fill.execution_id,field,field_value(fill,field))?;
            set_field(fill,field,current)?;
        }
    }
    Ok(fills)
}
fn validate_trade_ledger(fills:&[CorrectedFill],tick:f64)->Result<(f64,f64),AppError>{
    let mut open=0.0;let mut total_entry=0.0;
    for f in fills {
        validate_value(FillField::Price,Some(f.price),tick)?;
        validate_value(FillField::Quantity,Some(f.quantity),tick)?;
        validate_value(FillField::Commission,f.commission,tick)?;
        validate_value(FillField::Fees,f.fees,tick)?;
        match f.action.as_str(){
          "ENTRY" => {open+=f.quantity;total_entry+=f.quantity;},
          "EXIT" if f.quantity<=open+1e-9=>open=(open-f.quantity).max(0.0),
          "EXIT"=>return Err(AppError::Validation("corrected exits exceed chronologically available contracts".into())),
          _=>return Err(AppError::Validation("unknown fill action".into()))
        }
    }
    Ok((open,total_entry))
}

/// Append correction only after full trade validation and stale-version check.
/// This foundation intentionally is NOT a Tauri command and must not be used
/// as production correction capability until all consumers are effective-aware.
pub fn record_fill_correction(
 conn:&mut Connection, request:FillCorrectionRequest
)->Result<FillCorrectionReceipt,AppError>{
    if request.reason.trim().is_empty() || request.reason.trim().len()>500 {
        return Err(AppError::Validation("a meaningful correction reason (max 500 chars) is mandatory".into()));
    }
    let tx=conn.transaction()?;
    let (trade_id,field_old,tick): (String,Option<f64>,f64)=tx.query_row(
      "SELECT f.trade_id, CASE ?2 WHEN 'price' THEN f.price WHEN 'quantity' THEN f.quantity
        WHEN 'commission' THEN f.commission ELSE f.fees END,
        COALESCE(s.instrument_tick_size_snapshot,i.tick_size)
       FROM execution_fills f JOIN trades t ON t.trade_id=f.trade_id
       JOIN sessions s ON s.session_id=t.session_id
       JOIN instruments i ON i.instrument_id=s.instrument_id
       WHERE f.execution_id=?1",
      params![request.execution_id,request.field.code()],
      |r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))
    )?;
    let complete:i64=tx.query_row(
      "SELECT COUNT(*) FROM trade_reviews WHERE trade_id=?1 AND status='COMPLETED'",
      [&trade_id],|r|r.get(0))?;
    if complete>0 {
        return Err(AppError::Validation("completed trade review is locked: correction policy not yet approved".into()));
    }
    validate_value(request.field,request.replacement,tick)?;
    let (prior,revision,previous_id)=effective_scalar(&tx,&request.execution_id,request.field,field_old)?;
    if prior!=request.expected_effective {
        return Err(AppError::Validation("stale correction: reopen the recorded effective value".into()));
    }
    if prior==request.replacement {
        return Err(AppError::Validation("no recorded change: correction is unnecessary".into()));
    }
    let mut effective=read_effective_fills(&tx,&trade_id)?;
    let row=effective.iter_mut().find(|f|f.execution_id==request.execution_id)
        .ok_or_else(||AppError::Validation("target execution is not in its owning trade".into()))?;
    set_field(row,request.field,request.replacement)?;
    let (open,_entries)=validate_trade_ledger(&effective,tick)?;
    let status:String=tx.query_row("SELECT status FROM trades WHERE trade_id=?1",[&trade_id],|r|r.get(0))?;
    // Do not silently mutate stored trade state. In particular, a historical
    // closed position cannot acquire unmatched contracts via a correction.
    if (status=="CLOSED"&&open>1e-9) ||
       (matches!(status.as_str(),"OPEN"|"PARTIALLY_CLOSED")&&open<=1e-9) {
        return Err(AppError::Validation("corrected position disagrees with stored status; linked correction gate is not approved".into()));
    }
    // Initial entry corrections need independent risk-denominator policy.
    let entry_action:String=tx.query_row("SELECT action FROM execution_fills WHERE execution_id=?1",
        [&request.execution_id],|r|r.get(0))?;
    if entry_action=="ENTRY" && matches!(request.field,FillField::Price|FillField::Quantity) {
        return Err(AppError::Validation("entry price/quantity needs an explicitly linked initial-risk correction; not yet enabled".into()));
    }
    let id=Uuid::new_v4().to_string();let at=Utc::now().to_rfc3339();
    tx.execute(
      "INSERT INTO fill_correction_events(
        correction_id,execution_id,revision,field_code,recorded_at_utc,actor,reason,
        previous_is_null,previous_number,replacement_is_null,replacement_number,expected_prior_correction_id)
       VALUES (?1,?2,?3,?4,?5,'USER',?6,?7,?8,?9,?10,?11)",
      params![id,request.execution_id,revision+1,request.field.code(),at,request.reason,
        i64::from(prior.is_none()),prior,i64::from(request.replacement.is_none()),
        request.replacement,previous_id]
    )?;
    tx.commit()?;
    Ok(FillCorrectionReceipt{correction_id:id,execution_id:request.execution_id,
      field:request.field.code().into(),revision:revision+1,previous:prior,
      replacement:request.replacement,recorded_at_utc:at})
}

#[cfg(test)]
mod tests{
    use super::*;
    use crate::db;
    #[test]
    fn migration_and_correction_are_append_only_owner_safe_and_atomic(){
        let mut db=Connection::open_in_memory().unwrap();
        db.execute_batch("PRAGMA foreign_keys=ON").unwrap();
        db::migrate(&db).unwrap();
        assert_eq!(db::schema_version(&db).unwrap(),10);
        db::migrate(&db).unwrap();
        assert_eq!(db::schema_version(&db).unwrap(),10);
        db.execute_batch("
          INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','test','2026-11-15');
          INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value) VALUES('i','w','ES',0.25,50);
          INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at)
            VALUES('s','w','i','2026-11-15','DEMO','now','ACTIVE','now','now');
          INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type,intended_direction)
            VALUES('d','s','now','TRADE','LONG');
          INSERT INTO trades(trade_id,decision_id,session_id,direction,status)
            VALUES('t','d','s','LONG','CLOSED');
          INSERT INTO execution_fills(execution_id,trade_id,action,side,price,quantity,commission,fees)
            VALUES('e1','t','ENTRY','BUY',5000,2,2,0.5),
                  ('e2','t','EXIT','SELL',5004,1,2,0.5),
                  ('e3','t','EXIT','SELL',5008,1,2,0.5);
        ").unwrap();
        let make=|expected,replacement|FillCorrectionRequest{
            execution_id:"e2".into(),field:FillField::Price,expected_effective:expected,
            replacement,reason:"Transcription error from manual NinjaTrader record".into()};
        let first=record_fill_correction(&mut db,make(Some(5004.0),Some(5005.0))).unwrap();
        assert_eq!(first.revision,1);
        assert!(record_fill_correction(&mut db,make(Some(5004.0),Some(5006.0))).is_err());
        let second=record_fill_correction(&mut db,make(Some(5005.0),Some(5004.25))).unwrap();
        assert_eq!(second.revision,2);
        assert_eq!(effective_scalar(&db,"e2",FillField::Price,Some(5004.0)).unwrap().0,Some(5004.25));
        let original:f64=db.query_row("SELECT price FROM execution_fills WHERE execution_id='e2'",[],|r|r.get(0)).unwrap();
        assert_eq!(original,5004.0);
        assert!(db.execute("UPDATE fill_correction_events SET reason='x' WHERE correction_id=?1",
            [&first.correction_id]).is_err());
        assert!(db.execute("DELETE FROM fill_correction_events WHERE correction_id=?1",
            [&second.correction_id]).is_err());
        assert!(record_fill_correction(&mut db,FillCorrectionRequest{
            execution_id:"e3".into(),field:FillField::Quantity,expected_effective:Some(1.0),
            replacement:Some(2.0),reason:"Invalid oversized exit".into()}).is_err());
        let count:i64=db.query_row("SELECT COUNT(*) FROM fill_correction_events",[],|r|r.get(0)).unwrap();
        assert_eq!(count,2);
        assert_eq!(db::integrity_check(&db).unwrap(),"ok");
        assert_eq!(db::foreign_key_violation_count(&db).unwrap(),0);
    }
}
