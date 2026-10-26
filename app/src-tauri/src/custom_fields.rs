use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use crate::error::AppError;

#[derive(Deserialize)]
pub struct RecordSelectInput {
    pub event_id: String,
    pub field_id: String,
    pub owner_stage: String,
    pub owner_id: String,
    pub option_ids: Vec<String>,
}
#[derive(Serialize, PartialEq, Debug)]
pub struct SelectionSnapshot {
    pub option_id: String,
    pub label_at_selection: String,
    pub ordinal: i64,
}
fn invalid(message:&str)->AppError { AppError::Validation(message.into()) }
fn valid_key(s:&str)->bool { !s.is_empty() && s.len()<=128 && !s.chars().any(char::is_control) }

/// Creates one immutable event and its complete option snapshots in one transaction.
/// Owner existence is validated within the same transaction before event insertion.
pub fn record_select(conn:&mut Connection, input:&RecordSelectInput)->Result<(),AppError> {
    if ![&input.event_id,&input.field_id,&input.owner_stage,&input.owner_id].iter().all(|v|valid_key(v))
        || input.option_ids.is_empty() || input.option_ids.len()>100 {
        return Err(invalid("invalid selection identity or size"));
    }
    let tx=conn.transaction()?;
    let config:Option<(String,String,i64)>=tx.query_row(
        "SELECT field_type,stage,is_active FROM custom_field_definitions WHERE field_id=?1",
        [&input.field_id], |r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))
    ).optional()?;
    let (kind,stage,active)=config.ok_or_else(||invalid("unknown field"))?;
    if active!=1 || stage!=input.owner_stage || !matches!(kind.as_str(),"SINGLE_SELECT"|"MULTI_SELECT")
        || (kind=="SINGLE_SELECT"&&input.option_ids.len()!=1) {
        return Err(invalid("inactive, wrong-stage or invalid select field"));
    }
    // Fail closed: a display-stage label is not sufficient proof of real record ownership.
    // Add new stage mappings only after the corresponding canonical entity is verified.
    let owner_query = match input.owner_stage.as_str() {
        "session" | "premarket-plan" => "SELECT 1 FROM sessions WHERE session_id=?1",
        "candidate" | "zone" => "SELECT 1 FROM candidates WHERE candidate_id=?1",
        "trade" | "post-trade-review" | "execution" => "SELECT 1 FROM trades WHERE trade_id=?1",
        "session-review" => "SELECT 1 FROM session_reviews WHERE review_id=?1",
        _ => return Err(invalid("unsupported custom-field owner stage")),
    };
    let owner_exists: Option<i64> = tx.query_row(owner_query, [&input.owner_id], |r| r.get(0)).optional()?;
    if owner_exists.is_none() {
        return Err(invalid("custom-field owner does not exist"));
    }
    let mut snapshots=Vec::new();
    for (index,id) in input.option_ids.iter().enumerate() {
        if !valid_key(id) || snapshots.iter().any(|(other,_,_) : &(String,String,i64)|other==id) {
            return Err(invalid("invalid or repeated option"));
        }
        let label:Option<String>=tx.query_row(
            "SELECT label FROM custom_field_options WHERE option_id=?1 AND field_id=?2 AND is_active=1",
            params![id,input.field_id],|r|r.get(0)
        ).optional()?;
        snapshots.push((id.clone(),label.ok_or_else(||invalid("unknown or inactive option"))?,index as i64));
    }
    tx.execute("INSERT INTO custom_field_value_events(event_id,field_id,owner_stage,owner_id,value_type) VALUES(?1,?2,?3,?4,?5)",
        params![input.event_id,input.field_id,input.owner_stage,input.owner_id,kind])?;
    for (id,label,index) in snapshots {
        tx.execute("INSERT INTO custom_field_selection_snapshots(event_id,option_id,label_at_selection,ordinal) VALUES(?1,?2,?3,?4)",
            params![input.event_id,id,label,index])?;
    }
    tx.commit()?;
    Ok(())
}
pub fn read_snapshots(conn:&Connection,event_id:&str)->Result<Vec<SelectionSnapshot>,AppError>{
    if !valid_key(event_id){return Err(invalid("invalid event id"));}
    let mut stmt=conn.prepare("SELECT option_id,label_at_selection,ordinal FROM custom_field_selection_snapshots WHERE event_id=?1 ORDER BY ordinal")?;
    let rows=stmt.query_map([event_id],|r|Ok(SelectionSnapshot{option_id:r.get(0)?,label_at_selection:r.get(1)?,ordinal:r.get(2)?}))?;
    Ok(rows.collect::<Result<Vec<_>,_>>()?)
}
/// Read the latest selection for one real owner without changing historical events.
#[derive(Serialize, PartialEq, Debug)]
pub struct CurrentSelection {
    pub event_id: String,
    pub options: Vec<SelectionSnapshot>,
}
pub fn read_current_selection(conn:&Connection,owner_stage:&str,owner_id:&str,field_id:&str)->Result<Option<CurrentSelection>,AppError>{
    if ![owner_stage,owner_id,field_id].iter().all(|v|valid_key(v)) {
        return Err(invalid("invalid selection lookup key"));
    }
    let event_id:Option<String>=conn.query_row(
        "SELECT event_id FROM custom_field_value_events WHERE owner_stage=?1 AND owner_id=?2 AND field_id=?3 AND value_type IN ('SINGLE_SELECT','MULTI_SELECT') ORDER BY recorded_at DESC, rowid DESC LIMIT 1",
        params![owner_stage,owner_id,field_id],|r|r.get(0)
    ).optional()?;
    event_id.map(|id|Ok(CurrentSelection{options:read_snapshots(conn,&id)?,event_id:id})).transpose()
}


