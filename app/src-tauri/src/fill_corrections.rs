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
/// Single authoritative scalar resolver for all consumers of execution data.
/// Original values stay in execution_fills; any chain inconsistency fails closed.
pub(crate) fn effective_fill_number(
 conn:&Connection,execution_id:&str,field:FillField,original:Option<f64>
)->Result<Option<f64>,AppError>{
    Ok(effective_scalar(conn,execution_id,field,original)?.0)
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

#[derive(Debug, Clone, Serialize)]
pub struct CorrectionHistoryEvent {
    pub execution_id:String,
    pub correction_id:String,
    pub revision:i64,
    pub field:String,
    pub previous:Option<f64>,
    pub replacement:Option<f64>,
    pub reason:String,
    pub recorded_at_utc:String,
    pub actor:String,
    pub expected_prior_correction_id:Option<String>,
}

/// Read-only, original IDs and immutable event chain for one owning Fill.
pub fn list_fill_correction_history(
    conn:&Connection,execution_id:&str,
)->Result<Vec<CorrectionHistoryEvent>,AppError>{
    let exists:i64=conn.query_row(
        "SELECT COUNT(*) FROM execution_fills WHERE execution_id=?1",
        [execution_id],|r|r.get(0))?;
    if exists==0 {return Err(AppError::Validation("unknown execution".into()));}
    let mut stmt=conn.prepare(
        "SELECT correction_id,revision,field_code,previous_is_null,previous_number,
           replacement_is_null,replacement_number,reason,recorded_at_utc,actor,expected_prior_correction_id
         FROM fill_correction_events WHERE execution_id=?1 ORDER BY recorded_at_utc, rowid")?;
    let rows=stmt.query_map([execution_id],|r|{
        let old_null:i64=r.get(3)?;let new_null:i64=r.get(5)?;
        Ok(CorrectionHistoryEvent{
            execution_id:execution_id.to_owned(),
            correction_id:r.get(0)?,revision:r.get(1)?,field:r.get(2)?,
            previous:if old_null==1{None}else{r.get(4)?},
            replacement:if new_null==1{None}else{r.get(6)?},
            reason:r.get(7)?,recorded_at_utc:r.get(8)?,actor:r.get(9)?,
            expected_prior_correction_id:r.get(10)?,
        })
    })?;
    // Independently validate each field's linked revisions before surfacing
    // historical audit data; do not accept a broken/edited event chain.
    let entries=rows.collect::<Result<Vec<_>,_>>()?;
    let row:(f64,f64,Option<f64>,Option<f64>)=conn.query_row(
        "SELECT price,quantity,commission,fees FROM execution_fills WHERE execution_id=?1",
        [execution_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?)))?;
    for (field,initial) in [(FillField::Price,Some(row.0)),(FillField::Quantity,Some(row.1)),
        (FillField::Commission,row.2),(FillField::Fees,row.3)] {
        effective_scalar(conn,execution_id,field,initial)?;
    }
    Ok(entries)
}

/// All persisted correction events for a single Trade in original Fill order.
/// A corrupted/tampered audit chain aborts the export instead of silently
/// omitting corrections or representing effective values as original.
pub fn list_trade_correction_history(
 conn:&Connection,trade_id:&str
)->Result<Vec<CorrectionHistoryEvent>,AppError>{
    let exists:i64=conn.query_row("SELECT count(*) FROM trades WHERE trade_id=?1",
        [trade_id],|r|r.get(0))?;
    if exists!=1 {return Err(AppError::Validation("unknown trade for audit".into()));}
    let mut stmt=conn.prepare("SELECT execution_id FROM execution_fills
        WHERE trade_id=?1 ORDER BY COALESCE(occurred_at,''),rowid")?;
    let ids=stmt.query_map([trade_id],|r|r.get::<_,String>(0))?
        .collect::<Result<Vec<_>,_>>()?;
    let mut out=Vec::new();
    for id in ids {out.extend(list_fill_correction_history(conn,&id)?);}
    Ok(out)
}

/// Full read-only audit verification for backup and staged restore gates.
/// A database integrity_check alone does not validate a correction's semantic
/// old/new revision chain, so each affected execution must be independently
/// reconciled to its immutable original values before packaging/restoring.
pub fn verify_all_correction_chains(conn:&Connection)->Result<usize,AppError>{
    let mut stmt=conn.prepare(
      "SELECT DISTINCT execution_id FROM fill_correction_events ORDER BY execution_id")?;
    let ids=stmt.query_map([],|r|r.get::<_,String>(0))?
        .collect::<Result<Vec<_>,_>>()?;
    for id in &ids { list_fill_correction_history(conn,id)?; }
    Ok(ids.len())
}

#[derive(Debug, Clone, Serialize)]
pub struct CorrectionImpact {
    pub gross_realized_pnl:Option<f64>,
    pub net_realized_pnl:Option<f64>,
    pub realized_r:Option<f64>,
    pub open_quantity:f64,
    pub unknown_cost_fields:usize,
}
#[derive(Debug, Clone, Serialize)]
pub struct FillCorrectionPreview {
    pub execution_id:String,
    pub trade_id:String,
    pub field:String,
    pub original:Option<f64>,
    pub current_effective:Option<f64>,
    pub proposed_effective:Option<f64>,
    pub expected_revision:i64,
    pub reason:String,
    pub before:CorrectionImpact,
    pub after:CorrectionImpact,
    pub explicit_confirmation_required:bool,
}

fn impact(
 fills:&[CorrectedFill],direction:&str,point_value:f64,initial_risk:Option<f64>
)->Result<CorrectionImpact,AppError>{
    let unknown=fills.iter().map(|f|usize::from(f.commission.is_none())+
        usize::from(f.fees.is_none())).sum();
    let input=fills.iter().map(|f|(
        f.action.clone(),f.price,f.quantity,f.commission.unwrap_or(0.0),f.fees.unwrap_or(0.0)
    )).collect::<Vec<_>>();
    let ledger=crate::repository::execution_ledger(&input,direction,point_value)?;
    let gross=ledger.gross_realized;
    let net=if unknown==0{gross.map(|g|g-ledger.costs)}else{None};
    let r=match(net,initial_risk){(Some(value),Some(risk)) if risk>0.0=>
        Some(value/risk),_=>None};
    Ok(CorrectionImpact{gross_realized_pnl:gross,net_realized_pnl:net,
        realized_r:r,open_quantity:ledger.open_qty,unknown_cost_fields:unknown})
}
struct ValidatedCorrection {
    trade_id:String,
    original:Option<f64>,
    previous:Option<f64>,
    revision:i64,
    previous_id:Option<String>,
    before:CorrectionImpact,
    after:CorrectionImpact,
}
fn validate_correction(
 conn:&Connection,req:&FillCorrectionRequest
)->Result<ValidatedCorrection,AppError>{
    if req.reason.trim().is_empty() || req.reason.trim().len()>500 {
        return Err(AppError::Validation("a meaningful correction reason (max 500 chars) is mandatory".into()));
    }
    let (trade_id,old,tick,point_value,direction,status,action):
        (String,Option<f64>,f64,f64,String,String,String)=conn.query_row(
       "SELECT f.trade_id,
               CASE ?2 WHEN 'price' THEN f.price WHEN 'quantity' THEN f.quantity
                     WHEN 'commission' THEN f.commission ELSE f.fees END,
               COALESCE(s.instrument_tick_size_snapshot,i.tick_size),
               COALESCE(s.instrument_point_value_snapshot,i.point_value),
               t.direction,t.status,f.action
        FROM execution_fills f JOIN trades t ON t.trade_id=f.trade_id
        JOIN sessions s ON s.session_id=t.session_id
        JOIN instruments i ON i.instrument_id=s.instrument_id
        WHERE f.execution_id=?1",
       params![req.execution_id,req.field.code()],
       |r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,
           r.get(4)?,r.get(5)?,r.get(6)?)))?;
    if status!="CLOSED" {
        return Err(AppError::Validation("historical correction of still-open trades is not enabled".into()));
    }
    let complete:i64=conn.query_row(
      "SELECT COUNT(*) FROM trade_reviews WHERE trade_id=?1 AND status='COMPLETED'",
      [&trade_id],|r|r.get(0))?;
    if complete>0 {
        return Err(AppError::Validation("completed trade review is locked: correction policy not yet approved".into()));
    }
    validate_value(req.field,req.replacement,tick)?;
    let (prior,revision,previous_id)=effective_scalar(conn,&req.execution_id,req.field,old)?;
    if prior!=req.expected_effective {
        return Err(AppError::Validation("stale correction: reopen the recorded effective value".into()));
    }
    if prior==req.replacement {
        return Err(AppError::Validation("no recorded change: correction is unnecessary".into()));
    }
    if action=="ENTRY" && matches!(req.field,FillField::Price|FillField::Quantity) {
        return Err(AppError::Validation("entry price/quantity needs an explicitly linked initial-risk correction; not yet enabled".into()));
    }
    let existing=read_effective_fills(conn,&trade_id)?;
    let (open,_entry)=validate_trade_ledger(&existing,tick)?;
    if open>1e-9 {
        return Err(AppError::Validation("persisted CLOSED trade does not have a flat position".into()));
    }
    let initial_risk:Option<f64>=conn.query_row(
        "SELECT risk_dollars FROM risk_snapshots WHERE trade_id=?1 AND snapshot_type='INITIAL'
          ORDER BY occurred_at,rowid LIMIT 1",
        [&trade_id],|r|r.get(0)).optional()?;
    let before=impact(&existing,&direction,point_value,initial_risk)?;
    let mut proposed=existing;
    let target=proposed.iter_mut().find(|f|f.execution_id==req.execution_id)
        .ok_or_else(||AppError::Validation("target execution does not belong to trade".into()))?;
    set_field(target,req.field,req.replacement)?;
    let (new_open,_)=validate_trade_ledger(&proposed,tick)?;
    if new_open>1e-9 {
        return Err(AppError::Validation("corrected position disagrees with stored CLOSED status".into()));
    }
    let after=impact(&proposed,&direction,point_value,initial_risk)?;
    Ok(ValidatedCorrection{trade_id,original:old,previous:prior,revision,
        previous_id,before,after})
}

