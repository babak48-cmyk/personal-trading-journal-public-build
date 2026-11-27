use rusqlite::{params,Connection,OptionalExtension};
use serde::Serialize;
use crate::{custom_fields::{self,ManagedField,SelectionSnapshot},error::AppError,repository::{self,JournalFilterInput}};

#[derive(Debug,Serialize)]
pub struct SavedAnswer {
    pub event_id:String,
    pub recorded_at:String,
    pub value_type:String,
    pub text_value:Option<String>,
    pub number_value:Option<f64>,
    pub boolean_value:Option<bool>,
    pub date_value:Option<String>,
    pub options:Vec<SelectionSnapshot>,
}
#[derive(Debug,Serialize)]
pub struct CustomTradeAnswer {
    pub trade_id:String,
    pub owner_id:Option<String>,
    pub status:String,
    pub realized_r:Option<f64>,
    pub answer:Option<SavedAnswer>,
}
#[derive(Debug,Serialize)]
pub struct CustomTradeAnalysis {
    pub field:ManagedField,
    pub timing:String,
    pub rows:Vec<CustomTradeAnswer>,
}

fn decision_stage(stage:&str)->bool{
    matches!(stage,"session"|"premarket-plan"|"candidate"|"zone")
}
fn read_answer(conn:&Connection,field:&ManagedField,owner:&str,decision_at:Option<&str>)->Result<Option<SavedAnswer>,AppError>{
    // Match the journal's existing timestamp semantics: planning answers must
    // have a parseable timestamp at or before the original Decision instant.
    // Later review/execution answers are explicitly retrospective.
    let answer=conn.query_row(
        "SELECT event_id,recorded_at,value_type,text_value,number_value,boolean_value,date_value
         FROM custom_field_value_events
         WHERE field_id=?1 AND owner_stage=?2 AND owner_id=?3 AND value_type=?4
           AND julianday(recorded_at) IS NOT NULL
           AND (?5=0 OR (julianday(?6) IS NOT NULL AND julianday(recorded_at)<=julianday(?6)))
         ORDER BY julianday(recorded_at) DESC,rowid DESC LIMIT 1",
        params![field.field_id,field.stage,owner,field.field_type,i64::from(decision_stage(&field.stage)),decision_at],
        |row|Ok(SavedAnswer{event_id:row.get(0)?,recorded_at:row.get(1)?,value_type:row.get(2)?,
            text_value:row.get(3)?,number_value:row.get(4)?,boolean_value:row.get::<_,Option<i64>>(5)?.map(|v|v==1),
            date_value:row.get(6)?,options:vec![]})
    ).optional()?;
    if let Some(mut value)=answer{
        if matches!(field.field_type.as_str(),"SINGLE_SELECT"|"MULTI_SELECT"){
            value.options=custom_fields::read_snapshots(conn,&value.event_id)?;
        }
        return Ok(Some(value));
    }
    Ok(None)
}

fn canonical_owner(conn:&Connection,stage:&str,trade_id:&str)->Result<Option<String>,AppError>{
    // Derive identities from canonical foreign keys, not display names or
    // user-supplied owner IDs. Session review values use review_id, not session_id.
    let query=match stage{
        "session"|"premarket-plan"=>"SELECT session_id FROM trades WHERE trade_id=?1",
        "candidate"|"zone"=>"SELECT candidate_id FROM trades WHERE trade_id=?1",
        "trade"|"execution"|"post-trade-review"=>"SELECT trade_id FROM trades WHERE trade_id=?1",
        "session-review"=>"SELECT sr.review_id FROM trades t JOIN session_reviews sr ON sr.session_id=t.session_id WHERE t.trade_id=?1",
        _=>return Err(AppError::Validation("unsupported custom analysis stage".into())),
    };
    Ok(conn.query_row(query,[trade_id],|r|r.get::<_,Option<String>>(0)).optional()?.flatten())
}

