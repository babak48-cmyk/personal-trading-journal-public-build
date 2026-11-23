//! Audited correction of mistakenly entered source_price only.
//! Never mutates the Zone geometry, candidate source, decision or a genuine revision.
use chrono::Utc;
use rusqlite::{params,Connection,OptionalExtension};
use serde::{Deserialize,Serialize};
use uuid::Uuid;
use crate::error::AppError;

#[derive(Debug,Clone,Deserialize)]
pub struct SourcePriceCorrectionRequest{
 pub candidate_source_id:String,
 pub expected_effective_price:Option<f64>,
 pub expected_revision:i64,
 pub replacement_price:f64,
 pub reason:String,
}
#[derive(Debug,Clone,Serialize)]
pub struct SourcePriceCorrectionEvent{
 pub correction_id:String,
 pub candidate_source_id:String,
 pub revision:i64,
 pub original_source_price:Option<f64>,
 pub previous_source_price:Option<f64>,
 pub replacement_source_price:f64,
 pub expected_prior_correction_id:Option<String>,
 pub reason:String,
 pub recorded_at_utc:String,
 pub actor:String,
}
#[derive(Debug,Clone,Serialize)]
pub struct SourcePriceCorrectionPreview{
 pub candidate_source_id:String,
 pub candidate_revision_id:String,
 pub original_source_price:Option<f64>,
 pub current_effective_price:Option<f64>,
 pub replacement_price:f64,
 pub expected_revision:i64,
 pub related_decision_count:i64,
 pub related_trade_count:i64,
 pub reason:String,
 pub monetary_result_unchanged:bool,
 pub zone_geometry_unchanged:bool,
 pub explicit_confirmation_required:bool,
}
fn exists(conn:&Connection)->Result<bool,AppError>{
 Ok(conn.query_row("SELECT 1 FROM sqlite_master WHERE type='table' AND name='candidate_source_price_correction_events'",
 [],|r|r.get::<_,i64>(0)).optional()?.is_some())
}
fn same(a:Option<f64>,b:Option<f64>)->bool{
 match(a,b){(None,None)=>true,(Some(a),Some(b))=>a==b,_=>false}
}
fn identity(conn:&Connection,id:&str)->Result<(String,Option<f64>,f64),AppError>{
 conn.query_row(
 "SELECT cs.candidate_revision_id,cs.source_price,i.tick_size
  FROM candidate_sources cs
  JOIN candidates c ON c.candidate_id=cs.candidate_id
  JOIN instruments i ON i.instrument_id=c.instrument_id
  WHERE cs.candidate_source_id=?1 AND cs.candidate_revision_id IS NOT NULL
    AND EXISTS(SELECT 1 FROM candidate_revisions cr
      WHERE cr.candidate_revision_id=cs.candidate_revision_id AND cr.candidate_id=cs.candidate_id)",
 [id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?)))
 .optional()?.ok_or_else(||AppError::Validation(
   "source price correction requires a verified original Zone/source revision identity".into()))
}
pub fn effective_price(conn:&Connection,id:&str,original:Option<f64>)
 ->Result<(Option<f64>,i64,Option<String>),AppError>{
 if !exists(conn)?{return Ok((original,0,None));}
 let mut stmt=conn.prepare(
  "SELECT correction_id,revision,original_source_price,previous_source_price,
          replacement_source_price,expected_prior_correction_id
   FROM candidate_source_price_correction_events
   WHERE candidate_source_id=?1 ORDER BY revision")?;
 let rows=stmt.query_map([id],|r|Ok((
   r.get::<_,String>(0)?,r.get::<_,i64>(1)?,r.get::<_,Option<f64>>(2)?,
   r.get::<_,Option<f64>>(3)?,r.get::<_,f64>(4)?,r.get::<_,Option<String>>(5)?
 )))?;
 let mut effective=original;let mut revision=0;let mut previous_id=None;
 for item in rows{
  let (event_id,n,first,prev,replacement,linked)=item?;
  if n!=revision+1||!same(first,original)||!same(prev,effective)||
    linked!=previous_id||!replacement.is_finite()||replacement<=0.0||
    same(Some(replacement),effective) {
   return Err(AppError::Validation("source-price correction audit chain failed verification".into()));
  }
  effective=Some(replacement);revision=n;previous_id=Some(event_id);
 }
 Ok((effective,revision,previous_id))
}
pub fn preview(conn:&Connection,input:&SourcePriceCorrectionRequest)
 ->Result<SourcePriceCorrectionPreview,AppError>{
 let reason=input.reason.trim();
 if !(5..=500).contains(&reason.chars().count()){
   return Err(AppError::Validation("historical source price correction requires a factual reason of 5–500 characters".into()));
 }
 if !input.replacement_price.is_finite()||input.replacement_price<=0.0{
   return Err(AppError::Validation("replacement source price must be positive and finite".into()));
 }
 if input.expected_effective_price.is_some_and(|p|!p.is_finite()||p<=0.0){
   return Err(AppError::Validation("expected source price is invalid".into()));
 }
 let (revision_id,original,tick)=identity(conn,&input.candidate_source_id)?;
 if !tick.is_finite()||tick<=0.0{return Err(AppError::Validation("invalid original instrument tick size".into()));}
 let ticks=input.replacement_price/tick;
 if !ticks.is_finite()||(ticks-ticks.round()).abs()>0.000001{
   return Err(AppError::Validation("corrected source price must align with the original instrument tick size".into()));
 }
 let (effective,revision,_)=effective_price(conn,&input.candidate_source_id,original)?;
 if revision!=input.expected_revision||!same(effective,input.expected_effective_price){
   return Err(AppError::Validation("source price changed since preview; independently refresh the historical source".into()));
 }
 if same(effective,Some(input.replacement_price)){
   return Err(AppError::Validation("new source price equals the already-effective value".into()));
 }
 let decision_count:i64=conn.query_row(
   "SELECT COUNT(*) FROM candidate_decisions WHERE based_on_candidate_revision_id=?1",
   [&revision_id],|r|r.get(0))?;
 if decision_count==0{return Err(AppError::Validation(
   "no saved Decision references this historical source; use the normal Zone revision workflow".into()));}
 let trade_count:i64=conn.query_row(
   "SELECT COUNT(*) FROM trades t JOIN candidate_decisions cd ON cd.decision_id=t.decision_id
    WHERE cd.based_on_candidate_revision_id=?1",
   [&revision_id],|r|r.get(0))?;
 Ok(SourcePriceCorrectionPreview{
  candidate_source_id:input.candidate_source_id.clone(),
  candidate_revision_id:revision_id,original_source_price:original,
  current_effective_price:effective,replacement_price:input.replacement_price,
  expected_revision:revision,related_decision_count:decision_count,
  related_trade_count:trade_count,reason:reason.into(),
  monetary_result_unchanged:true,zone_geometry_unchanged:true,
  explicit_confirmation_required:true
 })
}
pub fn record(conn:&mut Connection,input:SourcePriceCorrectionRequest)
 ->Result<SourcePriceCorrectionEvent,AppError>{
 let tx=conn.transaction()?;
 let before=preview(&tx,&input)?;
 let (_price,_rev,prior)=effective_price(&tx,&input.candidate_source_id,before.original_source_price)?;
 let id=Uuid::new_v4().to_string();let now=Utc::now().to_rfc3339();
 tx.execute(
   "INSERT INTO candidate_source_price_correction_events
    (correction_id,candidate_source_id,revision,original_source_price,
     previous_source_price,replacement_source_price,expected_prior_correction_id,
     reason,recorded_at_utc,actor)
    VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,'LOCAL_USER')",
    params![id,input.candidate_source_id,before.expected_revision+1,
      before.original_source_price,before.current_effective_price,
      before.replacement_price,prior,before.reason,now])?;
 let (effective,revision,_)=effective_price(&tx,&input.candidate_source_id,before.original_source_price)?;
 if revision!=before.expected_revision+1||!same(effective,Some(before.replacement_price)){
   return Err(AppError::Validation("source price append could not be independently resolved".into()));
 }
 tx.commit()?;
 Ok(SourcePriceCorrectionEvent{
  correction_id:id,candidate_source_id:input.candidate_source_id,
  revision,original_source_price:before.original_source_price,
  previous_source_price:before.current_effective_price,
  replacement_source_price:before.replacement_price,
  expected_prior_correction_id:prior,reason:before.reason,
  recorded_at_utc:now,actor:"LOCAL_USER".into()
 })
}
pub fn list_for_trade(conn:&Connection,trade_id:&str)->Result<Vec<SourcePriceCorrectionEvent>,AppError>{
 if !exists(conn)?{return Ok(Vec::new());}
 let mut stmt=conn.prepare(
   "SELECT e.correction_id,e.candidate_source_id,e.revision,e.original_source_price,
       e.previous_source_price,e.replacement_source_price,e.expected_prior_correction_id,
       e.reason,e.recorded_at_utc,e.actor
    FROM candidate_source_price_correction_events e
    JOIN candidate_sources cs ON cs.candidate_source_id=e.candidate_source_id
    JOIN candidate_decisions cd ON cd.based_on_candidate_revision_id=cs.candidate_revision_id
    JOIN trades t ON t.decision_id=cd.decision_id
    WHERE t.trade_id=?1 ORDER BY e.candidate_source_id,e.revision")?;
 let events=stmt.query_map([trade_id],|r|Ok(SourcePriceCorrectionEvent{
   correction_id:r.get(0)?,candidate_source_id:r.get(1)?,revision:r.get(2)?,
   original_source_price:r.get(3)?,previous_source_price:r.get(4)?,
   replacement_source_price:r.get(5)?,expected_prior_correction_id:r.get(6)?,
   reason:r.get(7)?,recorded_at_utc:r.get(8)?,actor:r.get(9)?
 }))?.collect::<Result<Vec<_>,_>>()?;
 Ok(events)
}
pub fn verify_all(conn:&Connection)->Result<i64,AppError>{
 if !exists(conn)?{return Ok(0);}
 let mut stmt=conn.prepare("SELECT DISTINCT candidate_source_id FROM candidate_source_price_correction_events")?;
 let ids=stmt.query_map([],|r|r.get::<_,String>(0))?.collect::<Result<Vec<_>,_>>()?;
 let mut total=0;
 for id in ids{
   let (revision,original,tick)=identity(conn,&id)?;
   let (effective,count,_)=effective_price(conn,&id,original)?;
   if !tick.is_finite()||tick<=0.0||effective.is_none(){return Err(AppError::Validation("invalid historical source-price audit parameters".into()));}
   let mut st=conn.prepare("SELECT replacement_source_price FROM candidate_source_price_correction_events WHERE candidate_source_id=?1")?;
   for v in st.query_map([&id],|r|r.get::<_,f64>(0))?{
     let n=v?/tick;if !n.is_finite()||(n-n.round()).abs()>0.000001{return Err(AppError::Validation("source-price audit contains off-tick value".into()));}
   }
   let linked:i64=conn.query_row(
      "SELECT COUNT(*) FROM candidate_decisions WHERE based_on_candidate_revision_id=?1",
      [&revision],|r|r.get(0))?;
   if linked==0{return Err(AppError::Validation("source-price correction lacks historical Decision".into()));}
   total+=count;
 }
 Ok(total)
}
#[cfg(test)]
mod tests{
 use super::*;
 use crate::db;
 fn fixture()->Connection{
  let conn=Connection::open_in_memory().unwrap();
  conn.execute_batch("PRAGMA foreign_keys=ON").unwrap();
  db::migrate(&conn).unwrap();
  conn.execute_batch("
    INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','Synthetic','now');
    INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value)
     VALUES('i','w','ES',0.25,50);
    INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at)
     VALUES('s','w','i','2026-11-23','DEMO','now','CLOSED','now','now');
    INSERT INTO candidates(candidate_id,session_id,instrument_id,identified_when,created_at)
     VALUES('zone','s','i','PRE_SESSION','now');
    INSERT INTO candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,price_mode,
      price_from,price_to,reference_price,change_type)
     VALUES('rev','zone',1,'now','RANGE',7000,7002,7001,'CREATE');
    INSERT INTO level_source_types(source_type_id,workspace_id,code,label,source_group)
     VALUES('type','w','TYPE','Prior High','STRUCTURE');
    INSERT INTO candidate_sources(candidate_source_id,candidate_id,candidate_revision_id,source_type_id,source_price)
     VALUES('src','zone','rev','type',7000);
    INSERT INTO candidate_decisions(decision_id,candidate_id,session_id,occurred_at,decision_type,based_on_candidate_revision_id)
     VALUES('d','zone','s','now','NO_TRADE','rev');
  ").unwrap();
  conn
 }
 fn req(revision:i64,expected:Option<f64>,replacement:f64)->SourcePriceCorrectionRequest{
   SourcePriceCorrectionRequest{candidate_source_id:"src".into(),expected_effective_price:expected,
      expected_revision:revision,replacement_price:replacement,
      reason:"Original level price was transcribed incorrectly".into()}
 }
 #[test]
 fn append_only_history_preserves_zone_and_source_and_blocks_stale_or_off_tick(){
   let mut c=fixture();
   assert_eq!(db::schema_version(&c).unwrap(),15);
   let before=preview(&c,&req(0,Some(7000.0),7000.25)).unwrap();
   assert_eq!(before.related_decision_count,1);
   assert_eq!(before.related_trade_count,0);
   assert!(before.zone_geometry_unchanged);
   assert!(preview(&c,&req(0,Some(7000.0),7000.1)).is_err());
   assert!(preview(&c,&req(0,Some(7000.0),f64::NAN)).is_err());
   assert!(preview(&c,&req(0,Some(7000.0),0.0)).is_err());
   let e=record(&mut c,req(0,Some(7000.0),7000.25)).unwrap();
   assert_eq!(e.revision,1);
   assert!(record(&mut c,req(0,Some(7000.0),7000.25)).is_err());
   assert_eq!(effective_price(&c,"src",Some(7000.0)).unwrap().0,Some(7000.25));
   let (source,low,high,reference):(f64,f64,f64,f64)=c.query_row(
    "SELECT cs.source_price,cr.price_from,cr.price_to,cr.reference_price FROM candidate_sources cs
     JOIN candidate_revisions cr ON cr.candidate_revision_id=cs.candidate_revision_id
     WHERE cs.candidate_source_id='src'",[],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?))).unwrap();
   assert_eq!((source,low,high,reference),(7000.0,7000.0,7002.0,7001.0));
   assert!(c.execute("UPDATE candidate_source_price_correction_events SET reason='tampered'",[]).is_err());
   assert!(c.execute("DELETE FROM candidate_source_price_correction_events",[]).is_err());
   assert_eq!(record(&mut c,req(1,Some(7000.25),7000.5)).unwrap().revision,2);
   assert_eq!(verify_all(&c).unwrap(),2);
   assert_eq!(db::integrity_check(&c).unwrap(),"ok");
   assert_eq!(db::foreign_key_violation_count(&c).unwrap(),0);
 }
 #[test]
 fn reject_missing_revision_or_unsaved_decision(){
   let c=fixture();
   assert!(preview(&c,&SourcePriceCorrectionRequest{candidate_source_id:"absent".into(),..req(0,None,7000.25)}).is_err());
   c.execute_batch("
     INSERT INTO candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,price_mode,change_type)
     VALUES('later','zone',2,'now','RANGE','UPDATE');
     INSERT INTO candidate_sources(candidate_source_id,candidate_id,candidate_revision_id,source_type_id,source_price)
     VALUES('unreferenced','zone','later','type',7005);
   ").unwrap();
   assert!(preview(&c,&SourcePriceCorrectionRequest{candidate_source_id:"unreferenced".into(),expected_effective_price:Some(7005.0),..req(0,None,7005.25)}).is_err());
 }
 #[test]
 fn effective_readout_exports_and_corruption_guard_keep_original_decision_price(){
   use crate::{repository::{self,JournalFilterInput},source_type_corrections};
   let mut c=fixture();
   // The immutable Decision is created as NO_TRADE in the fixture.
   // Create a second standalone recorded trade Decision on the same saved
   // historical revision; no original decision or Zone is rewritten.
   c.execute_batch("
     INSERT INTO candidate_decisions(decision_id,candidate_id,session_id,occurred_at,decision_type,based_on_candidate_revision_id)
       VALUES('dtrade','zone','s','2026-11-23T10:00:00Z','TRADE','rev');
     INSERT INTO trades(trade_id,decision_id,session_id,candidate_id,direction,status)
       VALUES('trade','dtrade','s','zone','LONG','CLOSED');").unwrap();
   let before=source_type_corrections::sources_at_decision(&c,"trade").unwrap();
   assert_eq!(before[0].original_source_price,Some(7000.0));
   assert_eq!(before[0].effective_source_price,Some(7000.0));
   record(&mut c,req(0,Some(7000.0),7000.25)).unwrap();
   let after=source_type_corrections::sources_at_decision(&c,"trade").unwrap();
   assert_eq!(after[0].original_source_price,Some(7000.0));
   assert_eq!(after[0].effective_source_price,Some(7000.25));
   assert_eq!(after[0].price_correction_revision,1);
   assert_eq!(list_for_trade(&c,"trade").unwrap().len(),1);
   let root=std::env::temp_dir().join(format!("ptj-source-price-export-{}",Uuid::new_v4()));
   let paths=crate::paths::AppPaths{
     root:root.clone(),data:root.join("data"),attachments:root.join("attachments"),
     backups:root.join("backups"),exports:root.join("exports"),logs:root.join("logs")
   };
   let csv=crate::exports::export_csv(&c,&paths,JournalFilterInput::default()).unwrap();
   let html=crate::exports::export_html(&c,&paths,JournalFilterInput::default()).unwrap();
   let csv_data=std::fs::read_to_string(csv.path).unwrap();
   let html_data=std::fs::read_to_string(html.path).unwrap();
   assert!(csv_data.contains("audited_source_price_correction_count"));
   assert!(csv_data.contains("Original level price was transcribed incorrectly"));
   assert!(html_data.contains("Audited historical Level Source price corrections"));
   assert!(html_data.contains("7000.25"));
   std::fs::remove_dir_all(root).unwrap();
   assert_eq!(repository::list_journal_trades(&c,JournalFilterInput::default()).unwrap().len(),1);
   c.execute_batch(
     "DROP TRIGGER source_price_correction_no_update;
      UPDATE candidate_source_price_correction_events
        SET previous_source_price=6000 WHERE candidate_source_id='src';").unwrap();
   assert!(verify_all(&c).is_err(),"corrupted price audit must block backup");
   assert!(source_type_corrections::sources_at_decision(&c,"trade").is_err());
 }

}