/// Preview uses the same pure fail-closed validation as transactional append.
/// Does not insert any rows, change a trade, or update the audit ledger.
pub fn preview_fill_correction(
 conn:&Connection,req:&FillCorrectionRequest
)->Result<FillCorrectionPreview,AppError>{
    let candidate=validate_correction(conn,req)?;
    Ok(FillCorrectionPreview{
        execution_id:req.execution_id.clone(),trade_id:candidate.trade_id,
        field:req.field.code().into(),original:candidate.original,
        current_effective:candidate.previous,proposed_effective:req.replacement,
        expected_revision:candidate.revision,reason:req.reason.clone(),
        before:candidate.before,after:candidate.after,
        explicit_confirmation_required:true,
    })
}

/// Not exposed as a Tauri command until audit UI, exports and backup gates pass.
pub fn record_fill_correction(
 conn:&mut Connection, request:FillCorrectionRequest
)->Result<FillCorrectionReceipt,AppError>{
    let tx=conn.transaction()?;
    let checked=validate_correction(&tx,&request)?;
    let id=Uuid::new_v4().to_string();let at=Utc::now().to_rfc3339();
    tx.execute(
      "INSERT INTO fill_correction_events(
        correction_id,execution_id,revision,field_code,recorded_at_utc,actor,reason,
        previous_is_null,previous_number,replacement_is_null,replacement_number,expected_prior_correction_id)
       VALUES (?1,?2,?3,?4,?5,'USER',?6,?7,?8,?9,?10,?11)",
      params![id,request.execution_id,checked.revision+1,request.field.code(),at,request.reason,
        i64::from(checked.previous.is_none()),checked.previous,
        i64::from(request.replacement.is_none()),request.replacement,checked.previous_id]
    )?;
    tx.commit()?;
    Ok(FillCorrectionReceipt{correction_id:id,execution_id:request.execution_id,
      field:request.field.code().into(),revision:checked.revision+1,
      previous:checked.previous,replacement:request.replacement,recorded_at_utc:at})
}

