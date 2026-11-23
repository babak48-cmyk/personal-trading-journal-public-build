//! Historical correction of a mistakenly selected Level Source type.
//! Corrects stored meaning only; never mutates the original Zone revision,
//! original source row, Decision, execution or genuine later market changes.
use chrono::Utc;
use rusqlite::{params,Connection,OptionalExtension};
use serde::{Deserialize,Serialize};
use uuid::Uuid;
use crate::error::AppError;

#[derive(Debug,Clone,Serialize,Deserialize)]
pub struct SourceTypeCorrectionRequest {
    pub candidate_source_id:String,
    pub expected_effective_type_id:String,
    pub expected_revision:i64,
    pub replacement_type_id:String,
    pub reason:String,
}
#[derive(Debug,Clone,Serialize)]
pub struct SourceTypeCorrectionEvent {
    pub correction_id:String,
    pub candidate_source_id:String,
    pub revision:i64,
    pub original_source_type_id:String,
    pub previous_source_type_id:String,
    pub replacement_source_type_id:String,
    pub expected_prior_correction_id:Option<String>,
    pub reason:String,
    pub recorded_at_utc:String,
    pub actor:String,
}
#[derive(Debug,Clone,Serialize)]
pub struct HistoricalSourceReadout {
    pub candidate_source_id:String,
    pub candidate_revision_id:String,
    pub original_source_type_id:String,
    pub original_label:String,
    pub effective_source_type_id:String,
    pub effective_label:String,
    pub revision:i64,
    pub corrected:bool,
}
#[derive(Debug,Clone,Serialize)]
pub struct SourceTypeCorrectionPreview {
    pub candidate_source_id:String,
    pub candidate_revision_id:String,
    pub original_source_type_id:String,
    pub current_effective_type_id:String,
    pub replacement_type_id:String,
    pub current_label:String,
    pub replacement_label:String,
    pub expected_revision:i64,
    pub related_decision_count:i64,
    pub related_trade_count:i64,
    pub reason:String,
    pub monetary_result_unchanged:bool,
    pub explicit_confirmation_required:bool,
}
fn has_table(conn:&Connection)->Result<bool,AppError>{
    Ok(conn.query_row(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='candidate_source_type_correction_events'",
      [],|r|r.get::<_,i64>(0)).optional()?.is_some())
}
fn source_identity(conn:&Connection,source_id:&str)
 ->Result<(String,String,String,String),AppError>{
    conn.query_row(
      "SELECT cs.candidate_revision_id,cs.source_type_id,i.workspace_id,c.candidate_id
       FROM candidate_sources cs JOIN candidates c ON c.candidate_id=cs.candidate_id
       JOIN instruments i ON i.instrument_id=c.instrument_id
       WHERE cs.candidate_source_id=?1 AND cs.candidate_revision_id IS NOT NULL
         AND EXISTS(
           SELECT 1 FROM candidate_revisions cr
           WHERE cr.candidate_revision_id=cs.candidate_revision_id
             AND cr.candidate_id=cs.candidate_id)",
      [source_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?))
    ).optional()?
      .ok_or_else(||AppError::Validation("original Level Source and Zone revision identity could not be verified".into()))
}
fn label(conn:&Connection,id:&str,workspace:&str)->Result<String,AppError>{
    conn.query_row(
      "SELECT label FROM level_source_types WHERE source_type_id=?1 AND workspace_id=?2",
      params![id,workspace],|r|r.get(0)
    ).optional()?.ok_or_else(||AppError::Validation(
      "replacement Level Source type must belong to the original workspace".into()))
}
pub fn effective_type(
  conn:&Connection,source_id:&str,original:&str
)->Result<(String,i64,Option<String>),AppError>{
    if !has_table(conn)?{return Ok((original.to_owned(),0,None));}
    let mut stmt=conn.prepare(
     "SELECT correction_id,revision,original_source_type_id,previous_source_type_id,
             replacement_source_type_id,expected_prior_correction_id
      FROM candidate_source_type_correction_events
      WHERE candidate_source_id=?1 ORDER BY revision")?;
    let events=stmt.query_map([source_id],|r|Ok((
        r.get::<_,String>(0)?,r.get::<_,i64>(1)?,r.get::<_,String>(2)?,
        r.get::<_,String>(3)?,r.get::<_,String>(4)?,r.get::<_,Option<String>>(5)?
    )))?;
    let mut effective=original.to_owned();let mut revision=0;let mut prior=None;
    for e in events {
        let (id,next,first,previous,replacement,expected_prior)=e?;
        if next!=revision+1||first!=original||previous!=effective||
           replacement==effective||expected_prior!=prior{
            return Err(AppError::Validation("historical Level Source correction audit chain failed verification".into()));
        }
        effective=replacement;revision=next;prior=Some(id);
    }
    Ok((effective,revision,prior))
}
pub fn sources_at_decision(conn:&Connection,trade_id:&str)
 ->Result<Vec<HistoricalSourceReadout>,AppError>{
    let rev:Option<String>=conn.query_row(
      "SELECT cd.based_on_candidate_revision_id FROM trades t
       JOIN candidate_decisions cd ON cd.decision_id=t.decision_id
       WHERE t.trade_id=?1",
       [trade_id],|r|r.get(0)).optional()?.flatten();
    let Some(rev)=rev else{return Ok(Vec::new());};
    let mut stmt=conn.prepare(
     "SELECT cs.candidate_source_id,cs.candidate_revision_id,
             cs.source_type_id,lst.label,lst.workspace_id
      FROM candidate_sources cs JOIN level_source_types lst ON lst.source_type_id=cs.source_type_id
      WHERE cs.candidate_revision_id=?1 ORDER BY cs.is_primary DESC,cs.rowid")?;
    let rows=stmt.query_map([rev],|r|Ok((
      r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,
      r.get::<_,String>(3)?,r.get::<_,String>(4)?
    )))?.collect::<Result<Vec<_>,_>>()?;
    let mut result=Vec::new();
    for (id,revision_id,original,original_label,workspace) in rows {
        let (effective,revision,_)=effective_type(conn,&id,&original)?;
        let effective_label=label(conn,&effective,&workspace)?;
        result.push(HistoricalSourceReadout{
          candidate_source_id:id,candidate_revision_id:revision_id,
          original_source_type_id:original,
          original_label,effective_source_type_id:effective,
          effective_label,revision,corrected:revision>0,
        });
    }
    Ok(result)
}
pub fn preview(conn:&Connection,request:&SourceTypeCorrectionRequest)
 ->Result<SourceTypeCorrectionPreview,AppError>{
    let n=request.reason.trim().chars().count();
    if !(5..=500).contains(&n){
        return Err(AppError::Validation("source correction requires a factual reason (5–500 characters)".into()));
    }
    let (rev,original,workspace,_zone)=source_identity(conn,&request.candidate_source_id)?;
    let original_label=label(conn,&original,&workspace)?;
    let replacement_label=label(conn,&request.replacement_type_id,&workspace)?;
    let (effective,revision,_)=effective_type(conn,&request.candidate_source_id,&original)?;
    let current_label=if effective==original{original_label}else{label(conn,&effective,&workspace)?};
    if effective!=request.expected_effective_type_id||revision!=request.expected_revision {
        return Err(AppError::Validation("source changed since preview; independently re-read source and audit".into()));
    }
    if effective==request.replacement_type_id {
        return Err(AppError::Validation("replacement equals the currently effective recorded source".into()));
    }
    let decision_count:i64=conn.query_row(
        "SELECT COUNT(*) FROM candidate_decisions WHERE based_on_candidate_revision_id=?1",
        [&rev],|r|r.get(0))?;
    if decision_count==0{
        return Err(AppError::Validation("source was not used in a saved historical Decision; use normal Zone revisions instead".into()));
    }
    let trade_count:i64=conn.query_row(
       "SELECT COUNT(*) FROM trades t JOIN candidate_decisions cd ON cd.decision_id=t.decision_id
        WHERE cd.based_on_candidate_revision_id=?1",
       [&rev],|r|r.get(0))?;
    Ok(SourceTypeCorrectionPreview{
      candidate_source_id:request.candidate_source_id.clone(),
      candidate_revision_id:rev,original_source_type_id:original,
      current_effective_type_id:effective,replacement_type_id:request.replacement_type_id.clone(),
      current_label,replacement_label,expected_revision:revision,
      related_decision_count:decision_count,related_trade_count:trade_count,
      reason:request.reason.trim().into(),monetary_result_unchanged:true,
      explicit_confirmation_required:true
    })
}
pub fn record(conn:&mut Connection,request:SourceTypeCorrectionRequest)
 ->Result<SourceTypeCorrectionEvent,AppError>{
    let tx=conn.transaction()?;
    let before=preview(&tx,&request)?;
    let (_effective,_revision,prior)=effective_type(
        &tx,&request.candidate_source_id,&before.original_source_type_id)?;
    let now=Utc::now().to_rfc3339();
    let id=Uuid::new_v4().to_string();
    tx.execute(
      "INSERT INTO candidate_source_type_correction_events
       (correction_id,candidate_source_id,revision,original_source_type_id,
        previous_source_type_id,replacement_source_type_id,expected_prior_correction_id,
        reason,recorded_at_utc,actor)
       VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,'LOCAL_USER')",
      params![id,request.candidate_source_id,before.expected_revision+1,
       before.original_source_type_id,before.current_effective_type_id,
       before.replacement_type_id,prior,before.reason,now])?;
    let (resolved,revision,_)=effective_type(&tx,&request.candidate_source_id,
       &before.original_source_type_id)?;
    if resolved!=before.replacement_type_id||revision!=before.expected_revision+1{
        return Err(AppError::Validation("source history could not be independently resolved".into()));
    }
    tx.commit()?;
    Ok(SourceTypeCorrectionEvent{
      correction_id:id,candidate_source_id:request.candidate_source_id,
      revision,original_source_type_id:before.original_source_type_id,
      previous_source_type_id:before.current_effective_type_id,
      replacement_source_type_id:before.replacement_type_id,
      expected_prior_correction_id:prior,reason:before.reason,
      recorded_at_utc:now,actor:"LOCAL_USER".into()
    })
}
pub fn list_source_corrections_for_trade(conn:&Connection,trade_id:&str)
 ->Result<Vec<SourceTypeCorrectionEvent>,AppError>{
    if !has_table(conn)?{return Ok(Vec::new());}
    let mut stmt=conn.prepare(
      "SELECT e.correction_id,e.candidate_source_id,e.revision,
              e.original_source_type_id,e.previous_source_type_id,e.replacement_source_type_id,
              e.expected_prior_correction_id,e.reason,e.recorded_at_utc,e.actor
       FROM candidate_source_type_correction_events e
       JOIN candidate_sources cs ON cs.candidate_source_id=e.candidate_source_id
       JOIN candidate_decisions cd ON cd.based_on_candidate_revision_id=cs.candidate_revision_id
       JOIN trades t ON t.decision_id=cd.decision_id WHERE t.trade_id=?1
       ORDER BY e.candidate_source_id,e.revision")?;
    let entries=stmt.query_map([trade_id],|r|Ok(SourceTypeCorrectionEvent{
      correction_id:r.get(0)?,candidate_source_id:r.get(1)?,revision:r.get(2)?,
      original_source_type_id:r.get(3)?,previous_source_type_id:r.get(4)?,
      replacement_source_type_id:r.get(5)?,expected_prior_correction_id:r.get(6)?,
      reason:r.get(7)?,recorded_at_utc:r.get(8)?,actor:r.get(9)?
    }))?.collect::<Result<Vec<_>,_>>()?;
    Ok(entries)
}
pub fn verify_all_source_correction_chains(conn:&Connection)->Result<i64,AppError>{
    if !has_table(conn)?{return Ok(0);}
    let mut stmt=conn.prepare(
      "SELECT DISTINCT candidate_source_id FROM candidate_source_type_correction_events")?;
    let ids=stmt.query_map([],|r|r.get::<_,String>(0))?
      .collect::<Result<Vec<_>,_>>()?;
    let mut total=0;
    for id in ids{
        let (_,original,workspace,_)=source_identity(conn,&id)?;
        let (effective,n,_)=effective_type(conn,&id,&original)?;
        label(conn,&original,&workspace)?;label(conn,&effective,&workspace)?;
        total+=n;
    }
    Ok(total)
}

#[cfg(test)]
mod audited_source_type_tests {
    use super::*;
    use crate::{db,repository::{self,JournalFilterInput}};
    fn fixture()->Connection{
        let conn=Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON").unwrap();
        db::migrate(&conn).unwrap();
        conn.execute_batch("
          INSERT INTO workspaces(workspace_id,name,created_at)
            VALUES('w','Synthetic','2026-11-23'),('other','Other','2026-11-23');
          INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value)
            VALUES('i','w','ES',0.25,50);
          INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at)
            VALUES('sess','w','i','2026-11-23','DEMO','2026-11-23','CLOSED','2026-11-23','2026-11-23');
          INSERT INTO candidates(candidate_id,session_id,instrument_id,label,identified_when,created_at)
            VALUES('zone1','sess','i','Original Zone','PRE_SESSION','2026-11-23'),
                  ('zone2','sess','i','Other Zone','PRE_SESSION','2026-11-23');
          INSERT INTO candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,price_mode,change_type)
            VALUES('rev1','zone1',1,'2026-11-23','RANGE','CREATE'),
                  ('rev2','zone2',1,'2026-11-23','RANGE','CREATE');
          INSERT INTO level_source_types(source_type_id,workspace_id,code,label,source_group)
            VALUES('sourceA','w','TEST_A','Original High','STRUCTURE'),
                  ('sourceB','w','TEST_B','Actual Level','STRUCTURE'),
                  ('sourceC','w','TEST_C','Another Level','STRUCTURE'),
                  ('wrongSpace','other','TEST_X','Unrelated','STRUCTURE');
          INSERT INTO candidate_sources(candidate_source_id,candidate_id,candidate_revision_id,source_type_id,is_primary)
            VALUES('cs1','zone1','rev1','sourceA',1),
                  ('cs2','zone2','rev2','sourceA',1);
          INSERT INTO candidate_decisions(decision_id,candidate_id,session_id,occurred_at,decision_type,intended_direction,based_on_candidate_revision_id)
            VALUES('d1','zone1','sess','2026-11-23T10:00:00Z','TRADE','LONG','rev1'),
                  ('d2','zone2','sess','2026-11-23T10:30:00Z','TRADE','LONG','rev2');
          INSERT INTO trades(trade_id,decision_id,session_id,candidate_id,direction,status)
            VALUES('trade1','d1','sess','zone1','LONG','CLOSED'),
                  ('trade2','d2','sess','zone2','LONG','CLOSED');
        ").unwrap();
        conn
    }
    #[test]
    fn source_correction_changes_only_historical_effective_classification_and_keeps_original(){
        let mut conn=fixture();
        assert_eq!(db::schema_version(&conn).unwrap(),14);
        let first=sources_at_decision(&conn,"trade1").unwrap();
        assert_eq!(first.len(),1);
        assert_eq!(first[0].original_source_type_id,"sourceA");
        let req=SourceTypeCorrectionRequest{
            candidate_source_id:"cs1".into(),expected_effective_type_id:"sourceA".into(),
            expected_revision:0,replacement_type_id:"sourceB".into(),
            reason:"Wrong source selected at initial plan".into()
        };
        let p=preview(&conn,&req).unwrap();
        assert_eq!(p.related_decision_count,1);
        assert_eq!(p.related_trade_count,1);
        assert!(p.monetary_result_unchanged);
        assert_eq!(p.current_label,"Original High");
        assert_eq!(p.replacement_label,"Actual Level");
        let saved=record(&mut conn,req.clone()).unwrap();
        assert_eq!(saved.revision,1);
        assert!(record(&mut conn,req).is_err(),"stale revision or duplicate save must fail");
        let second=sources_at_decision(&conn,"trade1").unwrap();
        assert_eq!(second[0].original_source_type_id,"sourceA");
        assert_eq!(second[0].effective_source_type_id,"sourceB");
        assert_eq!(second[0].revision,1);
        assert_eq!(sources_at_decision(&conn,"trade2").unwrap()[0].effective_source_type_id,"sourceA");
        let stored:String=conn.query_row(
            "SELECT source_type_id FROM candidate_sources WHERE candidate_source_id='cs1'",[],|r|r.get(0)).unwrap();
        assert_eq!(stored,"sourceA","original level source event is immutable");
        let trade1=repository::list_journal_trades(&conn,JournalFilterInput::default()).unwrap();
        let affected=trade1.iter().find(|row|row.trade_id=="trade1").unwrap();
        let unaffected=trade1.iter().find(|row|row.trade_id=="trade2").unwrap();
        assert!(affected.level_sources.iter().any(|s|s.contains("Actual Level")));
        assert!(affected.level_sources.iter().any(|s|s.contains("corrected historical entry")));
        assert_eq!(unaffected.level_sources,vec!["Original High"]);
        assert_eq!(list_source_corrections_for_trade(&conn,"trade1").unwrap().len(),1);
        assert_eq!(list_source_corrections_for_trade(&conn,"trade2").unwrap().len(),0);
        assert_eq!(verify_all_source_correction_chains(&conn).unwrap(),1);
        let root=std::env::temp_dir().join(format!("ptj-source-export-{}",Uuid::new_v4()));
        let paths=crate::paths::AppPaths{
          root:root.clone(),data:root.join("data"),attachments:root.join("attachments"),
          backups:root.join("backups"),exports:root.join("exports"),logs:root.join("logs")
        };
        let csv=crate::exports::export_csv(&conn,&paths,JournalFilterInput::default()).unwrap();
        let html=crate::exports::export_html(&conn,&paths,JournalFilterInput::default()).unwrap();
        let csv_data=std::fs::read_to_string(csv.path).unwrap();
        let html_data=std::fs::read_to_string(html.path).unwrap();
        assert!(csv_data.contains("audited_source_type_correction_count"));
        assert!(csv_data.contains("Wrong source selected at initial plan"));
        assert!(html_data.contains("Audited historical Level Source type corrections"));
        assert!(html_data.contains("Wrong source selected at initial plan"));
        std::fs::remove_dir_all(root).unwrap();
        assert!(conn.execute(
          "UPDATE candidate_source_type_correction_events SET reason='Changed'",[]).is_err());
        assert!(conn.execute("DELETE FROM candidate_source_type_correction_events",[]).is_err());
        assert_eq!(db::integrity_check(&conn).unwrap(),"ok");
        assert_eq!(db::foreign_key_violation_count(&conn).unwrap(),0);
        let second_req=SourceTypeCorrectionRequest{
           candidate_source_id:"cs1".into(),expected_effective_type_id:"sourceB".into(),
           expected_revision:1,replacement_type_id:"sourceC".into(),
           reason:"Further verified record classification".into()
        };
        assert_eq!(record(&mut conn,second_req).unwrap().revision,2);
        assert_eq!(verify_all_source_correction_chains(&conn).unwrap(),2);
        assert_eq!(sources_at_decision(&conn,"trade1").unwrap()[0].effective_source_type_id,"sourceC");
    }
    #[test]
    fn rejects_cross_workspace_wrong_owner_unreferenced_and_mismatched_revision(){
        let mut conn=fixture();
        let req=SourceTypeCorrectionRequest{
            candidate_source_id:"cs1".into(),expected_effective_type_id:"sourceA".into(),
            expected_revision:0,replacement_type_id:"wrongSpace".into(),
            reason:"Recorded source was incorrect".into()
        };
        assert!(preview(&conn,&req).is_err());
        assert!(record(&mut conn,req).is_err());
        assert!(preview(&conn,&SourceTypeCorrectionRequest{
           candidate_source_id:"cs1".into(),expected_effective_type_id:"sourceB".into(),
           expected_revision:0,replacement_type_id:"sourceC".into(),
           reason:"Attempt to use incorrect prior value".into()
        }).is_err());
        assert!(preview(&conn,&SourceTypeCorrectionRequest{
           candidate_source_id:"missing".into(),expected_effective_type_id:"sourceA".into(),
           expected_revision:0,replacement_type_id:"sourceC".into(),
           reason:"Missing source record".into()
        }).is_err());
        conn.execute_batch(
          "INSERT INTO candidates(candidate_id,session_id,instrument_id,label,identified_when,created_at)
             VALUES('unsaved','sess','i','Never traded','DURING_SESSION','2026-11-23');
           INSERT INTO candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,price_mode,change_type)
             VALUES('unsaved-rev','unsaved',1,'2026-11-23','RANGE','CREATE');
           INSERT INTO candidate_sources(candidate_source_id,candidate_id,candidate_revision_id,source_type_id)
             VALUES('unsaved-src','unsaved','unsaved-rev','sourceA');").unwrap();
        assert!(preview(&conn,&SourceTypeCorrectionRequest{
           candidate_source_id:"unsaved-src".into(),expected_effective_type_id:"sourceA".into(),
           expected_revision:0,replacement_type_id:"sourceB".into(),
           reason:"No historical decision exists".into()
        }).is_err());
        assert_eq!(verify_all_source_correction_chains(&conn).unwrap(),0);
    }
    #[test]
    fn tampered_source_correction_chain_fails_read_and_export_integrity(){
        let mut conn=fixture();
        let req=SourceTypeCorrectionRequest{
            candidate_source_id:"cs1".into(),expected_effective_type_id:"sourceA".into(),
            expected_revision:0,replacement_type_id:"sourceB".into(),
            reason:"Originally wrong classification".into()
        };
        record(&mut conn,req).unwrap();
        // Tamper is attempted through a deliberately independent, isolated test
        // database by dropping the protection trigger; the normal app never does this.
        conn.execute_batch(
          "DROP TRIGGER source_type_correction_no_update;
           UPDATE candidate_source_type_correction_events
             SET previous_source_type_id='sourceC' WHERE candidate_source_id='cs1';").unwrap();
        assert!(verify_all_source_correction_chains(&conn).is_err());
        assert!(sources_at_decision(&conn,"trade1").is_err());
    }
}