#[derive(Deserialize)]
pub struct OptionDefinitionInput {
    pub option_id: String,
    pub field_id: String,
    pub label: String,
    pub display_order: i64,
}
#[derive(Serialize, PartialEq, Debug)]
pub struct ManagedOption {
    pub option_id: String,
    pub label: String,
    pub active: bool,
    pub display_order: i64,
}
fn valid_label(label:&str)->bool {
    !label.trim().is_empty() && label.len()<=240 && !label.chars().any(char::is_control)
}
/// Explicit create; never repurpose an existing historical option ID.
pub fn create_option(conn:&mut Connection,input:&OptionDefinitionInput)->Result<(),AppError>{
    if !valid_key(&input.option_id)||!valid_key(&input.field_id)||!valid_label(&input.label)||input.display_order<0 {
        return Err(invalid("invalid option definition"));
    }
    let tx=conn.transaction()?;
    let kind:Option<(String,i64)>=tx.query_row(
        "SELECT field_type,is_active FROM custom_field_definitions WHERE field_id=?1",
        [&input.field_id],|r|Ok((r.get(0)?,r.get(1)?))
    ).optional()?;
    match kind {
        Some((kind,1)) if matches!(kind.as_str(),"SINGLE_SELECT"|"MULTI_SELECT")=>{},
        _=>return Err(invalid("options require an active select field")),
    };
    tx.execute("INSERT INTO custom_field_options(option_id,field_id,label,display_order) VALUES(?1,?2,?3,?4)",
        params![input.option_id,input.field_id,input.label.trim(),input.display_order])?;
    tx.commit()?;
    Ok(())
}
/// Rename/deactivate changes future selection only; immutable snapshots remain unchanged.
pub fn edit_option(conn:&mut Connection,field_id:&str,option_id:&str,label:&str,active:bool,order:i64)->Result<(),AppError>{
    if !valid_key(field_id)||!valid_key(option_id)||!valid_label(label)||order<0 {
        return Err(invalid("invalid option edit"));
    }
    if !active {
        let must_keep:i64=conn.query_row(
            "SELECT count(*) FROM custom_field_definitions WHERE field_id=?1 AND is_active=1 AND is_required=1",
            [field_id],|r|r.get(0)
        )?;
        let other_active:i64=conn.query_row(
            "SELECT count(*) FROM custom_field_options WHERE field_id=?1 AND option_id<>?2 AND is_active=1",
            params![field_id,option_id],|r|r.get(0)
        )?;
        if must_keep>0 && other_active==0 {
            return Err(invalid("cannot remove final active option from a required field"));
        }
    }
    let changed=conn.execute(
        "UPDATE custom_field_options SET label=?1,is_active=?2,display_order=?3 WHERE field_id=?4 AND option_id=?5",
        params![label.trim(),if active {1} else {0},order,field_id,option_id])?;
    if changed!=1 {return Err(invalid("unknown option or field"));}
    Ok(())
}
pub fn list_options(conn:&Connection,field_id:&str)->Result<Vec<ManagedOption>,AppError>{
    if !valid_key(field_id){return Err(invalid("invalid field id"));}
    let mut stmt=conn.prepare("SELECT option_id,label,is_active,display_order FROM custom_field_options WHERE field_id=?1 ORDER BY display_order,option_id")?;
    let rows=stmt.query_map([field_id],|r|Ok(ManagedOption{
        option_id:r.get(0)?,label:r.get(1)?,active:r.get::<_,i64>(2)?==1,display_order:r.get(3)?
    }))?;
    Ok(rows.collect::<Result<Vec<_>,_>>()?)
}


