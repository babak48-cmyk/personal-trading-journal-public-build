use rusqlite::{params,Connection,OptionalExtension};
use serde::{Deserialize,Serialize};
use chrono::Utc;
use uuid::Uuid;
use crate::error::AppError;

#[derive(Debug,Clone,Deserialize,Serialize)]
pub struct EvidencePriority {
    pub evidence_label:String, pub priority_role:String,
    pub explanation:Option<String>,
}
#[derive(Debug,Clone,Deserialize)]
pub struct SaveSetupVersionInput {
    pub setup_id:Option<String>,pub name:String,
    pub source_trade_id:Option<String>,
    pub market_context:Option<String>,pub zone_location:Option<String>,
    pub prerequisites:Option<String>,pub entry_triggers:Option<String>,
    pub supporting_evidence:Option<String>,pub contrary_evidence:Option<String>,
    pub thesis_invalidation:Option<String>,pub notes:Option<String>,
    pub evidence_priorities:Vec<EvidencePriority>,
    pub approve:bool,
}
#[derive(Debug,Clone,Serialize)]
pub struct SetupVersion {
    pub setup_id:String,pub version_id:String,pub version_number:i64,
    pub name:String,pub is_active:bool,pub is_approved:bool,
    pub created_at:String,pub source_trade_id:Option<String>,
    pub market_context:Option<String>,pub zone_location:Option<String>,
    pub prerequisites:Option<String>,pub entry_triggers:Option<String>,
    pub supporting_evidence:Option<String>,pub contrary_evidence:Option<String>,
    pub thesis_invalidation:Option<String>,pub notes:Option<String>,
    pub evidence_priorities:Vec<EvidencePriority>,
}
#[derive(Debug,Clone,Serialize)]
pub struct SetupPerformance {
    pub setup_id:String,pub version_id:String,pub setup_name:String,
    pub version_number:i64,pub trade_count:i64,pub eligible_r_count:i64,
    pub net_r:Option<f64>,pub win_count:i64,pub unknown_r_count:i64,
}
fn nonempty(v:&str,max:usize,label:&str)->Result<(),AppError>{
    if v.trim().is_empty() || v.chars().count()>max {
        return Err(AppError::Validation(format!("{label} is required (max {max} chars)")));
    }
    Ok(())
}
fn bounded(v:&Option<String>,max:usize,label:&str)->Result<(),AppError>{
    if v.as_ref().is_some_and(|x|x.chars().count()>max){
        return Err(AppError::Validation(format!("{label} exceeds {max} characters")));
    }
    Ok(())
}
fn check(conn:&Connection, i:&SaveSetupVersionInput)->Result<(),AppError>{
    nonempty(&i.name,120,"Setup name")?;
    for (value,label) in [
      (&i.market_context,"market context"),(&i.zone_location,"zone location"),
      (&i.prerequisites,"prerequisites"),(&i.entry_triggers,"entry triggers"),
      (&i.supporting_evidence,"supporting evidence"),(&i.contrary_evidence,"contrary evidence"),
      (&i.thesis_invalidation,"thesis invalidation"),(&i.notes,"notes")]{
        bounded(value,2000,label)?;
    }
    if i.approve{
        for (value,label) in [
          (&i.market_context,"Market context"),(&i.zone_location,"Zone location"),
          (&i.prerequisites,"Prerequisites"),(&i.entry_triggers,"Entry triggers"),
          (&i.contrary_evidence,"Contrary/veto evidence"),(&i.thesis_invalidation,"Thesis invalidation")
        ]{
            if value.as_ref().is_none_or(|s|s.trim().is_empty()){
                return Err(AppError::Validation(format!("{label} required to approve this Setup version")));
            }
        }
    }
    if i.evidence_priorities.len()>40{return Err(AppError::Validation("At most 40 evidence priorities per setup version".into()));}
    let mut labels=std::collections::HashSet::new();
    for p in &i.evidence_priorities{
        nonempty(&p.evidence_label,120,"Evidence name")?;
        if !["REQUIRED","SUPPORTING","CONTRADICTORY","NOT_RELEVANT"].contains(&p.priority_role.as_str()){
            return Err(AppError::Validation("Invalid evidence priority role".into()));
        }
        bounded(&p.explanation,500,"Evidence help")?;
        if !labels.insert(p.evidence_label.trim().to_lowercase()){
            return Err(AppError::Validation("Duplicate evidence name in one version".into()));
        }
    }
    if let Some(id)=&i.source_trade_id {
        let state:Option<String>=conn.query_row(
            "SELECT status FROM trades WHERE trade_id=?1",[id],|r|r.get(0)).optional()?;
        if state.as_deref()!=Some("CLOSED"){
            return Err(AppError::Validation("Source Trade must be a saved CLOSED trade".into()));
        }
    }
    Ok(())
}
pub fn save_version(conn:&mut Connection,input:SaveSetupVersionInput)->Result<SetupVersion,AppError>{
    check(conn,&input)?;
    let now=Utc::now().to_rfc3339();
    let tx=conn.transaction()?;
    let setup_id=if let Some(ref existing)=input.setup_id {
       let count:i64=tx.query_row("SELECT COUNT(*) FROM setups WHERE setup_id=?1 AND active=1",[existing],|r|r.get(0))?;
       if count!=1{return Err(AppError::Validation("Unknown or inactive Setup ID".into()));}
       existing.clone()
    }else{Uuid::new_v4().to_string()};
    let revision:i64=tx.query_row(
        "SELECT COUNT(*)+1 FROM setup_versions WHERE setup_id=?1",
        [&setup_id],|r|r.get(0))?;
    if input.setup_id.is_none(){
        tx.execute("INSERT INTO setups(setup_id,workspace_id,name,active,user_defined)
                    VALUES (?1,'default-workspace',?2,1,1)",
                   params![setup_id,input.name.trim()])?;
    }else{
        // Historical name is snapshotted per version in setup_playbook_details.
        // The canonical mutable display name is only updated for new future use.
        tx.execute("UPDATE setups SET name=?2 WHERE setup_id=?1",
                   params![setup_id,input.name.trim()])?;
    }
    let id=Uuid::new_v4().to_string();
    // Use the PRE-EXISTING canonical SetupVersion identity so that Zone and
    // Trade setup_version_id references remain valid and referentially stable.
    tx.execute("INSERT INTO setup_versions(
      setup_version_id,setup_id,version_label,status,effective_from,
      location_requirements_json,context_requirements_json,trigger_definition,
      confirmation_requirements_json,invalidation_definition,notes)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
      params![id,setup_id,format!("v{revision}"),
       if input.approve{"ACTIVE"}else{"DRAFT"},now,
       input.zone_location,input.market_context,input.entry_triggers,
       input.supporting_evidence,input.thesis_invalidation,input.notes])?;
    tx.execute("INSERT INTO setup_playbook_details(
      version_id,version_number,created_at,name_snapshot,source_trade_id,
      market_context,zone_location,prerequisites,entry_triggers,supporting_evidence,
      contrary_evidence,thesis_invalidation,notes,is_approved)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
      params![id,revision,now,input.name.trim(),input.source_trade_id,input.market_context,
      input.zone_location,input.prerequisites,input.entry_triggers,input.supporting_evidence,
      input.contrary_evidence,input.thesis_invalidation,input.notes,i64::from(input.approve)])?;
    for (index,p) in input.evidence_priorities.iter().enumerate(){
        tx.execute("INSERT INTO setup_evidence_priorities(priority_id,version_id,evidence_label,priority_role,explanation,position)
          VALUES (?1,?2,?3,?4,?5,?6)",
          params![Uuid::new_v4().to_string(),id,p.evidence_label.trim(),p.priority_role,p.explanation,index as i64])?;
    }
    tx.commit()?;
    get_version(conn,&id)
}
pub fn get_version(conn:&Connection,id:&str)->Result<SetupVersion,AppError>{
    let mut v=conn.query_row(
      "SELECT v.setup_id,v.setup_version_id,d.version_number,d.name_snapshot,s.active,d.is_approved,
       d.created_at,d.source_trade_id,d.market_context,d.zone_location,d.prerequisites,
       d.entry_triggers,d.supporting_evidence,d.contrary_evidence,d.thesis_invalidation,d.notes
       FROM setup_versions v JOIN setups s ON s.setup_id=v.setup_id
       JOIN setup_playbook_details d ON d.version_id=v.setup_version_id
       WHERE v.setup_version_id=?1",
       [id],|r|Ok(SetupVersion{
         setup_id:r.get(0)?,version_id:r.get(1)?,version_number:r.get(2)?,
         name:r.get(3)?,is_active:r.get::<_,i64>(4)?!=0,is_approved:r.get::<_,i64>(5)?!=0,
         created_at:r.get(6)?,source_trade_id:r.get(7)?,market_context:r.get(8)?,
         zone_location:r.get(9)?,prerequisites:r.get(10)?,entry_triggers:r.get(11)?,
         supporting_evidence:r.get(12)?,contrary_evidence:r.get(13)?,
         thesis_invalidation:r.get(14)?,notes:r.get(15)?,evidence_priorities:vec![]
       }))?;
    let mut stmt=conn.prepare("SELECT evidence_label,priority_role,explanation
       FROM setup_evidence_priorities WHERE version_id=?1 ORDER BY position")?;
    v.evidence_priorities=stmt.query_map([id],|r|Ok(EvidencePriority{
      evidence_label:r.get(0)?,priority_role:r.get(1)?,explanation:r.get(2)?
    }))?.collect::<Result<Vec<_>,_>>()?;
    Ok(v)
}
pub fn list_versions(conn:&Connection)->Result<Vec<SetupVersion>,AppError>{
    let mut stmt=conn.prepare("SELECT d.version_id FROM setup_playbook_details d ORDER BY d.created_at DESC,d.version_number DESC")?;
    let ids=stmt.query_map([],|r|r.get::<_,String>(0))?.collect::<Result<Vec<_>,_>>()?;
    ids.iter().map(|id|get_version(conn,id)).collect()
}
pub fn deactivate(conn:&Connection,id:&str)->Result<(),AppError>{
    let affected=conn.execute("UPDATE setups SET active=0 WHERE setup_id=?1",
        params![id])?;
    if affected!=1{return Err(AppError::Validation("Unknown Setup ID".into()));}
    Ok(())
}
pub fn link_closed_trade(conn:&Connection,trade_id:&str,version_id:&str,link_note:Option<String>)
 -> Result<(),AppError>{
    bounded(&link_note,500,"Attribution note")?;
    let state:Option<String>=conn.query_row("SELECT status FROM trades WHERE trade_id=?1",
        [trade_id],|r|r.get(0)).optional()?;
    if state.as_deref()!=Some("CLOSED"){return Err(AppError::Validation("Only a CLOSED Trade can be attributed retrospectively".into()));}
    let ok:Option<(i64,i64)>=conn.query_row(
      "SELECT d.is_approved,s.active FROM setup_playbook_details d JOIN setup_versions v ON v.setup_version_id=d.version_id JOIN setups s ON s.setup_id=v.setup_id WHERE v.setup_version_id=?1",
      [version_id],|r|Ok((r.get(0)?,r.get(1)?))).optional()?;
    if ok!=Some((1,1)){return Err(AppError::Validation("Only an approved and active version can be linked".into()));}
    let existing:Option<String>=conn.query_row(
        "SELECT setup_version_id FROM trades WHERE trade_id=?1",
        [trade_id],|r|r.get(0))?;
    if existing.is_some(){
        return Err(AppError::Validation("Trade already has an original at-entry SetupVersion; retrospective reassignment prohibited".into()));
    }
    conn.execute("INSERT INTO setup_trade_links(trade_id,version_id,linked_at,link_note) VALUES (?1,?2,?3,?4)",
       params![trade_id,version_id,Utc::now().to_rfc3339(),link_note])?;
    Ok(())
}
pub fn setup_performance(conn:&Connection)->Result<Vec<SetupPerformance>,AppError>{
    let mut out=Vec::new();
    for v in list_versions(conn)?.into_iter().filter(|v|v.is_approved){
        let mut stmt=conn.prepare(
           "SELECT trade_id FROM trades WHERE setup_version_id=?1
            UNION SELECT trade_id FROM setup_trade_links WHERE version_id=?1")?;
        let ids=stmt.query_map([&v.version_id],|r|r.get::<_,String>(0))?.collect::<Result<Vec<_>,_>>()?;
        let mut eligible=0;let mut sum=0.0;let mut wins=0;
        for id in &ids{
            let m=crate::repository::get_trade_detail(conn,id)?.metrics;
            if let Some(r)=m.realized_r {eligible+=1;sum+=r;if r>0.0{wins+=1;}}
        }
        out.push(SetupPerformance{
          setup_id:v.setup_id,version_id:v.version_id,setup_name:v.name,
          version_number:v.version_number,trade_count:ids.len() as i64,
          eligible_r_count:eligible,net_r:if eligible>0{Some(sum)}else{None},
          win_count:wins,unknown_r_count:ids.len() as i64-eligible
        });
    }
    Ok(out)
}
#[cfg(test)]
mod tests {
 use super::*;
 use crate::{db,repository};
 #[test]
 fn versions_are_immutable_and_group_metrics_do_not_invent_r(){
    let mut c=Connection::open_in_memory().unwrap();
    c.execute_batch("PRAGMA foreign_keys=ON").unwrap();db::migrate(&c).unwrap();
    assert_eq!(db::schema_version(&c).unwrap(),11);
    repository::ensure_default_workspace(&c).unwrap();
    c.execute_batch("INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at) VALUES ('s','default-workspace','instrument-ES','2026-11-16','DEMO','now','ACTIVE','now','now');
       INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type,intended_direction) VALUES('d','s','now','TRADE','LONG');
       INSERT INTO trades(trade_id,decision_id,session_id,direction,status) VALUES('t','d','s','LONG','CLOSED');
       INSERT INTO execution_fills(execution_id,trade_id,action,side,price,quantity) VALUES('f1','t','ENTRY','BUY',5000,1),('f2','t','EXIT','SELL',5001,1);").unwrap();
    let form=|setup_id:Option<String>,approve|SaveSetupVersionInput{
       setup_id,name:"Rejection at Zone".into(),source_trade_id:Some("t".into()),
       market_context:Some("Rejection, ES".into()),zone_location:Some("Planned value edge".into()),
       prerequisites:Some("Price at zone".into()),entry_triggers:Some("Observed rejection".into()),
       supporting_evidence:Some("Review Delta".into()),
       contrary_evidence:Some("Acceptance through zone".into()),
       thesis_invalidation:Some("Auction accepts beyond zone".into()),notes:None,
       evidence_priorities:vec![EvidencePriority{evidence_label:"Delta".into(),priority_role:"SUPPORTING".into(),explanation:None}],
       approve};
    let a=save_version(&mut c,form(None,true)).unwrap();
    assert_eq!(a.version_number,1);assert_eq!(a.evidence_priorities.len(),1);
    let v2=save_version(&mut c,form(Some(a.setup_id.clone()),true)).unwrap();
    assert_eq!(v2.version_number,2);
    assert!(c.execute("UPDATE setup_versions SET entry_triggers='changed' WHERE version_id=?1",[&a.version_id]).is_err());
    assert!(c.execute("DELETE FROM setup_versions WHERE version_id=?1",[&a.version_id]).is_err());
    link_closed_trade(&c,"t",&a.version_id,Some("retrospective attribution".into())).unwrap();
    assert!(link_closed_trade(&c,"t",&v2.version_id,None).is_err());
    let perf=setup_performance(&c).unwrap();
    let first=perf.iter().find(|p|p.version_id==a.version_id).unwrap();
    assert_eq!(first.trade_count,1);assert_eq!(first.eligible_r_count,0);
    assert_eq!(first.net_r,None);
    deactivate(&c,&a.setup_id).unwrap();
    assert!(link_closed_trade(&c,"t",&v2.version_id,None).is_err());
    assert_eq!(get_version(&c,&a.version_id).unwrap().version_number,1);
 }
}
