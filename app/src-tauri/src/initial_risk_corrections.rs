//! An initial-risk *recording error* correction is not a Stop Move.
 //! The original risk_snapshots event is immutable. This overlay is used only
 //! for the original INITIAL risk denominator; all revisions are auditable.
use chrono::Utc;
use rusqlite::{params,Connection,OptionalExtension};
use serde::{Deserialize,Serialize};
use uuid::Uuid;
use crate::{error::AppError,repository};

#[derive(Debug,Clone,Deserialize)]
pub struct InitialRiskCorrectionRequest{
    pub risk_snapshot_id:String,
    pub expected_effective:Option<f64>,
    pub expected_revision:i64,
    pub replacement:f64,
    pub reason:String,
}
#[derive(Debug,Clone,Serialize)]
pub struct InitialRiskCorrectionEvent{
    pub correction_id:String,
    pub risk_snapshot_id:String,
    pub revision:i64,
    pub original_risk_dollars:Option<f64>,
    pub previous_risk_dollars:Option<f64>,
    pub replacement_risk_dollars:f64,
    pub expected_prior_correction_id:Option<String>,
    pub reason:String,
    pub recorded_at_utc:String,
    pub actor:String,
}
#[derive(Debug,Clone,Serialize)]
pub struct InitialRiskCorrectionPreview{
    pub risk_snapshot_id:String,
    pub trade_id:String,
    pub original:Option<f64>,
    pub current_effective:Option<f64>,
    pub replacement:f64,
    pub expected_revision:i64,
    pub before_net_r:Option<f64>,
    pub after_net_r:Option<f64>,
    pub net_realized_pnl:Option<f64>,
    pub gross_realized_pnl:Option<f64>,
    pub reason:String,
    pub explicit_confirmation_required:bool,
}
fn same(a:Option<f64>,b:Option<f64>)->bool{
    match(a,b){(None,None)=>true,(Some(x),Some(y))=>x==y,_=>false}
}
fn table_exists(conn:&Connection)->Result<bool,AppError>{
    Ok(conn.query_row(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='initial_risk_correction_events'",
        [],|r|r.get::<_,i64>(0)).optional()?.is_some())
}
pub fn effective_initial_risk(
 conn:&Connection,risk_snapshot_id:&str,original:Option<f64>
)->Result<(Option<f64>,i64,Option<String>),AppError>{
    // Only compatibility with pre-v13 synthetic fixtures or old source
    // databases; the real Tauri writable DB requires current schema.
    if !table_exists(conn)?{return Ok((original,0,None));}
    let mut stmt=conn.prepare(
      "SELECT correction_id,revision,original_risk_dollars,
        previous_risk_dollars,previous_was_null,replacement_risk_dollars,
        expected_prior_correction_id
       FROM initial_risk_correction_events
       WHERE risk_snapshot_id=?1 ORDER BY revision")?;
    let events=stmt.query_map([risk_snapshot_id],|r|Ok((
        r.get::<_,String>(0)?,r.get::<_,i64>(1)?,
        r.get::<_,Option<f64>>(2)?,r.get::<_,Option<f64>>(3)?,
        r.get::<_,i64>(4)?,r.get::<_,f64>(5)?,r.get::<_,Option<String>>(6)?
    )))?;
    let mut current=original;let mut revision=0;let mut prior:Option<String>=None;
    for event in events{
        let (id,next,original_at_record,previous,previous_was_null,replacement,expected_prior)=event?;
        let effective_previous=if previous_was_null==1{None}else{previous};
        if next!=revision+1||!same(original,original_at_record)||
           !same(current,effective_previous)||prior!=expected_prior||
           !replacement.is_finite()||replacement<=0.0{
           return Err(AppError::Validation("tampered/ambiguous historical initial-risk correction chain".into()));
        }
        current=Some(replacement);revision=next;prior=Some(id);
    }
    Ok((current,revision,prior))
}
pub fn list_initial_risk_corrections(conn:&Connection,trade_id:&str)
 ->Result<Vec<InitialRiskCorrectionEvent>,AppError>{
    let mut stmt=conn.prepare(
        "SELECT ce.correction_id,ce.risk_snapshot_id,ce.revision,ce.original_risk_dollars,
                ce.previous_risk_dollars,ce.previous_was_null,ce.replacement_risk_dollars,
                ce.expected_prior_correction_id,ce.reason,ce.recorded_at_utc,ce.actor
         FROM initial_risk_correction_events ce
         JOIN risk_snapshots rs ON rs.risk_snapshot_id=ce.risk_snapshot_id
         WHERE rs.trade_id=?1 AND rs.snapshot_type='INITIAL'
         ORDER BY ce.recorded_at_utc,ce.revision")?;
    let rows=stmt.query_map([trade_id],|r|Ok(InitialRiskCorrectionEvent{
        correction_id:r.get(0)?,risk_snapshot_id:r.get(1)?,revision:r.get(2)?,
        original_risk_dollars:r.get(3)?,
        previous_risk_dollars:if r.get::<_,i64>(5)?==1{None}else{r.get(4)?},
        replacement_risk_dollars:r.get(6)?,
        expected_prior_correction_id:r.get(7)?,reason:r.get(8)?,
        recorded_at_utc:r.get(9)?,actor:r.get(10)?
    }))?;
    Ok(rows.collect::<Result<Vec<_>,_>>()?)
}
fn owner(conn:&Connection,id:&str)->Result<(String,String,Option<f64>),AppError>{
    let data:Option<(String,String,Option<f64>)>=conn.query_row(
      "SELECT rs.trade_id,t.status,rs.risk_dollars FROM risk_snapshots rs
       JOIN trades t ON t.trade_id=rs.trade_id
       WHERE rs.risk_snapshot_id=?1 AND rs.snapshot_type='INITIAL'
       AND rs.risk_snapshot_id=(
         SELECT risk_snapshot_id FROM risk_snapshots
         WHERE trade_id=rs.trade_id AND snapshot_type='INITIAL'
         ORDER BY occurred_at,rowid LIMIT 1)",
      [id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).optional()?;
    data.ok_or_else(||AppError::Validation("not the original INITIAL risk snapshot for a trade".into()))
}
pub fn preview(conn:&Connection,input:&InitialRiskCorrectionRequest)
 ->Result<InitialRiskCorrectionPreview,AppError>{
    if input.reason.trim().chars().count()<5||input.reason.trim().chars().count()>500{
        return Err(AppError::Validation("initial-risk correction needs a 5–500 character factual reason".into()));
    }
    if !input.replacement.is_finite()||input.replacement<=0.0 {
        return Err(AppError::Validation("initial risk must be finite and > 0 dollars".into()));
    }
    let (trade_id,status,original)=owner(conn,&input.risk_snapshot_id)?;
    if status!="CLOSED"{
       return Err(AppError::Validation("historical initial-risk corrections require a CLOSED trade".into()));
    }
    let (current,revision,_)=effective_initial_risk(conn,&input.risk_snapshot_id,original)?;
    if !same(current,input.expected_effective)||revision!=input.expected_revision{
        return Err(AppError::Validation("risk history changed; reload effective value and preflight".into()));
    }
    if same(current,Some(input.replacement)){
        return Err(AppError::Validation("replacement equals current effective initial risk".into()));
    }
    let metrics=repository::get_trade_detail(conn,&trade_id)?.metrics;
    let after_net_r=metrics.net_realized_pnl.map(|net|net/input.replacement);
    Ok(InitialRiskCorrectionPreview{
        risk_snapshot_id:input.risk_snapshot_id.clone(),trade_id,
        original,current_effective:current,replacement:input.replacement,
        expected_revision:revision,before_net_r:metrics.realized_r,
        after_net_r,net_realized_pnl:metrics.net_realized_pnl,
        gross_realized_pnl:metrics.gross_realized_pnl,
        reason:input.reason.trim().to_string(),explicit_confirmation_required:true
    })
}
pub fn record(conn:&mut Connection,input:InitialRiskCorrectionRequest)
 ->Result<InitialRiskCorrectionEvent,AppError>{
    let tx=conn.transaction()?;
    let pre=preview(&tx,&input)?;
    let (_current,_rev,prior)=effective_initial_risk(&tx,&input.risk_snapshot_id,pre.original)?;
    let correction_id=Uuid::new_v4().to_string();
    let now=Utc::now().to_rfc3339();
    tx.execute(
       "INSERT INTO initial_risk_correction_events(
          correction_id,risk_snapshot_id,revision,original_risk_dollars,
          previous_risk_dollars,previous_was_null,replacement_risk_dollars,
          expected_prior_correction_id,reason,recorded_at_utc,actor)
        VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,'LOCAL_USER')",
       params![correction_id,input.risk_snapshot_id,pre.expected_revision+1,pre.original,
              pre.current_effective,i64::from(pre.current_effective.is_none()),
              pre.replacement,prior,pre.reason,now])?;
    let (effective,rev,_)=effective_initial_risk(&tx,&input.risk_snapshot_id,pre.original)?;
    if !same(effective,Some(pre.replacement))||rev!=pre.expected_revision+1{
        return Err(AppError::Validation("corrected initial risk could not be independently resolved".into()));
    }
    tx.commit()?;
    Ok(InitialRiskCorrectionEvent{
        correction_id,risk_snapshot_id:pre.risk_snapshot_id,
        revision:rev,original_risk_dollars:pre.original,
        previous_risk_dollars:pre.current_effective,replacement_risk_dollars:pre.replacement,
        expected_prior_correction_id:prior,reason:pre.reason,recorded_at_utc:now,actor:"LOCAL_USER".into()
    })
}
pub fn verify_all_initial_risk_correction_chains(conn:&Connection)->Result<i64,AppError>{
    if !table_exists(conn)?{return Ok(0);}
    let mut stmt=conn.prepare(
      "SELECT DISTINCT ce.risk_snapshot_id,rs.risk_dollars,rs.snapshot_type
       FROM initial_risk_correction_events ce
       LEFT JOIN risk_snapshots rs ON rs.risk_snapshot_id=ce.risk_snapshot_id")?;
    let rows=stmt.query_map([],|r|Ok((
        r.get::<_,String>(0)?,r.get::<_,Option<f64>>(1)?,r.get::<_,Option<String>>(2)?
    )))?;
    let mut total=0;
    for row in rows{
        let (id,original,kind)=row?;
        if kind.as_deref()!=Some("INITIAL"){
           return Err(AppError::Validation("initial risk audit references a noninitial risk snapshot".into()));
        }
        let (_,rev,_)=effective_initial_risk(conn,&id,original)?;
        total+=rev;
    }
    Ok(total)
}

#[cfg(test)]
mod tests{
    use super::*;
    use crate::db;
    #[test]
    fn correct_initial_risk_with_audit_preview_and_unknown_net_r(){
        let mut c=Connection::open_in_memory().unwrap();
        c.execute_batch("PRAGMA foreign_keys=ON").unwrap();db::migrate(&c).unwrap();
        c.execute_batch(
          "INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','Test','2026-11-22');
           INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value)
             VALUES('i','w','ES',0.25,50);
           INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at)
             VALUES('s','w','i','2026-11-22','DEMO','2026-11-22','CLOSED','2026-11-22','2026-11-22');
           INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type,intended_direction)
             VALUES('d','s','2026-11-22T08:00:00Z','TRADE','LONG');
           INSERT INTO trades(trade_id,decision_id,session_id,direction,status)
             VALUES('t','d','s','LONG','CLOSED');
           INSERT INTO execution_fills(execution_id,trade_id,occurred_at,action,side,price,quantity,commission,fees)
             VALUES('f1','t','2026-11-22T08:01:00Z','ENTRY','BUY',5000,1,2,0),
                   ('f2','t','2026-11-22T08:02:00Z','EXIT','SELL',5002,1,2,0);
           INSERT INTO risk_snapshots(risk_snapshot_id,trade_id,occurred_at,snapshot_type,stop_price,quantity,risk_dollars)
             VALUES('risk1','t','2026-11-22T08:01:00Z','INITIAL',4998,1,100);"
        ).unwrap();
        let req=InitialRiskCorrectionRequest{
            risk_snapshot_id:"risk1".into(),expected_effective:Some(100.0),
            expected_revision:0,replacement:200.0,reason:"Risk entry was double size".into()
        };
        let p=preview(&c,&req).unwrap();
        assert!((p.before_net_r.unwrap()-0.96).abs()<1e-9);
        assert!((p.after_net_r.unwrap()-0.48).abs()<1e-9);
        let receipt=record(&mut c,req.clone()).unwrap();
        assert_eq!(receipt.revision,1);
        assert!(record(&mut c,req).is_err(),"duplicate stale correction not allowed");
        assert_eq!(verify_all_initial_risk_correction_chains(&c).unwrap(),1);
        let original:f64=c.query_row(
           "SELECT risk_dollars FROM risk_snapshots WHERE risk_snapshot_id='risk1'",[],|r|r.get(0)).unwrap();
        assert_eq!(original,100.0);
        let effective=repository::get_trade_detail(&c,"t").unwrap();
        assert_eq!(effective.metrics.initial_risk_dollars,Some(200.0));
        assert!((effective.metrics.realized_r.unwrap()-0.48).abs()<1e-9);
        assert_eq!(effective.risk_snapshots[0].risk_dollars,Some(200.0));
        assert!(c.execute("UPDATE initial_risk_correction_events SET replacement_risk_dollars=900",[]).is_err());
        assert!(c.execute("DELETE FROM initial_risk_correction_events",[]).is_err());
        assert_eq!(db::integrity_check(&c).unwrap(),"ok");
        assert_eq!(db::foreign_key_violation_count(&c).unwrap(),0);
        let root=std::env::temp_dir().join(format!("ptj-risk-export-{}",Uuid::new_v4()));
        let paths=crate::paths::AppPaths{
          data:root.join("data"),attachments:root.join("attachments"),
          backups:root.join("backups"),exports:root.join("exports"),logs:root.join("logs"),
          root:root.clone()
        };
        let csv=crate::exports::export_csv(&c,&paths,crate::repository::JournalFilterInput::default()).unwrap();
        let html=crate::exports::export_html(&c,&paths,crate::repository::JournalFilterInput::default()).unwrap();
        let csv_text=std::fs::read_to_string(csv.path).unwrap();
        let html_text=std::fs::read_to_string(html.path).unwrap();
        assert!(csv_text.contains("audited_initial_risk_correction_count"));
        assert!(csv_text.contains("Risk entry was double size"));
        assert!(html_text.contains("Audited INITIAL risk-dollar corrections"));
        assert!(html_text.contains("Risk entry was double size"));
        std::fs::remove_dir_all(root).unwrap();
    }
}