#[derive(Deserialize)]
pub struct CustomFieldDefinitionInput {
    pub field_id: String,
    pub stage: String,
    pub field_type: String,
    pub label: String,
    pub help_text: String,
    pub required: bool,
    pub display_order: i64,
}
#[derive(Serialize, PartialEq, Debug)]
pub struct ManagedField {
    pub field_id: String,
    pub stage: String,
    pub field_type: String,
    pub label: String,
    pub help_text: String,
    pub required: bool,
    pub active: bool,
    pub display_order: i64,
}
fn supported_stage(stage:&str)->bool {
    matches!(stage,"session"|"premarket-plan"|"candidate"|"zone"|"trade"|"post-trade-review"|"execution"|"session-review")
}
fn supported_type(kind:&str)->bool {
    matches!(kind,"TEXT"|"NUMBER"|"DATE"|"BOOLEAN"|"SINGLE_SELECT"|"MULTI_SELECT")
}
pub fn create_custom_field(conn:&mut Connection,input:&CustomFieldDefinitionInput)->Result<(),AppError>{
    if !valid_key(&input.field_id)||!supported_stage(&input.stage)||!supported_type(&input.field_type)
        || !valid_label(&input.label)||input.help_text.len()>240
        ||input.help_text.chars().any(char::is_control)||input.display_order<0 {
        return Err(invalid("invalid custom-field definition"));
    }
    let tx=conn.transaction()?;
    tx.execute("INSERT INTO custom_field_definitions(field_id,stage,field_type,label,help_text,is_required,display_order) VALUES(?1,?2,?3,?4,?5,?6,?7)",
        params![input.field_id,input.stage,input.field_type,input.label.trim(),input.help_text,if input.required {1} else {0},input.display_order])?;
    tx.commit()?;
    Ok(())
}
/// Only presentation and future use are editable: identity/stage/type and old events stay intact.
pub fn edit_custom_field(conn:&mut Connection,field_id:&str,label:&str,help_text:&str,required:bool,active:bool,order:i64)->Result<(),AppError>{
    if !valid_key(field_id)||!valid_label(label)||help_text.len()>240||help_text.chars().any(char::is_control)||order<0{
        return Err(invalid("invalid field edit"));
    }
    // A required select field must have an active choice, or Quick could never be completed.
    if required && active {
        let choice_count:i64=conn.query_row(
            "SELECT count(*) FROM custom_field_options WHERE field_id=?1 AND is_active=1",
            [field_id],|r|r.get(0)
        )?;
        let kind:String=conn.query_row("SELECT field_type FROM custom_field_definitions WHERE field_id=?1",
            [field_id],|r|r.get(0)).map_err(|_|invalid("unknown custom field"))?;
        if matches!(kind.as_str(),"SINGLE_SELECT"|"MULTI_SELECT") && choice_count==0 {
            return Err(invalid("required select field needs at least one active option"));
        }
    }
    let changed=conn.execute("UPDATE custom_field_definitions SET label=?1,help_text=?2,is_required=?3,is_active=?4,display_order=?5 WHERE field_id=?6",
        params![label.trim(),help_text,if required {1} else {0},if active {1} else {0},order,field_id])?;
    if changed!=1 {return Err(invalid("unknown custom field"));}
    Ok(())
}
pub fn list_custom_fields(conn:&Connection)->Result<Vec<ManagedField>,AppError>{
    let mut stmt=conn.prepare("SELECT field_id,stage,field_type,label,help_text,is_required,is_active,display_order FROM custom_field_definitions ORDER BY stage,display_order,field_id")?;
    let rows=stmt.query_map([],|r|Ok(ManagedField{
        field_id:r.get(0)?,stage:r.get(1)?,field_type:r.get(2)?,label:r.get(3)?,help_text:r.get(4)?,
        required:r.get::<_,i64>(5)?==1,active:r.get::<_,i64>(6)?==1,display_order:r.get(7)?
    }))?;
    Ok(rows.collect::<Result<Vec<_>,_>>()?)
}


