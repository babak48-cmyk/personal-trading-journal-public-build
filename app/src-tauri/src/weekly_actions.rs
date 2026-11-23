use chrono::{Datelike,NaiveDate,Utc,Weekday};
use rusqlite::{params,Connection,OptionalExtension};
use serde::{Deserialize,Serialize};
use uuid::Uuid;
use crate::error::AppError;

#[derive(Debug,Clone,Serialize,Deserialize)]
pub struct WeeklyActionEvent {
    pub action_event_id:String,
    pub week_start:String,
    pub filter_snapshot_json:String,
    pub action_text:String,
    pub event_kind:String,
    pub note:Option<String>,
    pub based_on_event_id:Option<String>,
    pub recorded_at_utc:String,
    pub actor:String,
}

#[derive(Debug,Clone,Deserialize)]
pub struct SaveWeeklyActionInput {
    pub week_start:String,
    pub filter_snapshot_json:String,
    pub action_text:String,
    pub event_kind:String,
    pub note:Option<String>,
    pub based_on_event_id:Option<String>,
}

fn validate_week(week:&str)->Result<(),AppError>{
    let date=NaiveDate::parse_from_str(week,"%Y-%m-%d")
        .map_err(|_|AppError::Validation("weekly action requires a valid ISO week start".into()))?;
    if date.weekday()!=Weekday::Mon||date.format("%Y-%m-%d").to_string()!=week {
        return Err(AppError::Validation("weekly action date must be a Monday".into()));
    }
    Ok(())
}
fn validate_filter(json:&str)->Result<(),AppError>{
    if json.len()<2||json.len()>4000 {
        return Err(AppError::Validation("weekly filter snapshot exceeds supported size".into()));
    }
    let parsed:serde_json::Value=serde_json::from_str(json)
        .map_err(|_|AppError::Validation("invalid weekly filter snapshot".into()))?;
    if !parsed.is_object(){
        return Err(AppError::Validation("weekly filter snapshot must be an object".into()));
    }
    Ok(())
}
fn load_actions(conn:&Connection,week:&str,filter:&str)->Result<Vec<WeeklyActionEvent>,AppError>{
    let mut stmt=conn.prepare(
      "SELECT action_event_id,week_start,filter_snapshot_json,action_text,event_kind,
              note,based_on_event_id,recorded_at_utc,actor
       FROM weekly_learning_action_events
       WHERE week_start=?1 AND filter_snapshot_json=?2
       ORDER BY rowid ASC")?;
    let rows=stmt.query_map(params![week,filter],|r|Ok(WeeklyActionEvent{
        action_event_id:r.get(0)?,week_start:r.get(1)?,filter_snapshot_json:r.get(2)?,
        action_text:r.get(3)?,event_kind:r.get(4)?,note:r.get(5)?,
        based_on_event_id:r.get(6)?,recorded_at_utc:r.get(7)?,actor:r.get(8)?
    }))?.collect::<Result<Vec<_>,_>>()?;
    Ok(rows)
}
pub fn list_weekly_actions(conn:&Connection,week_start:&str,filter_snapshot_json:&str)
 ->Result<Vec<WeeklyActionEvent>,AppError>{
    validate_week(week_start)?;validate_filter(filter_snapshot_json)?;
    load_actions(conn,week_start,filter_snapshot_json)
}
pub fn save_weekly_action(conn:&mut Connection,input:SaveWeeklyActionInput)
 ->Result<WeeklyActionEvent,AppError>{
    validate_week(&input.week_start)?;validate_filter(&input.filter_snapshot_json)?;
    if input.action_text.trim().is_empty()||input.action_text.chars().count()>500 {
        return Err(AppError::Validation("weekly improvement requires 1–500 characters".into()));
    }
    if input.note.as_ref().is_some_and(|s|s.chars().count()>1000) {
        return Err(AppError::Validation("weekly action note exceeds 1000 characters".into()));
    }
    if !matches!(input.event_kind.as_str(),"COMMITMENT"|"FOLLOW_UP"){
        return Err(AppError::Validation("unknown weekly action event kind".into()));
    }
    if (input.event_kind=="COMMITMENT"&&input.based_on_event_id.is_some())||
       (input.event_kind=="FOLLOW_UP"&&input.based_on_event_id.is_none()){
        return Err(AppError::Validation("invalid weekly follow-up identity".into()));
    }
    let tx=conn.transaction()?;
    let existing=load_actions(&tx,&input.week_start,&input.filter_snapshot_json)?;
    if input.event_kind=="COMMITMENT"&&existing.iter().any(|a|a.event_kind=="COMMITMENT"){
        return Err(AppError::Validation("a weekly action is already saved for these exact filters; review history instead".into()));
    }
    if input.event_kind=="FOLLOW_UP"{
        let linked=input.based_on_event_id.as_ref().unwrap();
        if !existing.iter().any(|event|
          event.event_kind=="COMMITMENT"&&event.action_event_id==*linked){
            return Err(AppError::Validation("follow-up must reference this week's saved commitment".into()));
        }
    }
    let id=Uuid::new_v4().to_string();
    let now=Utc::now().to_rfc3339();
    let note=input.note.as_ref().map(|s|s.trim().to_string()).filter(|s|!s.is_empty());
    tx.execute("INSERT INTO weekly_learning_action_events
       (action_event_id,week_start,filter_snapshot_json,action_text,event_kind,
        note,based_on_event_id,recorded_at_utc,actor)
       VALUES(?1,?2,?3,?4,?5,?6,?7,?8,'LOCAL_USER')",
       params![id,input.week_start,input.filter_snapshot_json,input.action_text.trim(),
              input.event_kind,note,input.based_on_event_id,now])?;
    tx.commit()?;
    Ok(WeeklyActionEvent{
        action_event_id:id,week_start:input.week_start,
        filter_snapshot_json:input.filter_snapshot_json,action_text:input.action_text.trim().into(),
        event_kind:input.event_kind,note,based_on_event_id:input.based_on_event_id,
        recorded_at_utc:now,actor:"LOCAL_USER".into()
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    #[test]
    fn weekly_commitment_and_follow_up_survive_reopen_and_are_immutable(){
        let mut c=Connection::open_in_memory().unwrap();
        c.execute_batch("PRAGMA foreign_keys=ON").unwrap();
        db::migrate(&c).unwrap();
        assert_eq!(db::schema_version(&c).unwrap(),db::CURRENT_SCHEMA_VERSION);
        let request=SaveWeeklyActionInput{
            week_start:"2026-11-23".into(),filter_snapshot_json:"{}".into(),
            action_text:"Follow the pre-entry risk rule".into(),
            event_kind:"COMMITMENT".into(),note:None,based_on_event_id:None
        };
        let first=save_weekly_action(&mut c,request.clone()).unwrap();
        assert!(save_weekly_action(&mut c,request.clone()).is_err());
        assert!(c.execute("UPDATE weekly_learning_action_events SET action_text='changed'",[]).is_err());
        assert!(c.execute("DELETE FROM weekly_learning_action_events",[]).is_err());
        let follow=save_weekly_action(&mut c,SaveWeeklyActionInput{
            action_text:"Follow-up: reviewed three trade decisions".into(),
            event_kind:"FOLLOW_UP".into(),note:Some("Two compliant and one not assessed".into()),
            based_on_event_id:Some(first.action_event_id.clone()),..request
        }).unwrap();
        let rows=list_weekly_actions(&c,"2026-11-23","{}").unwrap();
        assert_eq!(rows.len(),2);
        assert_eq!(rows[0].action_event_id,first.action_event_id);
        assert_eq!(rows[1].action_event_id,follow.action_event_id);
        assert_eq!(rows[1].based_on_event_id,Some(first.action_event_id));
        assert_eq!(db::integrity_check(&c).unwrap(),"ok");
        assert_eq!(db::foreign_key_violation_count(&c).unwrap(),0);
    }
    #[test]
    fn rejects_cross_week_follow_up_and_invalid_week_or_filter(){
        let mut c=Connection::open_in_memory().unwrap();db::migrate(&c).unwrap();
        let base=SaveWeeklyActionInput{
          week_start:"2026-11-23".into(),filter_snapshot_json:"{}".into(),
          action_text:"Observe entry discipline".into(),event_kind:"COMMITMENT".into(),
          note:None,based_on_event_id:None
        };
        let saved=save_weekly_action(&mut c,base.clone()).unwrap();
        assert!(save_weekly_action(&mut c,SaveWeeklyActionInput{
          week_start:"2026-11-30".into(),event_kind:"FOLLOW_UP".into(),
          based_on_event_id:Some(saved.action_event_id.clone()),..base.clone()
        }).is_err());
        assert!(save_weekly_action(&mut c,SaveWeeklyActionInput{
          week_start:"2026-11-24".into(),..base.clone()
        }).is_err());
        assert!(save_weekly_action(&mut c,SaveWeeklyActionInput{
          filter_snapshot_json:"[]".into(),..base.clone()
        }).is_err());
        assert!(save_weekly_action(&mut c,SaveWeeklyActionInput{
          action_text:" ".into(),..base
        }).is_err());
        let count:i64=c.query_row("SELECT COUNT(*) FROM weekly_learning_action_events",[],|r|r.get(0)).unwrap();
        assert_eq!(count,1);
    }
}