/// Reuse the exact standard trade filters and verified accounting. No change
/// to the existing analytics or exports; this is a separate read-only cohort.
pub fn analyze(conn:&Connection,filter:JournalFilterInput,field_id:&str)->Result<CustomTradeAnalysis,AppError>{
    let field=custom_fields::list_custom_fields(conn)?.into_iter().find(|f|f.field_id==field_id)
        .ok_or_else(||AppError::Validation("custom analysis field not found".into()))?;
    if !matches!(field.stage.as_str(),"session"|"premarket-plan"|"candidate"|"zone"|"trade"|"execution"|"post-trade-review"|"session-review"){
        return Err(AppError::Validation("unsupported custom analysis stage".into()));
    }
    let timing=if decision_stage(&field.stage){"AT_OR_BEFORE_DECISION"}else{"LATEST_RECORDED_RETROSPECTIVE"}.to_string();
    let trades=repository::list_journal_trades(conn,filter)?;
    let mut rows=Vec::with_capacity(trades.len());
    for trade in trades{
        let owner_id=canonical_owner(conn,&field.stage,&trade.trade_id)?;
        let answer=match owner_id.as_deref(){
            Some(owner)=>read_answer(conn,&field,owner,trade.decision_occurred_at.as_deref())?,
            None=>None,
        };
        rows.push(CustomTradeAnswer{trade_id:trade.trade_id,owner_id,status:trade.status,realized_r:trade.realized_r,answer});
    }
    Ok(CustomTradeAnalysis{field,timing,rows})
}

#[derive(Debug,Serialize)]
pub struct CustomDecisionAnswer {
    pub decision_id:String,
    pub owner_id:Option<String>,
    pub decision_type:String,
    pub occurred_at:String,
    pub reason_code:Option<String>,
    pub reason_note:Option<String>,
    pub answer:Option<SavedAnswer>,
}
#[derive(Debug,Serialize)]
pub struct CustomDecisionAnalysis {
    pub field:ManagedField,
    pub rows:Vec<CustomDecisionAnswer>,
}

/// Same date/instrument scope as the standard decision-only analytics.
/// No trade metrics or retrospective execution/review fields.
pub fn analyze_decisions(conn:&Connection,filter:JournalFilterInput,field_id:&str)->Result<CustomDecisionAnalysis,AppError>{
    let field=custom_fields::list_custom_fields(conn)?.into_iter().find(|f|f.field_id==field_id)
        .ok_or_else(||AppError::Validation("custom analysis field not found".into()))?;
    if !decision_stage(&field.stage){
        return Err(AppError::Validation("decision-only analysis requires a planning or Zone field".into()));
    }
    let mut stmt=conn.prepare(
        "SELECT cd.decision_id,cd.session_id,cd.candidate_id,cd.decision_type,cd.occurred_at,cd.reason_code,cd.reason_note
         FROM candidate_decisions cd JOIN sessions s ON s.session_id=cd.session_id
         JOIN instruments i ON i.instrument_id=s.instrument_id
         WHERE cd.decision_type IN ('NO_TRADE','MISSED')
           AND (?1 IS NULL OR s.session_date>=?1)
           AND (?2 IS NULL OR s.session_date<=?2)
           AND (?3 IS NULL OR COALESCE(s.instrument_symbol_snapshot,i.symbol)=?3)
         ORDER BY cd.occurred_at DESC,cd.decision_id"
    )?;
    let base=stmt.query_map(params![filter.date_from,filter.date_to,filter.instrument_symbol],|r|Ok((
        r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,Option<String>>(2)?,
        r.get::<_,String>(3)?,r.get::<_,String>(4)?,r.get::<_,Option<String>>(5)?,r.get::<_,Option<String>>(6)?
    )))?.collect::<Result<Vec<_>,_>>()?;
    let mut rows=Vec::with_capacity(base.len());
    for (decision_id,session,candidate,decision_type,occurred_at,reason_code,reason_note) in base{
        let owner_id=if matches!(field.stage.as_str(),"session"|"premarket-plan"){Some(session)}else{candidate};
        let answer=match owner_id.as_deref(){
            Some(owner)=>read_answer(conn,&field,owner,Some(&occurred_at))?,
            None=>None,
        };
        rows.push(CustomDecisionAnswer{decision_id,owner_id,decision_type,occurred_at,reason_code,reason_note,answer});
    }
    Ok(CustomDecisionAnalysis{field,rows})
}