#[derive(Deserialize)]
pub struct TypedValueInput {
    pub event_id: String,
    pub field_id: String,
    pub owner_stage: String,
    pub owner_id: String,
    pub text_value: Option<String>,
    pub number_value: Option<f64>,
    pub boolean_value: Option<bool>,
    pub date_value: Option<String>,
}
fn canonical_owner_query(stage:&str)->Option<&'static str> {
    match stage {
        "session" | "premarket-plan" => Some("SELECT 1 FROM sessions WHERE session_id=?1"),
        "candidate" | "zone" => Some("SELECT 1 FROM candidates WHERE candidate_id=?1"),
        "trade" | "post-trade-review" | "execution" => Some("SELECT 1 FROM trades WHERE trade_id=?1"),
        "session-review" => Some("SELECT 1 FROM session_reviews WHERE review_id=?1"),
        _ => None,
    }
}
fn valid_calendar_date(value:&str)->bool {
    let b=value.as_bytes();
    if b.len()!=10 || b[4]!=b'-' || b[7]!=b'-'
        || !b.iter().enumerate().all(|(i,c)|i==4||i==7||c.is_ascii_digit()) {return false;}
    let year=match value[0..4].parse::<u32>() {Ok(y)=>y,Err(_)=>return false};
    let month=match value[5..7].parse::<u32>() {Ok(m)=>m,Err(_)=>return false};
    let day=match value[8..10].parse::<u32>() {Ok(d)=>d,Err(_)=>return false};
    if year==0 || !(1..=12).contains(&month) {return false;}
    let leap=year%4==0 && (year%100!=0 || year%400==0);
    let max_day=match month {2=>if leap {29} else {28},4|6|9|11=>30,_=>31};
    (1..=max_day).contains(&day)
}
#[derive(Serialize,PartialEq,Debug)]
pub struct CurrentTypedValue {
    pub event_id:String,
    pub value_type:String,
    pub text_value:Option<String>,
    pub number_value:Option<f64>,
    pub boolean_value:Option<bool>,
    pub date_value:Option<String>,
}
pub fn read_current_typed_value(conn:&Connection,owner_stage:&str,owner_id:&str,field_id:&str)->Result<Option<CurrentTypedValue>,AppError>{
    if ![owner_stage,owner_id,field_id].iter().all(|v|valid_key(v)) {return Err(invalid("invalid typed lookup key"));}
    let found=conn.query_row(
        "SELECT event_id,value_type,text_value,number_value,boolean_value,date_value FROM custom_field_value_events WHERE owner_stage=?1 AND owner_id=?2 AND field_id=?3 AND value_type IN ('TEXT','NUMBER','BOOLEAN','DATE') ORDER BY recorded_at DESC,rowid DESC LIMIT 1",
        params![owner_stage,owner_id,field_id],|r|Ok(CurrentTypedValue{
            event_id:r.get(0)?,value_type:r.get(1)?,text_value:r.get(2)?,
            number_value:r.get(3)?,boolean_value:r.get::<_,Option<i64>>(4)?.map(|v|v==1),date_value:r.get(5)?
        })
    ).optional()?;
    Ok(found)
}
pub fn record_typed_value(conn:&mut Connection,input:&TypedValueInput)->Result<(),AppError>{
    if ![&input.event_id,&input.field_id,&input.owner_stage,&input.owner_id].iter().all(|v|valid_key(v)) {
        return Err(invalid("invalid value identity"));
    }
    let tx=conn.transaction()?;
    let config:Option<(String,String,i64)>=tx.query_row(
        "SELECT field_type,stage,is_active FROM custom_field_definitions WHERE field_id=?1",
        [&input.field_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))
    ).optional()?;
    let (kind,stage,active)=config.ok_or_else(||invalid("unknown custom field"))?;
    if active!=1 || stage!=input.owner_stage || !matches!(kind.as_str(),"TEXT"|"NUMBER"|"DATE"|"BOOLEAN"){
        return Err(invalid("inactive, wrong-stage or unsupported typed field"));
    }
    let owner_sql=canonical_owner_query(&input.owner_stage).ok_or_else(||invalid("unsupported owner stage"))?;
    let owner:Option<i64>=tx.query_row(owner_sql,[&input.owner_id],|r|r.get(0)).optional()?;
    if owner.is_none(){return Err(invalid("custom-field owner does not exist"));}
    let text_value=if kind=="TEXT" {input.text_value.as_deref()} else {None};
    let number_value=if kind=="NUMBER" {input.number_value} else {None};
    let boolean_value=if kind=="BOOLEAN" {input.boolean_value.map(i64::from)} else {None};
    let date_value=if kind=="DATE" {input.date_value.as_deref()} else {None};
    let count=[input.text_value.is_some(),input.number_value.is_some(),input.boolean_value.is_some(),input.date_value.is_some()]
        .iter().filter(|v|**v).count();
    if count!=1 || (kind=="TEXT" && text_value.map_or(true,|v|v.len()>4000 || v.chars().any(char::is_control)))
        || (kind=="NUMBER" && number_value.map_or(true,|v|!v.is_finite()))
        || (kind=="BOOLEAN" && boolean_value.is_none())
        || (kind=="DATE" && date_value.map_or(true,|v|!valid_calendar_date(v))) {
        return Err(invalid("invalid or mismatched typed value"));
    }
    tx.execute("INSERT INTO custom_field_value_events(event_id,field_id,owner_stage,owner_id,value_type,text_value,number_value,boolean_value,date_value) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        params![input.event_id,input.field_id,input.owner_stage,input.owner_id,kind,text_value,number_value,boolean_value,date_value])?;
    tx.commit()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn required_select_cannot_be_left_without_active_choices() {
        let mut c=Connection::open_in_memory().unwrap();
        crate::db::migrate(&c).unwrap();
        create_custom_field(&mut c,&CustomFieldDefinitionInput{
            field_id:"required-context".into(),stage:"session".into(),field_type:"SINGLE_SELECT".into(),
            label:"Context".into(),help_text:"".into(),required:false,display_order:0
        }).unwrap();
        assert!(edit_custom_field(&mut c,"required-context","Context","",true,true,0).is_err());
        create_option(&mut c,&OptionDefinitionInput{
            option_id:"choice".into(),field_id:"required-context".into(),label:"One".into(),display_order:0
        }).unwrap();
        edit_custom_field(&mut c,"required-context","Context","",true,true,0).unwrap();
        assert!(edit_option(&mut c,"required-context","choice","One",false,0).is_err());
        assert!(list_options(&c,"required-context").unwrap()[0].active);
    }
    #[test]
    fn custom_field_end_to_end_runs_on_disposable_database_only() {
        let mut c=Connection::open_in_memory().unwrap();
        crate::db::migrate(&c).unwrap();
        c.execute("INSERT INTO workspaces(workspace_id,name,created_at) VALUES('demo-w','DEMO','2026-10-16')",[]).unwrap();
        c.execute("INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value) VALUES('demo-i','demo-w','ES',0.25,50)",[]).unwrap();
        c.execute("INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at) VALUES('demo-s','demo-w','demo-i','2026-10-16','DEMO','2026-10-16','DRAFT','2026-10-16','2026-10-16')",[]).unwrap();
        create_custom_field(&mut c,&CustomFieldDefinitionInput {
            field_id:"market-context".into(),stage:"session".into(),field_type:"SINGLE_SELECT".into(),
            label:"Market context".into(),help_text:"Only at session stage".into(),required:false,display_order:0
        }).unwrap();
        create_option(&mut c,&OptionDefinitionInput{
            option_id:"trend".into(),field_id:"market-context".into(),label:"Trending".into(),display_order:0
        }).unwrap();
        record_select(&mut c,&RecordSelectInput{
            event_id:"event-a".into(),field_id:"market-context".into(),owner_stage:"session".into(),
            owner_id:"demo-s".into(),option_ids:vec!["trend".into()]
        }).unwrap();
        edit_option(&mut c,"market-context","trend","Directional",false,1).unwrap();
        let before=read_current_selection(&c,"session","demo-s","market-context").unwrap().unwrap();
        assert_eq!(before.options[0].label_at_selection,"Trending");
        assert!(record_select(&mut c,&RecordSelectInput{
            event_id:"event-b".into(),field_id:"market-context".into(),owner_stage:"session".into(),
            owner_id:"demo-s".into(),option_ids:vec!["trend".into()]
        }).is_err());
        edit_custom_field(&mut c,"market-context","Context", "Preserve history",false,false,0).unwrap();
        assert_eq!(read_current_selection(&c,"session","demo-s","market-context").unwrap().unwrap(),before);
        assert_eq!(crate::db::integrity_check(&c).unwrap(),"ok");
        assert_eq!(crate::db::foreign_key_violation_count(&c).unwrap(),0);
    }
    #[test]
    fn typed_values_preserve_owner_integrity_and_reject_malformed_numbers() {
        let mut c=Connection::open_in_memory().unwrap();
        crate::db::migrate(&c).unwrap();
        c.execute("INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w1','Demo','2026-10-15')",[]).unwrap();
        c.execute("INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value) VALUES('i1','w1','ES',0.25,50)",[]).unwrap();
        c.execute("INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at) VALUES('s1','w1','i1','2026-10-15','DEMO','2026-10-15','DRAFT','2026-10-15','2026-10-15')",[]).unwrap();
        c.execute("INSERT INTO custom_field_definitions(field_id,stage,field_type,label) VALUES('score','session','NUMBER','Score')",[]).unwrap();
        let mut input=TypedValueInput{event_id:"v1".into(),field_id:"score".into(),owner_stage:"session".into(),owner_id:"s1".into(),text_value:None,number_value:Some(1.5),boolean_value:None,date_value:None};
        record_typed_value(&mut c,&input).unwrap();
        input.event_id="v2".into();
        input.number_value=Some(f64::NAN);
        assert!(record_typed_value(&mut c,&input).is_err());
        input.number_value=Some(4.0);
        input.owner_id="missing".into();
        assert!(record_typed_value(&mut c,&input).is_err());
        let value:f64=c.query_row("SELECT number_value FROM custom_field_value_events WHERE event_id='v1'",[],|r|r.get(0)).unwrap();
        assert_eq!(value,1.5);
        let current=read_current_typed_value(&c,"session","s1","score").unwrap().unwrap();
        assert_eq!(current.number_value,Some(1.5));
        assert_eq!(current.event_id,"v1");
        assert!(read_current_typed_value(&c,"session","missing","score").unwrap().is_none());
        assert!(valid_calendar_date("2024-02-29"));
        assert!(!valid_calendar_date("2025-02-29"));
        assert!(!valid_calendar_date("2026-13-01"));
        assert!(!valid_calendar_date("2026-04-31"));

        let count:i64=c.query_row("SELECT count(*) FROM custom_field_value_events",[],|r|r.get(0)).unwrap();
        assert_eq!(count,1);
    }
    #[test]
    fn custom_field_definition_manager_guards_type_and_preserves_identity() {
        let mut c=Connection::open_in_memory().unwrap();
        crate::db::migrate(&c).unwrap();
        let input=CustomFieldDefinitionInput{
            field_id:"context".into(),stage:"session".into(),field_type:"SINGLE_SELECT".into(),
            label:"Context".into(),help_text:"Select context".into(),required:false,display_order:2
        };
        create_custom_field(&mut c,&input).unwrap();
        assert!(create_custom_field(&mut c,&input).is_err());
        assert_eq!(list_custom_fields(&c).unwrap()[0].field_type,"SINGLE_SELECT");
        edit_custom_field(&mut c,"context","Market context","Short help",true,false,1).unwrap();
        let field=&list_custom_fields(&c).unwrap()[0];
        assert_eq!(field.field_id,"context");
        assert_eq!(field.stage,"session");
        assert!(!field.active);
        assert!(field.required);
        let bad=CustomFieldDefinitionInput{field_id:"bad".into(),stage:"unknown".into(),..input};
        assert!(create_custom_field(&mut c,&bad).is_err());
    }
    #[test]
    fn option_manager_preserves_historic_labels_and_rejects_invalid_fields() {
        let mut c=Connection::open_in_memory().unwrap();
        crate::db::migrate(&c).unwrap();
        c.execute("INSERT INTO custom_field_definitions(field_id,stage,field_type,label) VALUES('state','session','SINGLE_SELECT','State')",[]).unwrap();
        let create=OptionDefinitionInput{option_id:"o1".into(),field_id:"state".into(),label:"Original".into(),display_order:0};
        create_option(&mut c,&create).unwrap();
        assert!(create_option(&mut c,&create).is_err());
        assert_eq!(list_options(&c,"state").unwrap()[0].label,"Original");
        c.execute("INSERT INTO custom_field_value_events(event_id,field_id,owner_stage,owner_id,value_type) VALUES('e1','state','session','historical','SINGLE_SELECT')",[]).unwrap();
        c.execute("INSERT INTO custom_field_selection_snapshots(event_id,option_id,label_at_selection,ordinal) VALUES('e1','o1','Original',0)",[]).unwrap();
        edit_option(&mut c,"state","o1","Renamed",false,1).unwrap();
        assert!(!list_options(&c,"state").unwrap()[0].active);
        assert_eq!(list_options(&c,"state").unwrap()[0].label,"Renamed");
        assert_eq!(read_snapshots(&c,"e1").unwrap()[0].label_at_selection,"Original");
        assert!(edit_option(&mut c,"wrong","o1","Wrong",true,0).is_err());
        assert_eq!(crate::db::foreign_key_violation_count(&c).unwrap(),0);
    }
    #[test]
    fn transactional_selection_retains_label_and_rejects_wrong_stage_and_inactive_options(){
        let mut c=Connection::open_in_memory().unwrap();
        crate::db::migrate(&c).unwrap();
        c.execute("INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w1','Demo','2026-10-15')",[]).unwrap();
        c.execute("INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value) VALUES('i1','w1','ES',0.25,50)",[]).unwrap();
        c.execute("INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at) VALUES('s1','w1','i1','2026-10-15','DEMO','2026-10-15','DRAFT','2026-10-15','2026-10-15')",[]).unwrap();
        c.execute("INSERT INTO session_reviews(review_id,session_id,created_at) VALUES('demo1','s1','2026-10-15')",[]).unwrap();
        c.execute("INSERT INTO custom_field_definitions(field_id,stage,field_type,label) VALUES('context','session-review','SINGLE_SELECT','Context')",[]).unwrap();
        c.execute("INSERT INTO custom_field_options(option_id,field_id,label) VALUES('trending','context','Trending')",[]).unwrap();
        let mut input=RecordSelectInput{event_id:"evt1".into(),field_id:"context".into(),owner_stage:"session-review".into(),owner_id:"demo1".into(),option_ids:vec!["trending".into()]};
        input.owner_id="missing-owner".into();
        assert!(record_select(&mut c,&input).is_err());
        input.owner_id="demo1".into();
        input.owner_stage="unknown-future-stage".into();
        assert!(record_select(&mut c,&input).is_err());
        input.owner_stage="session-review".into();
        input.owner_id="s1".into(); // Real Session ID, but not a Session Review ID.
        assert!(record_select(&mut c,&input).is_err());
        input.owner_id="demo1".into();
        record_select(&mut c,&input).unwrap();
        c.execute("UPDATE custom_field_options SET label='Directional',is_active=0 WHERE option_id='trending'",[]).unwrap();
        assert_eq!(read_snapshots(&c,"evt1").unwrap()[0].label_at_selection,"Trending");
        let current=read_current_selection(&c,"session-review","demo1","context").unwrap().unwrap();
        assert_eq!(current.event_id,"evt1");
        assert_eq!(current.options[0].label_at_selection,"Trending");
        assert!(read_current_selection(&c,"session-review","missing-owner","context").unwrap().is_none());

        input.event_id="evt2".into();
        assert!(record_select(&mut c,&input).is_err());
        input.owner_stage="execution".into();
        assert!(record_select(&mut c,&input).is_err());
        // A failed selection must never create a partial event or snapshots.
        input.event_id="evt3".into();
        input.owner_stage="session-review".into();
        input.owner_id="demo1".into();
        input.option_ids=vec!["trending".into(),"trending".into()];
        assert!(record_select(&mut c,&input).is_err());
        input.option_ids=vec!["unknown-option".into()];
        assert!(record_select(&mut c,&input).is_err());
        let orphan_count:i64=c.query_row("SELECT count(*) FROM custom_field_selection_snapshots WHERE event_id='evt3'",[],|r|r.get(0)).unwrap();
        assert_eq!(orphan_count,0);
        assert_eq!(crate::db::foreign_key_violation_count(&c).unwrap(),0);
        let count:i64=c.query_row("SELECT count(*) FROM custom_field_value_events",[],|r|r.get(0)).unwrap();
        assert_eq!(count,1);
    }
}