#[cfg(test)]
mod tests{
    use crate::{backup,restore,paths::AppPaths};

    #[test]
    fn isolated_v10_backup_roundtrip_keeps_original_fill_and_complete_audit_chain(){
        let root=std::env::temp_dir().join(format!("ptj-audit-backup-{}",Uuid::new_v4()));
        let paths=AppPaths{
            data:root.join("data"),attachments:root.join("attachments"),
            backups:root.join("backups"),exports:root.join("exports"),
            logs:root.join("logs"),root:root.clone(),
        };
        for dir in [&paths.root,&paths.data,&paths.attachments,&paths.backups,&paths.exports,&paths.logs] {
            std::fs::create_dir_all(dir).unwrap();
        }
        let mut conn=db::open_database(&paths.database()).unwrap();
        conn.execute_batch("
          INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','Synthetic','2026-11-15');
          INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value) VALUES('i','w','GC',0.10,100);
          INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at)
            VALUES('s','w','i','2026-11-15','DEMO','now','ACTIVE','now','now');
          INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type,intended_direction)
            VALUES('d','s','now','TRADE','SHORT');
          INSERT INTO trades(trade_id,decision_id,session_id,direction,status)
            VALUES('t','d','s','SHORT','CLOSED');
          INSERT INTO execution_fills(execution_id,trade_id,action,side,price,quantity,commission,fees)
            VALUES('entry','t','ENTRY','SELL',2350,1,1,1),
                  ('exit','t','EXIT','BUY',2348,1,1,1);
        ").unwrap();
        let input=FillCorrectionRequest{
            execution_id:"exit".into(),field:FillField::Price,
            expected_effective:Some(2348.0),replacement:Some(2347.9),
            reason:"GC synthetic historical fill correction".into(),
        };
        record_fill_correction(&mut conn,input).unwrap();
        assert_eq!(verify_all_correction_chains(&conn).unwrap(),1);
        drop(conn);
        let archive=backup::create_backup(&paths).unwrap();
        let info=restore::validate_backup(&archive).unwrap();
        assert_eq!(info.schema_version,db::CURRENT_SCHEMA_VERSION);
        let staged=restore::restore_to_staging(&paths,&archive).unwrap();
        let restored=rusqlite::Connection::open(staged.join("database.sqlite")).unwrap();
        assert_eq!(db::schema_version(&restored).unwrap(),12);
        assert_eq!(verify_all_correction_chains(&restored).unwrap(),1);
        let original:f64=restored.query_row("SELECT price FROM execution_fills WHERE execution_id='exit'",
            [],|r|r.get(0)).unwrap();
        assert_eq!(original,2348.0);
        let corrected=crate::repository::get_trade_detail(&restored,"t").unwrap();
        assert_eq!(corrected.fills[1].price,2347.9);
        assert!((corrected.metrics.net_realized_pnl.unwrap()-206.0).abs()<1e-7);
        drop(restored);
        // A semantically corrupted append-only revision must block a new
        // backup even if SQLite integrity and foreign keys still pass.
        let conn=db::open_database(&paths.database()).unwrap();
        conn.execute("INSERT INTO fill_correction_events
          (correction_id,execution_id,revision,field_code,recorded_at_utc,actor,reason,
           previous_is_null,previous_number,replacement_is_null,replacement_number,expected_prior_correction_id)
           VALUES ('forged','exit',2,'price','now','USER','Invalid chain',0,2348,0,2347.8,NULL)",[]).unwrap();
        assert_eq!(db::integrity_check(&conn).unwrap(),"ok");
        assert!(verify_all_correction_chains(&conn).is_err());
        drop(conn);
        assert!(backup::create_backup(&paths).is_err());
        assert!(restore::validate_backup(&archive).is_ok(),"Existing verified ZIP must remain untouched");
        std::fs::remove_dir_all(&root).unwrap();
    }

    use super::*;
    use crate::db;
    #[test]
    fn migration_and_correction_are_append_only_owner_safe_and_atomic(){
        let mut db=Connection::open_in_memory().unwrap();
        db.execute_batch("PRAGMA foreign_keys=ON").unwrap();
        db::migrate(&db).unwrap();
        assert_eq!(db::schema_version(&db).unwrap(),12);
        db::migrate(&db).unwrap();
        assert_eq!(db::schema_version(&db).unwrap(),12);
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
        let predicted=preview_fill_correction(&db,&make(Some(5004.0),Some(5005.0))).unwrap();
        assert_eq!(predicted.original,Some(5004.0));
        assert_eq!(predicted.before.gross_realized_pnl,Some(600.0));
        assert_eq!(predicted.after.gross_realized_pnl,Some(650.0));
        assert_eq!(predicted.after.net_realized_pnl,Some(642.5));
        assert_eq!(predicted.after.realized_r,None);
        assert!(predicted.explicit_confirmation_required);
        let audit_before:i64=db.query_row("SELECT COUNT(*) FROM fill_correction_events",[],|r|r.get(0)).unwrap();
        assert_eq!(audit_before,0,"Preview must never write audit events");
        let first=record_fill_correction(&mut db,make(Some(5004.0),Some(5005.0))).unwrap();
        assert_eq!(first.revision,1);
        assert!(record_fill_correction(&mut db,make(Some(5004.0),Some(5006.0))).is_err());
        let second=record_fill_correction(&mut db,make(Some(5005.0),Some(5004.25))).unwrap();
        assert_eq!(second.revision,2);
        let history=list_fill_correction_history(&db,"e2").unwrap();
        assert_eq!(history.len(),2);
        assert_eq!(history[0].previous,Some(5004.0));
        assert_eq!(history[1].previous,Some(5005.0));
        assert_eq!(history[1].expected_prior_correction_id,Some(first.correction_id.clone()));
        assert!(list_fill_correction_history(&db,"not-owned").is_err());
        assert!(preview_fill_correction(&db,&make(Some(5004.0),Some(5006.0))).is_err());
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
        // Every consumer of the repository TradeDetail must see the current
        // effective price, not the immutable original recorded price.
        let detail=crate::repository::get_trade_detail(&db,"t").unwrap();
        assert_eq!(detail.fills[1].price,5004.25);
        assert_eq!(detail.metrics.gross_realized_pnl,Some(612.5));
        assert_eq!(detail.metrics.net_realized_pnl,Some(605.0));
        // Unknown charges are not zero and must suppress Net/R.
        record_fill_correction(&mut db,FillCorrectionRequest{
            execution_id:"e2".into(),field:FillField::Fees,
            expected_effective:Some(0.5),replacement:None,
            reason:"Invoice does not substantiate original fee".into(),
        }).unwrap();
        let uncertain=crate::repository::get_trade_detail(&db,"t").unwrap();
        assert_eq!(uncertain.metrics.gross_realized_pnl,Some(612.5));
        assert_eq!(uncertain.metrics.net_realized_pnl,None);
        assert_eq!(uncertain.metrics.realized_r,None);
        record_fill_correction(&mut db,FillCorrectionRequest{
            execution_id:"e2".into(),field:FillField::Fees,
            expected_effective:None,replacement:Some(0.5),
            reason:"Confirmed precise amount against execution statement".into(),
        }).unwrap();
        assert_eq!(crate::repository::get_trade_detail(&db,"t").unwrap().metrics.net_realized_pnl,Some(605.0));
        // Package C #9: the existing analytics aggregation consumes
        // trade_metrics, so corrected net flows through with honest R count.
        let analytics=crate::repository::get_analytics_summary(&db,
            crate::repository::JournalFilterInput{
                date_from:None,date_to:None,instrument_symbol:None,direction:None,
                decision_quality:None,rule_status:None,level_source_type_id:None,
                evidence_type_id:None,evidence_timing:None,
            }).unwrap();
        assert_eq!(analytics.trade_count,1);
        assert_eq!(analytics.net_pnl,Some(605.0));
        assert_eq!(analytics.eligible_r_count,0);
        assert_eq!(analytics.net_r,None);
        assert!(analytics.small_sample);
        // Export the effective numeric results AND immutable original/new audit
        // records; a trading report must not hide how a value was corrected.
        let root=std::env::temp_dir().join(format!("ptj-package-c-export-{}",Uuid::new_v4()));
        let paths=crate::paths::AppPaths{
            data:root.join("data"),attachments:root.join("attachments"),
            backups:root.join("backups"),exports:root.join("exports"),
            logs:root.join("logs"),root:root.clone(),
        };
        let mk_filter=||crate::repository::JournalFilterInput{
            date_from:None,date_to:None,instrument_symbol:None,direction:None,
            decision_quality:None,rule_status:None,level_source_type_id:None,
            evidence_type_id:None,evidence_timing:None,
        };
        let csv=crate::exports::export_csv(&db,&paths,mk_filter()).unwrap();
        let csv_text=std::fs::read_to_string(&csv.path).unwrap();
        assert!(csv_text.contains("net_pnl_effective"));
        assert!(csv_text.contains("605"));
        assert!(csv_text.contains("Transcription error from manual NinjaTrader record"));
        assert!(csv_text.contains(&first.correction_id));
        let html=crate::exports::export_html(&db,&paths,mk_filter()).unwrap();
        let html_text=std::fs::read_to_string(&html.path).unwrap();
        assert!(html_text.contains("Audited corrections"));
        assert!(html_text.contains("605.00"));
        assert!(html_text.contains("5004.25"));
        assert!(html_text.contains(&second.correction_id));
        std::fs::remove_dir_all(&root).unwrap();
        assert_eq!(db::integrity_check(&db).unwrap(),"ok");
        assert_eq!(db::foreign_key_violation_count(&db).unwrap(),0);
    }
}