#[cfg(test)]
mod tests{
    use super::*;
    #[test]
    fn canonical_owner_and_as_of_answer_do_not_leak_later_or_other_owner_values(){
        let db=Connection::open_in_memory().unwrap();
        // Minimal read-side fixture for temporal and owner SQL, independent of
        // production data. Existing native integration covers canonical trades.
        db.execute_batch("
          CREATE TABLE trades(trade_id TEXT,session_id TEXT,candidate_id TEXT);
          CREATE TABLE session_reviews(review_id TEXT,session_id TEXT);
          CREATE TABLE custom_field_value_events(event_id TEXT,field_id TEXT,owner_stage TEXT,owner_id TEXT,value_type TEXT,text_value TEXT,number_value REAL,boolean_value INTEGER,date_value TEXT,recorded_at TEXT);
          CREATE TABLE custom_field_selection_snapshots(event_id TEXT,option_id TEXT,label_at_selection TEXT,ordinal INTEGER);
          INSERT INTO trades VALUES('t1','s1','z1'),('t2','s2',NULL);
          INSERT INTO session_reviews VALUES('r1','s1');
          INSERT INTO custom_field_value_events VALUES
          ('before','f','zone','z1','NUMBER',NULL,0,NULL,NULL,'2026-11-27T00:00:00Z'),
          ('later','f','zone','z1','NUMBER',NULL,9,NULL,NULL,'2026-11-27T02:00:00Z'),
          ('other','f','zone','z2','NUMBER',NULL,8,NULL,NULL,'2026-11-27T00:30:00Z'),
          ('bad','f','zone','z1','NUMBER',NULL,7,NULL,NULL,'invalid'),
          ('review','b','session-review','r1','BOOLEAN',NULL,NULL,0,NULL,'2026-11-27T03:00:00Z'),
          ('choice','c','zone','z1','SINGLE_SELECT',NULL,NULL,NULL,NULL,'2026-11-27T00:10:00Z');
          INSERT INTO custom_field_selection_snapshots VALUES('choice','opt','Old label',0);
        ").unwrap();
        let field=|id:&str,stage:&str,kind:&str|ManagedField{field_id:id.into(),stage:stage.into(),field_type:kind.into(),label:id.into(),help_text:"".into(),required:false,active:false,display_order:0};
        let f=field("f","zone","NUMBER");
        let cutoff=Some("2026-11-27T01:00:00Z");
        assert_eq!(canonical_owner(&db,"zone","t1").unwrap().as_deref(),Some("z1"));
        assert_eq!(canonical_owner(&db,"zone","t2").unwrap(),None);
        assert_eq!(canonical_owner(&db,"session-review","t1").unwrap().as_deref(),Some("r1"));
        assert_eq!(canonical_owner(&db,"session-review","t2").unwrap(),None);
        assert_eq!(read_answer(&db,&f,"z1",cutoff).unwrap().unwrap().number_value,Some(0.0));
        assert!(read_answer(&db,&f,"z1",None).unwrap().is_none());
        assert!(read_answer(&db,&f,"z1",Some("bad")).unwrap().is_none());
        assert_eq!(read_answer(&db,&field("b","session-review","BOOLEAN"),"r1",cutoff).unwrap().unwrap().boolean_value,Some(false));
        assert_eq!(read_answer(&db,&field("c","zone","SINGLE_SELECT"),"z1",cutoff).unwrap().unwrap().options[0].label_at_selection,"Old label");
    }
}
