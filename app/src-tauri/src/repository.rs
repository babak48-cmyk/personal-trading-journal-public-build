use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionSummary {
    pub session_id: String,
    pub session_date: String,
    pub instrument_symbol: String,
    pub instrument_display_name: Option<String>,
    pub instrument_tick_size: f64,
    pub instrument_point_value: f64,
    pub instrument_currency: String,
    pub environment: String,
    pub status: String,
    pub opened_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateSessionInput {
    pub session_date: String,
    pub instrument_symbol: String,
    pub environment: String,
    pub session_label: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDraftSessionInput {
    pub session_id: String,
    pub session_date: String,
    pub instrument_symbol: String,
    pub environment: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct InstrumentDto {
    pub instrument_id: String,
    pub symbol: String,
    pub display_name: Option<String>,
    pub tick_size: f64,
    pub point_value: f64,
    pub currency: String,
    pub market_type: Option<String>,
    pub active: bool,
    pub user_defined: bool,
    pub display_order: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateInstrumentInput {
    pub symbol: String,
    pub display_name: Option<String>,
    pub tick_size: f64,
    pub point_value: f64,
    pub currency: Option<String>,
    pub market_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInstrumentInput {
    pub instrument_id: String,
    pub symbol: String,
    pub display_name: Option<String>,
    pub tick_size: f64,
    pub point_value: f64,
    pub currency: String,
    pub market_type: Option<String>,
    pub active: bool,
    pub display_order: i64,
}

#[derive(Debug, Deserialize)]
pub struct ReorderInstrumentsInput {
    pub instrument_ids: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct LevelSourceTypeDto {
    pub source_type_id: String,
    pub code: String,
    pub label: String,
    pub source_group: String,
    pub active: bool,
    pub user_defined: bool,
    pub description: Option<String>,
    pub display_order: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateLevelSourceInput {
    pub label: String,
    pub source_group: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateLevelSourceInput {
    pub source_type_id: String,
    pub label: String,
    pub source_group: String,
    pub description: Option<String>,
    pub active: bool,
    pub display_order: i64,
}

#[derive(Debug, Deserialize)]
pub struct ReorderLevelSourcesInput {
    pub source_type_ids: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct EvidenceTypeDto {
    pub evidence_type_id: String,
    pub code: String,
    pub label: String,
    pub family: String,
    pub research_status: String,
}

#[derive(Debug, Deserialize)]
pub struct EvidenceObservationInput {
    pub session_id: String,
    pub candidate_id: Option<String>,
    pub evidence_type_id: String,
    pub role: String,
    pub direction: Option<String>,
    pub price: Option<f64>,
    pub numeric_value: Option<f64>,
    pub strength: Option<f64>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EvidenceObservationDto {
    pub evidence_id: String,
    pub occurred_at: String,
    pub candidate_id: Option<String>,
    pub evidence_type_id: String,
    pub evidence_label: String,
    pub role: String,
    pub direction: Option<String>,
    pub price: Option<f64>,
    pub numeric_value: Option<f64>,
    pub strength: Option<f64>,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CandidateSourceInput {
    pub source_type_id: String,
    pub is_primary: Option<bool>,
    pub source_price: Option<f64>,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CandidateDraftInput {
    pub label: Option<String>,
    pub directional_intent: String,
    pub trend_relationship: Option<String>,
    pub price_mode: String,
    pub price_from: Option<f64>,
    pub price_to: Option<f64>,
    pub reference_price: Option<f64>,
    pub identified_when: String,
    pub required_conditions: Vec<String>,
    pub invalidation_conditions: Vec<String>,
    pub notes: Option<String>,
    pub sources: Vec<CandidateSourceInput>,
}

#[derive(Debug, Deserialize)]
pub struct ConfirmInitialPlanInput {
    pub session_id: String,
    pub initial_bias: String,
    pub market_posture: Option<String>,
    pub main_scenario: Option<String>,
    pub alternative_scenario: Option<String>,
    pub expected_context: Vec<String>,
    pub scenario_invalidation: Option<String>,
    pub things_not_to_do: Vec<String>,
    pub max_daily_risk: Option<f64>,
    pub max_daily_risk_unit: Option<String>,
    pub max_trades: Option<i64>,
    pub pre_session_state: Option<String>,
    pub pre_session_state_intensity: Option<i64>,
    pub candidates: Vec<CandidateDraftInput>,
}

#[derive(Debug, Serialize)]
pub struct ConfirmPlanResult {
    pub revision_id: String,
    pub candidate_ids: Vec<String>,
    pub session_status: String,
}

#[derive(Debug, Serialize)]
pub struct CandidateCurrentDto {
    pub candidate_id: String,
    pub label: Option<String>,
    pub directional_intent: String,
    pub trend_relationship: Option<String>,
    pub price_mode: String,
    pub price_from: Option<f64>,
    pub price_to: Option<f64>,
    pub reference_price: Option<f64>,
    pub required_conditions: Vec<String>,
    pub invalidation_conditions: Vec<String>,
    pub notes: Option<String>,
    pub current_status: String,
    pub sources: Vec<String>,
    pub source_type_ids: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct CurrentPlanDto {
    pub session_id: String,
    pub revision_id: String,
    pub revision_number: i64,
    pub created_at: String,
    pub initial_bias: String,
    pub market_posture: Option<String>,
    pub main_scenario: Option<String>,
    pub alternative_scenario: Option<String>,
    pub candidates: Vec<CandidateCurrentDto>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePlanRevisionInput {
    pub session_id: String,
    pub initial_bias: Option<String>,
    pub market_posture: Option<String>,
    pub main_scenario: Option<String>,
    pub alternative_scenario: Option<String>,
    pub why_changed: String,
    pub change_type: String,
    pub new_evidence_summary: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReviseCandidateInput {
    pub candidate_id: String,
    pub directional_intent: String,
    pub trend_relationship: Option<String>,
    pub price_mode: String,
    pub price_from: Option<f64>,
    pub price_to: Option<f64>,
    pub reference_price: Option<f64>,
    pub required_conditions: Vec<String>,
    pub invalidation_conditions: Vec<String>,
    pub notes: Option<String>,
    pub change_type: String,
    pub change_reason: String,
    pub sources: Vec<CandidateSourceInput>,
}

#[derive(Debug, Deserialize)]
pub struct AddCandidateStatusInput {
    pub candidate_id: String,
    pub status: String,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddLiveCandidateInput {
    pub session_id: String,
    pub why_changed: String,
    pub new_evidence_summary: Option<String>,
    pub candidate: CandidateDraftInput,
}

#[derive(Debug, Serialize)]
pub struct AddLiveCandidateResult {
    pub plan_revision_id: String,
    pub candidate_id: String,
}

#[derive(Debug, Serialize)]
pub struct PlanConsistencyDto {
    pub active_candidate_count: i64,
    pub cancelled_candidate_count: i64,
    pub warning_codes: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct TimelineEventDto {
    pub occurred_at: String,
    pub event_type: String,
    pub title: String,
    pub detail: Option<String>,
    pub revision_number: Option<i64>,
    pub candidate_id: Option<String>,
}

pub fn ensure_default_workspace(conn: &Connection) -> Result<String, AppError> {
    let workspace_id = "default-workspace".to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT OR IGNORE INTO workspaces(workspace_id,name,created_at) VALUES(?1,'Personal Trading Journal',?2)",
        params![workspace_id, now],
    )?;
    seed_default_instruments(conn, &workspace_id)?;
    seed_level_sources(conn, &workspace_id)?;
    seed_evidence_types(conn, &workspace_id)?;
    Ok(workspace_id)
}

fn seed_default_instruments(conn: &Connection, workspace_id: &str) -> Result<(), AppError> {
    let items = [
        ("instrument-ES","ES","E-mini S&P 500",0.25,50.0,"USD","FUTURES",1_i64),
        ("instrument-GC","GC","Gold Futures",0.10,100.0,"USD","FUTURES",2_i64),
    ];
    for (id,symbol,name,tick,point,currency,market_type,order) in items {
        conn.execute(
            "INSERT OR IGNORE INTO instruments(instrument_id,workspace_id,symbol,display_name,tick_size,point_value,currency,active,market_type,display_order,user_defined) VALUES(?1,?2,?3,?4,?5,?6,?7,1,?8,?9,0)",
            params![id,workspace_id,symbol,name,tick,point,currency,market_type,order],
        )?;
    }
    Ok(())
}

fn seed_level_sources(conn: &Connection, workspace_id: &str) -> Result<(), AppError> {
    let items = [
        ("PRIOR_DAY_HIGH","Prior Day High","PRICE_AUCTION"),("PRIOR_DAY_LOW","Prior Day Low","PRICE_AUCTION"),
        ("VAH","Value Area High","PRICE_AUCTION"),("VAL","Value Area Low","PRICE_AUCTION"),("POC","POC","PRICE_AUCTION"),
        ("IB_HIGH","IB High","PRICE_AUCTION"),("IB_LOW","IB Low","PRICE_AUCTION"),("HOURLY_POC","Hourly POC","PRICE_AUCTION"),
        ("P2","P2","STRUCTURE"),("P3","P3","STRUCTURE"),("PREVIOUS_HIGH","Previous High","STRUCTURE"),
        ("PREVIOUS_LOW","Previous Low","STRUCTURE"),("PREVIOUS_REACTION","Previous Reaction","STRUCTURE"),
        ("PREVIOUSLY_MARKED","Previously Marked Level","STRUCTURE"),("BIG_TRADE_LEVEL","Big Trade Level","VOLUME"),
        ("TRADE_SIZE_LEVEL","Trade Size Level","VOLUME"),("EXTREME_VOLUME","Extreme / Large Volume","VOLUME"),
        ("ATS_DERIVED","ATS-derived Level","VOLUME"),("ICEBERG","Iceberg","ORDER_BOOK"),
        ("LARGE_RESTING_LIQUIDITY","Large Resting Liquidity","ORDER_BOOK"),("PENDING_LIQUIDITY","Pending Liquidity Concentration","ORDER_BOOK"),
        ("DOM_DEPTH","DOM Depth Concentration","ORDER_BOOK"),("REPLENISHMENT","Reload / Replenishment","ORDER_BOOK"),
        ("PERSISTENT_LIQUIDITY","Persistent Liquidity","HEATMAP"),("LIQUIDITY_WALL","Liquidity Wall","HEATMAP"),
        ("HEATMAP_CLUSTER","Heatmap Cluster","HEATMAP"),("MANUAL","Manual Level","MANUAL"),("OTHER","Other","OTHER")
    ];
    for (code,label,group) in items {
        let id = format!("source-{code}");
        conn.execute(
            "INSERT OR IGNORE INTO level_source_types(source_type_id,workspace_id,code,label,source_group,active,user_defined) VALUES(?1,?2,?3,?4,?5,1,0)",
            params![id, workspace_id, code, label, group],
        )?;
    }
    Ok(())
}

fn seed_evidence_types(conn: &Connection, workspace_id: &str) -> Result<(), AppError> {
    let items = [
        ("BIG_TRADE","Big Trade","EXECUTED_FLOW"),("TRADE_SIZE","Trade Size","EXECUTED_FLOW"),
        ("ATS","ATS","EXECUTED_FLOW"),("ABSORPTION","Absorption","EXECUTED_FLOW"),
        ("DELTA_BEHAVIOUR","Delta Behaviour","EXECUTED_FLOW"),("EXTREME_VOLUME","Extreme / Large Volume","EXECUTED_FLOW"),
        ("DOM_PRESSURE","DOM Pressure","ORDER_BOOK"),("ICEBERG","Iceberg","ORDER_BOOK"),
        ("REPLENISHMENT","Reload / Replenishment","ORDER_BOOK"),("LARGE_RESTING_LIQUIDITY","Large Resting Liquidity","ORDER_BOOK"),
        ("HEATMAP_LIQUIDITY","Heatmap Liquidity","HEATMAP"),("PRICE_REJECTION","Price Rejection","PRICE_ACTION"),
        ("FISHING","Fishing","PRICE_ACTION"),("OTHER","Other","OTHER")
    ];
    for (code,label,family) in items {
        let id = format!("evidence-{code}");
        conn.execute(
            "INSERT OR IGNORE INTO evidence_types(evidence_type_id,workspace_id,code,label,family,active,research_status,user_defined) VALUES(?1,?2,?3,?4,?5,1,'EXPERIMENTAL',0)",
            params![id, workspace_id, code, label, family],
        )?;
    }
    Ok(())
}

fn instrument_from_row(r: &rusqlite::Row<'_>) -> rusqlite::Result<InstrumentDto> {
    Ok(InstrumentDto {
        instrument_id:r.get(0)?,
        symbol:r.get(1)?,
        display_name:r.get(2)?,
        tick_size:r.get(3)?,
        point_value:r.get(4)?,
        currency:r.get(5)?,
        market_type:r.get(6)?,
        active:r.get::<_,i64>(7)? != 0,
        user_defined:r.get::<_,i64>(8)? != 0,
        display_order:r.get(9)?,
    })
}

fn validate_instrument_values(symbol:&str,tick_size:f64,point_value:f64,currency:&str)->Result<(),AppError>{
    if symbol.trim().is_empty(){return Err(AppError::Validation("instrument symbol is required".into()));}
    if tick_size<=0.0||!tick_size.is_finite(){return Err(AppError::Validation("tick size must be positive".into()));}
    if point_value<=0.0||!point_value.is_finite(){return Err(AppError::Validation("point value must be positive".into()));}
    if currency.trim().is_empty(){return Err(AppError::Validation("currency is required".into()));}
    Ok(())
}

fn query_instruments(conn:&Connection,active_only:bool)->Result<Vec<InstrumentDto>,AppError>{
    let workspace_id=ensure_default_workspace(conn)?;
    let sql=if active_only {
        "SELECT instrument_id,symbol,display_name,tick_size,point_value,currency,market_type,active,user_defined,display_order FROM instruments WHERE workspace_id=?1 AND active=1 ORDER BY display_order,symbol"
    } else {
        "SELECT instrument_id,symbol,display_name,tick_size,point_value,currency,market_type,active,user_defined,display_order FROM instruments WHERE workspace_id=?1 ORDER BY display_order,symbol"
    };
    let mut stmt=conn.prepare(sql)?;
    let rows=stmt.query_map([workspace_id],instrument_from_row)?;
    Ok(rows.collect::<Result<Vec<_>,_>>()?)
}

pub fn list_instruments(conn:&Connection)->Result<Vec<InstrumentDto>,AppError>{query_instruments(conn,true)}
pub fn list_all_instruments(conn:&Connection)->Result<Vec<InstrumentDto>,AppError>{query_instruments(conn,false)}

fn active_instrument_by_symbol(conn:&Connection,workspace_id:&str,symbol:&str)->Result<InstrumentDto,AppError>{
    conn.query_row(
        "SELECT instrument_id,symbol,display_name,tick_size,point_value,currency,market_type,active,user_defined,display_order FROM instruments WHERE workspace_id=?1 AND symbol=?2 AND active=1",
        params![workspace_id,symbol],
        instrument_from_row
    ).map_err(|_|AppError::Validation(format!("unknown or inactive instrument: {symbol}")))
}

pub fn create_instrument(conn:&Connection,input:CreateInstrumentInput)->Result<InstrumentDto,AppError>{
    let workspace_id=ensure_default_workspace(conn)?;
    let symbol=input.symbol.trim().to_uppercase();
    let currency=input.currency.unwrap_or_else(||"USD".into()).trim().to_uppercase();
    validate_instrument_values(&symbol,input.tick_size,input.point_value,&currency)?;
    let id=format!("instrument-user-{}",Uuid::new_v4());
    let next_order:i64=conn.query_row("SELECT COALESCE(MAX(display_order),0)+1 FROM instruments WHERE workspace_id=?1",[&workspace_id],|r|r.get(0))?;
    conn.execute(
        "INSERT INTO instruments(instrument_id,workspace_id,symbol,display_name,tick_size,point_value,currency,active,market_type,display_order,user_defined) VALUES(?1,?2,?3,?4,?5,?6,?7,1,?8,?9,1)",
        params![id,workspace_id,symbol,input.display_name,input.tick_size,input.point_value,currency,input.market_type,next_order],
    ).map_err(|e|if e.to_string().contains("UNIQUE"){AppError::Validation("instrument symbol already exists".into())}else{AppError::from(e)})?;
    query_instruments(conn,false)?.into_iter().find(|x|x.instrument_id==id).ok_or_else(||AppError::Validation("instrument was not created".into()))
}

pub fn update_instrument(conn:&Connection,input:UpdateInstrumentInput)->Result<InstrumentDto,AppError>{
    let symbol=input.symbol.trim().to_uppercase();
    let currency=input.currency.trim().to_uppercase();
    validate_instrument_values(&symbol,input.tick_size,input.point_value,&currency)?;
    let exists:i64=conn.query_row("SELECT COUNT(*) FROM instruments WHERE instrument_id=?1",[&input.instrument_id],|r|r.get(0))?;
    if exists==0{return Err(AppError::Validation("instrument does not exist".into()));}
    conn.execute(
        "UPDATE instruments SET symbol=?1,display_name=?2,tick_size=?3,point_value=?4,currency=?5,market_type=?6,active=?7,display_order=?8 WHERE instrument_id=?9",
        params![symbol,input.display_name,input.tick_size,input.point_value,currency,input.market_type,if input.active{1}else{0},input.display_order,input.instrument_id],
    ).map_err(|e|if e.to_string().contains("UNIQUE"){AppError::Validation("instrument symbol already exists".into())}else{AppError::from(e)})?;
    query_instruments(conn,false)?.into_iter().find(|x|x.instrument_id==input.instrument_id).ok_or_else(||AppError::Validation("instrument update could not be read back".into()))
}

pub fn reorder_instruments(conn:&mut Connection,input:ReorderInstrumentsInput)->Result<Vec<InstrumentDto>,AppError>{
    if input.instrument_ids.is_empty(){return query_instruments(conn,false);}
    let workspace_id=ensure_default_workspace(conn)?;
    let count:i64=conn.query_row("SELECT COUNT(*) FROM instruments WHERE workspace_id=?1",[&workspace_id],|r|r.get(0))?;
    if count as usize != input.instrument_ids.len(){return Err(AppError::Validation("reorder list must include every instrument".into()));}
    let tx=conn.transaction()?;
    for (index,id) in input.instrument_ids.iter().enumerate(){
        let changed=tx.execute("UPDATE instruments SET display_order=?1 WHERE workspace_id=?2 AND instrument_id=?3",params![(index as i64)+1,workspace_id,id])?;
        if changed!=1{return Err(AppError::Validation("reorder contains an unknown instrument".into()));}
    }
    tx.commit()?;
    query_instruments(conn,false)
}

pub fn create_draft_session(conn: &Connection, input: CreateSessionInput) -> Result<SessionSummary, AppError> {
    if !matches!(input.environment.as_str(), "REAL" | "DEMO" | "FORWARD_TEST") {
        return Err(AppError::Validation("invalid environment".into()));
    }
    let workspace_id = ensure_default_workspace(conn)?;
    let instrument = active_instrument_by_symbol(conn,&workspace_id,&input.instrument_symbol)?;
    let session_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,session_label,opened_at,status,timezone_id,schema_version,created_at,updated_at,instrument_symbol_snapshot,instrument_display_name_snapshot,instrument_tick_size_snapshot,instrument_point_value_snapshot,instrument_currency_snapshot) VALUES(?1,?2,?3,?4,?5,?6,?7,'DRAFT','Australia/Sydney',1,?7,?7,?8,?9,?10,?11,?12)",
        params![session_id,workspace_id,instrument.instrument_id,input.session_date,input.environment,input.session_label,now,instrument.symbol,instrument.display_name,instrument.tick_size,instrument.point_value,instrument.currency],
    )?;
    Ok(SessionSummary {session_id,session_date:input.session_date,instrument_symbol:instrument.symbol,instrument_display_name:instrument.display_name,instrument_tick_size:instrument.tick_size,instrument_point_value:instrument.point_value,instrument_currency:instrument.currency,environment:input.environment,status:"DRAFT".into(),opened_at:now})
}

pub fn update_draft_session(conn: &Connection, input: UpdateDraftSessionInput) -> Result<SessionSummary, AppError> {
    if !matches!(input.environment.as_str(), "REAL" | "DEMO" | "FORWARD_TEST") {
        return Err(AppError::Validation("invalid environment".into()));
    }
    let (status, opened_at): (String, String) = conn.query_row(
        "SELECT status,opened_at FROM sessions WHERE session_id=?1",
        [&input.session_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|_| AppError::Validation("draft session does not exist".into()))?;
    if status != "DRAFT" {
        return Err(AppError::Validation("session setup can only be edited while the session is DRAFT".into()));
    }
    let plan_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM session_plan_revisions WHERE session_id=?1",
        [&input.session_id],
        |r| r.get(0),
    )?;
    if plan_count != 0 {
        return Err(AppError::Validation("session setup cannot be edited after the initial plan is confirmed".into()));
    }
    let workspace_id = ensure_default_workspace(conn)?;
    let instrument=active_instrument_by_symbol(conn,&workspace_id,&input.instrument_symbol)?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE sessions SET instrument_id=?1,session_date=?2,environment=?3,updated_at=?4,instrument_symbol_snapshot=?5,instrument_display_name_snapshot=?6,instrument_tick_size_snapshot=?7,instrument_point_value_snapshot=?8,instrument_currency_snapshot=?9 WHERE session_id=?10 AND status='DRAFT'",
        params![instrument.instrument_id,input.session_date,input.environment,now,instrument.symbol,instrument.display_name,instrument.tick_size,instrument.point_value,instrument.currency,input.session_id],
    )?;
    Ok(SessionSummary {session_id:input.session_id,session_date:input.session_date,instrument_symbol:instrument.symbol,instrument_display_name:instrument.display_name,instrument_tick_size:instrument.tick_size,instrument_point_value:instrument.point_value,instrument_currency:instrument.currency,environment:input.environment,status,opened_at})
}

/// Pre-confirm UI draft is stored outside immutable plan revision tables.
/// Using app_settings avoids migrating historical session records and remains included in backups.
pub fn save_initial_plan_draft(conn: &Connection, session_id: &str, json: &str) -> Result<(), AppError> {
    let status: String = conn.query_row("SELECT status FROM sessions WHERE session_id=?1", [session_id], |r| r.get(0))
        .map_err(|_| AppError::Validation("session not found".into()))?;
    if status != "DRAFT" {
        return Err(AppError::Validation("only draft sessions can save an initial plan draft".into()));
    }
    let revision_count: i64 = conn.query_row("SELECT COUNT(*) FROM session_plan_revisions WHERE session_id=?1", [session_id], |r| r.get(0))?;
    if revision_count != 0 {
        return Err(AppError::Validation("confirmed initial plans cannot be edited as drafts".into()));
    }
    let parsed: serde_json::Value = serde_json::from_str(json)
        .map_err(|_| AppError::Validation("invalid initial plan draft JSON".into()))?;
    if parsed.get("version").and_then(|v| v.as_u64()) != Some(1) {
        return Err(AppError::Validation("unsupported initial plan draft version".into()));
    }
    conn.execute(
        "INSERT INTO app_settings(key,value) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        rusqlite::params![format!("initial_plan_draft_v1:{}", session_id), json],
    )?;
    Ok(())
}

pub fn get_initial_plan_draft(conn: &Connection, session_id: &str) -> Result<Option<String>, AppError> {
    let status: String = conn.query_row("SELECT status FROM sessions WHERE session_id=?1", [session_id], |r| r.get(0))
        .map_err(|_| AppError::Validation("session not found".into()))?;
    if status != "DRAFT" { return Ok(None); }
    crate::db::setting(conn, &format!("initial_plan_draft_v1:{}", session_id))
}

pub fn list_sessions(conn: &Connection, limit: u32) -> Result<Vec<SessionSummary>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT s.session_id,s.session_date,COALESCE(s.instrument_symbol_snapshot,i.symbol),COALESCE(s.instrument_display_name_snapshot,i.display_name),COALESCE(s.instrument_tick_size_snapshot,i.tick_size),COALESCE(s.instrument_point_value_snapshot,i.point_value),COALESCE(s.instrument_currency_snapshot,i.currency),s.environment,s.status,s.opened_at FROM sessions s JOIN instruments i ON i.instrument_id=s.instrument_id ORDER BY s.session_date DESC,s.opened_at DESC LIMIT ?1"
    )?;
    let rows=stmt.query_map([limit],|row|Ok(SessionSummary{session_id:row.get(0)?,session_date:row.get(1)?,instrument_symbol:row.get(2)?,instrument_display_name:row.get(3)?,instrument_tick_size:row.get(4)?,instrument_point_value:row.get(5)?,instrument_currency:row.get(6)?,environment:row.get(7)?,status:row.get(8)?,opened_at:row.get(9)?}))?;
    Ok(rows.collect::<Result<Vec<_>,_>>()?)
}

fn validate_level_source_group(group: &str) -> Result<(), AppError> {
    if matches!(group, "PRICE_AUCTION"|"STRUCTURE"|"VOLUME"|"ORDER_BOOK"|"HEATMAP"|"CUSTOM"|"MANUAL"|"OTHER") {
        Ok(())
    } else {
        Err(AppError::Validation("invalid level source category".into()))
    }
}

fn level_source_storage_group(group: &str) -> (&str, Option<&str>) {
    if group == "CUSTOM" { ("OTHER", Some("CUSTOM")) } else { (group, None) }
}

fn query_level_sources(conn: &Connection, active_only: bool) -> Result<Vec<LevelSourceTypeDto>, AppError> {
    let workspace_id = ensure_default_workspace(conn)?;
    let sql = if active_only {
        "SELECT source_type_id,code,label,COALESCE(manager_group,source_group),active,user_defined,description,display_order FROM level_source_types WHERE workspace_id=?1 AND active=1 ORDER BY display_order,label"
    } else {
        "SELECT source_type_id,code,label,COALESCE(manager_group,source_group),active,user_defined,description,display_order FROM level_source_types WHERE workspace_id=?1 ORDER BY display_order,label"
    };
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([workspace_id], |r| Ok(LevelSourceTypeDto{
        source_type_id:r.get(0)?,
        code:r.get(1)?,
        label:r.get(2)?,
        source_group:r.get(3)?,
        active:r.get::<_,i64>(4)? != 0,
        user_defined:r.get::<_,i64>(5)? != 0,
        description:r.get(6)?,
        display_order:r.get(7)?,
    }))?;
    Ok(rows.collect::<Result<Vec<_>,_>>()?)
}

pub fn list_level_sources(conn: &Connection) -> Result<Vec<LevelSourceTypeDto>, AppError> {
    query_level_sources(conn, true)
}

pub fn list_all_level_sources(conn: &Connection) -> Result<Vec<LevelSourceTypeDto>, AppError> {
    query_level_sources(conn, false)
}

pub fn create_level_source(conn: &Connection, input: CreateLevelSourceInput) -> Result<LevelSourceTypeDto, AppError> {
    let label = input.label.trim();
    if label.is_empty() { return Err(AppError::Validation("level source name is required".into())); }
    validate_level_source_group(&input.source_group)?;
    if matches!(input.source_group.as_str(), "MANUAL"|"OTHER") {
        return Err(AppError::Validation("new sources should use a trading category or Custom".into()));
    }
    let workspace_id = ensure_default_workspace(conn)?;
    let id = format!("source-user-{}", Uuid::new_v4());
    let code = format!("CUSTOM_{}", Uuid::new_v4().simple());
    let next_order: i64 = conn.query_row(
        "SELECT COALESCE(MAX(display_order),0)+1 FROM level_source_types WHERE workspace_id=?1",
        [&workspace_id], |r| r.get(0)
    )?;
    let (storage_group, manager_group) = level_source_storage_group(&input.source_group);
    conn.execute(
        "INSERT INTO level_source_types(source_type_id,workspace_id,code,label,source_group,active,user_defined,description,display_order,manager_group) VALUES(?1,?2,?3,?4,?5,1,1,?6,?7,?8)",
        params![id,workspace_id,code,label,storage_group,input.description,next_order,manager_group],
    )?;
    let mut rows = query_level_sources(conn, false)?;
    rows.into_iter().find(|x| x.source_type_id==id).ok_or_else(||AppError::Validation("level source was not created".into()))
}

pub fn update_level_source(conn: &Connection, input: UpdateLevelSourceInput) -> Result<LevelSourceTypeDto, AppError> {
    let label = input.label.trim();
    if label.is_empty() { return Err(AppError::Validation("level source name is required".into())); }
    validate_level_source_group(&input.source_group)?;
    let (code,): (String,) = conn.query_row(
        "SELECT code FROM level_source_types WHERE source_type_id=?1",
        [&input.source_type_id], |r| Ok((r.get(0)?,))
    ).map_err(|_| AppError::Validation("level source does not exist".into()))?;
    if matches!(code.as_str(), "MANUAL"|"OTHER") && !input.active {
        return Err(AppError::Validation("Manual and Other must remain active".into()));
    }
    if matches!(code.as_str(), "MANUAL"|"OTHER") && !matches!(input.source_group.as_str(), "MANUAL"|"OTHER") {
        return Err(AppError::Validation("Manual and Other keep their built-in category".into()));
    }
    let (storage_group, manager_group) = level_source_storage_group(&input.source_group);
    conn.execute(
        "UPDATE level_source_types SET label=?1,source_group=?2,manager_group=?3,description=?4,active=?5,display_order=?6 WHERE source_type_id=?7",
        params![label,storage_group,manager_group,input.description,if input.active {1}else{0},input.display_order,input.source_type_id],
    )?;
    let rows = query_level_sources(conn, false)?;
    rows.into_iter().find(|x| x.source_type_id==input.source_type_id).ok_or_else(||AppError::Validation("level source update could not be read back".into()))
}

pub fn reorder_level_sources(conn: &mut Connection, input: ReorderLevelSourcesInput) -> Result<Vec<LevelSourceTypeDto>, AppError> {
    if input.source_type_ids.is_empty() { return query_level_sources(conn, false); }
    let workspace_id = ensure_default_workspace(conn)?;
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM level_source_types WHERE workspace_id=?1",
        [&workspace_id], |r| r.get(0)
    )?;
    if count as usize != input.source_type_ids.len() {
        return Err(AppError::Validation("reorder list must include every level source".into()));
    }
    let tx = conn.transaction()?;
    for (index,id) in input.source_type_ids.iter().enumerate() {
        let changed = tx.execute(
            "UPDATE level_source_types SET display_order=?1 WHERE workspace_id=?2 AND source_type_id=?3",
            params![(index as i64)+1,workspace_id,id],
        )?;
        if changed != 1 {
            return Err(AppError::Validation("reorder contains an unknown level source".into()));
        }
    }
    tx.commit()?;
    query_level_sources(conn, false)
}


pub fn list_evidence_types(conn: &Connection) -> Result<Vec<EvidenceTypeDto>, AppError> {
    let workspace_id = ensure_default_workspace(conn)?;
    let mut stmt = conn.prepare("SELECT evidence_type_id,code,label,family,research_status FROM evidence_types WHERE workspace_id=?1 AND active=1 ORDER BY family,label")?;
    let rows = stmt.query_map([workspace_id], |r| Ok(EvidenceTypeDto{evidence_type_id:r.get(0)?, code:r.get(1)?, label:r.get(2)?, family:r.get(3)?, research_status:r.get(4)?}))?;
    Ok(rows.collect::<Result<Vec<_>,_>>()?)
}

fn validate_candidate(c: &CandidateDraftInput) -> Result<(), AppError> {
    if !matches!(c.directional_intent.as_str(), "LONG"|"SHORT"|"CONDITIONAL"|"WATCH"|"UNKNOWN") { return Err(AppError::Validation("invalid candidate intent".into())); }
    if !matches!(c.price_mode.as_str(), "SINGLE"|"RANGE"|"UNSPECIFIED") { return Err(AppError::Validation("invalid price mode".into())); }
    if c.price_mode == "RANGE" {
        let (Some(a),Some(b))=(c.price_from,c.price_to) else { return Err(AppError::Validation("range requires both prices".into())); };
        if a > b { return Err(AppError::Validation("zone lower price cannot exceed upper price".into())); }
    }
    if c.price_mode == "SINGLE" && c.reference_price.is_none() { return Err(AppError::Validation("single price candidate requires reference price".into())); }
    Ok(())
}

pub fn confirm_initial_plan(conn: &mut Connection, input: ConfirmInitialPlanInput) -> Result<ConfirmPlanResult, AppError> {
    if !matches!(input.initial_bias.as_str(), "LONG"|"SHORT"|"NEUTRAL"|"MIXED"|"UNKNOWN") { return Err(AppError::Validation("invalid bias".into())); }
    if input.candidates.is_empty() { return Err(AppError::Validation("initial plan requires at least one candidate zone".into())); }
    for c in &input.candidates { validate_candidate(c)?; }
    let tx = conn.transaction()?;
    let (instrument_id,status): (String,String) = tx.query_row("SELECT instrument_id,status FROM sessions WHERE session_id=?1", [&input.session_id], |r| Ok((r.get(0)?,r.get(1)?)))?;
    if status != "DRAFT" && status != "PLANNING" { return Err(AppError::Validation("initial plan can only be confirmed from draft/planning".into())); }
    let existing: i64 = tx.query_row("SELECT COUNT(*) FROM session_plan_revisions WHERE session_id=?1", [&input.session_id], |r| r.get(0))?;
    if existing != 0 { return Err(AppError::Validation("initial plan already exists".into())); }
    let revision_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let expected = serde_json::to_string(&input.expected_context)?;
    let dont = serde_json::to_string(&input.things_not_to_do)?;
    tx.execute("INSERT INTO session_plan_revisions(revision_id,session_id,revision_number,revision_type,created_at,initial_bias,market_posture,main_scenario,alternative_scenario,expected_context_json,scenario_invalidation,things_not_to_do_json,created_by,provenance) VALUES(?1,?2,1,'INITIAL',?3,?4,?5,?6,?7,?8,?9,?10,'USER','NATIVE')",
        params![revision_id,input.session_id,now,input.initial_bias,input.market_posture,input.main_scenario,input.alternative_scenario,expected,input.scenario_invalidation,dont])?;
    tx.execute("UPDATE sessions SET status='ACTIVE',max_daily_risk=?1,max_daily_risk_unit=?2,max_trades=?3,updated_at=?4 WHERE session_id=?5",
        params![input.max_daily_risk,input.max_daily_risk_unit,input.max_trades,now,input.session_id])?;
    if input.pre_session_state.is_some() || input.pre_session_state_intensity.is_some() {
        if let Some(v)=input.pre_session_state_intensity { if !(1..=5).contains(&v) { return Err(AppError::Validation("pre-session state intensity must be 1-5".into())); } }
        tx.execute("INSERT INTO session_pre_states(session_pre_state_id,session_id,state_type,intensity,created_at,provenance) VALUES(?1,?2,?3,?4,?5,'NATIVE')",
            params![Uuid::new_v4().to_string(),input.session_id,input.pre_session_state,input.pre_session_state_intensity,now])?;
    }
    let mut ids=Vec::new();
    for c in &input.candidates {
        let candidate_id=Uuid::new_v4().to_string(); let crid=Uuid::new_v4().to_string(); let seid=Uuid::new_v4().to_string();
        tx.execute("INSERT INTO candidates(candidate_id,session_id,instrument_id,label,identified_when,created_at,created_from_plan_revision_id) VALUES(?1,?2,?3,?4,?5,?6,?7)", params![candidate_id,input.session_id,instrument_id,c.label,c.identified_when,now,revision_id])?;
        tx.execute("INSERT INTO candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,directional_intent,trend_relationship,price_mode,price_from,price_to,reference_price,required_conditions_json,invalidation_conditions_json,notes,change_type,provenance) VALUES(?1,?2,1,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,'CREATE','NATIVE')",
            params![crid,candidate_id,now,c.directional_intent,c.trend_relationship,c.price_mode,c.price_from,c.price_to,c.reference_price,serde_json::to_string(&c.required_conditions)?,serde_json::to_string(&c.invalidation_conditions)?,c.notes])?;
        tx.execute("INSERT INTO candidate_status_events(status_event_id,candidate_id,occurred_at,status,provenance) VALUES(?1,?2,?3,'PLANNED','NATIVE')",params![seid,candidate_id,now])?;
        for s in &c.sources {
            let csid=Uuid::new_v4().to_string();
            tx.execute("INSERT INTO candidate_sources(candidate_source_id,candidate_id,candidate_revision_id,source_type_id,source_price,note,is_primary,provenance) VALUES(?1,?2,?3,?4,?5,?6,?7,'NATIVE')",params![csid,candidate_id,crid,s.source_type_id,s.source_price,s.note,if s.is_primary.unwrap_or(false){1}else{0}])?;
        }
        ids.push(candidate_id);
    }
    tx.commit()?;
    Ok(ConfirmPlanResult{revision_id,candidate_ids:ids,session_status:"ACTIVE".into()})
}

pub fn get_current_plan(conn: &Connection, session_id: &str) -> Result<CurrentPlanDto, AppError> {
    let (revision_id, rev_num, created_at, bias, posture, main_scenario, alternative_scenario):(String,i64,String,String,Option<String>,Option<String>,Option<String>) = conn.query_row(
        "SELECT revision_id,revision_number,created_at,COALESCE(initial_bias,'UNKNOWN'),market_posture,main_scenario,alternative_scenario FROM session_plan_revisions WHERE session_id=?1 ORDER BY revision_number DESC LIMIT 1",
        [session_id], |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?,r.get(5)?,r.get(6)?)))?;
    let mut stmt=conn.prepare("SELECT c.candidate_id,c.label,cr.directional_intent,cr.trend_relationship,cr.price_mode,cr.price_from,cr.price_to,cr.reference_price,cr.candidate_revision_id,cr.required_conditions_json,cr.invalidation_conditions_json,cr.notes FROM candidates c JOIN candidate_revisions cr ON cr.candidate_id=c.candidate_id AND cr.revision_number=(SELECT MAX(cr2.revision_number) FROM candidate_revisions cr2 WHERE cr2.candidate_id=c.candidate_id) WHERE c.session_id=?1 AND c.archived_at IS NULL ORDER BY c.created_at")?;
    let base=stmt.query_map([session_id], |r| Ok((r.get::<_,String>(0)?,r.get::<_,Option<String>>(1)?,r.get::<_,String>(2)?,r.get::<_,Option<String>>(3)?,r.get::<_,String>(4)?,r.get::<_,Option<f64>>(5)?,r.get::<_,Option<f64>>(6)?,r.get::<_,Option<f64>>(7)?,r.get::<_,String>(8)?,r.get::<_,Option<String>>(9)?,r.get::<_,Option<String>>(10)?,r.get::<_,Option<String>>(11)?)))?.collect::<Result<Vec<_>,_>>()?;
    let mut candidates=Vec::new();
    for (id,label,intent,trend,pm,pf,pt,rp,current_revision_id,required_json,invalidation_json,notes) in base {
        let status:String=conn.query_row("SELECT status FROM candidate_status_events WHERE candidate_id=?1 ORDER BY occurred_at DESC,rowid DESC LIMIT 1",[&id],|r|r.get(0)).optional()?.unwrap_or_else(||"PLANNED".into());
        let mut sstmt=conn.prepare("SELECT lst.source_type_id,lst.label FROM candidate_sources cs JOIN level_source_types lst ON lst.source_type_id=cs.source_type_id WHERE cs.candidate_id=?1 AND cs.candidate_revision_id=?2 ORDER BY cs.is_primary DESC,lst.label")?;
        let rows=sstmt.query_map(params![&id,&current_revision_id],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?)))?.collect::<Result<Vec<_>,_>>()?;
        let source_type_ids=rows.iter().map(|x|x.0.clone()).collect();
        let sources=rows.into_iter().map(|x|x.1).collect();
        let required_conditions=required_json.as_deref().and_then(|x|serde_json::from_str(x).ok()).unwrap_or_default();
        let invalidation_conditions=invalidation_json.as_deref().and_then(|x|serde_json::from_str(x).ok()).unwrap_or_default();
        candidates.push(CandidateCurrentDto{candidate_id:id,label,directional_intent:intent,trend_relationship:trend,price_mode:pm,price_from:pf,price_to:pt,reference_price:rp,required_conditions,invalidation_conditions,notes,current_status:status,sources,source_type_ids});
    }
    Ok(CurrentPlanDto{session_id:session_id.to_string(),revision_id,revision_number:rev_num,created_at,initial_bias:bias,market_posture:posture,main_scenario,alternative_scenario,candidates})
}

pub fn add_live_candidate(conn: &mut Connection, input: AddLiveCandidateInput) -> Result<AddLiveCandidateResult, AppError> {
    if input.why_changed.trim().is_empty() { return Err(AppError::Validation("adding a live zone requires a reason".into())); }
    validate_candidate(&input.candidate)?;
    let tx = conn.transaction()?;
    let (instrument_id,status):(String,String)=tx.query_row("SELECT instrument_id,status FROM sessions WHERE session_id=?1",[&input.session_id],|r|Ok((r.get(0)?,r.get(1)?)))?;
    if status != "ACTIVE" { return Err(AppError::Validation("live zones can only be added to an active session".into())); }
    let prev:(String,i64,String,Option<String>,Option<String>,Option<String>,Option<String>,Option<String>,Option<String>)=tx.query_row(
        "SELECT revision_id,revision_number,COALESCE(initial_bias,'UNKNOWN'),market_posture,main_scenario,alternative_scenario,expected_context_json,scenario_invalidation,things_not_to_do_json FROM session_plan_revisions WHERE session_id=?1 ORDER BY revision_number DESC LIMIT 1",
        [&input.session_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?,r.get(5)?,r.get(6)?,r.get(7)?,r.get(8)?)))?;
    let plan_revision_id=Uuid::new_v4().to_string(); let now=Utc::now().to_rfc3339();
    let change_json=serde_json::to_string(&serde_json::json!({"change_type":"ADD_CANDIDATE"}))?;
    tx.execute("INSERT INTO session_plan_revisions(revision_id,session_id,revision_number,revision_type,created_at,previous_revision_id,initial_bias,market_posture,main_scenario,alternative_scenario,expected_context_json,scenario_invalidation,things_not_to_do_json,what_changed_json,why_changed,new_evidence_summary,created_by,provenance) VALUES(?1,?2,?3,'UPDATE',?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,'USER','NATIVE')",
        params![plan_revision_id,input.session_id,prev.1+1,now,prev.0,prev.2,prev.3,prev.4,prev.5,prev.6,prev.7,prev.8,change_json,input.why_changed,input.new_evidence_summary])?;
    let candidate_id=Uuid::new_v4().to_string(); let crid=Uuid::new_v4().to_string(); let seid=Uuid::new_v4().to_string(); let c=&input.candidate;
    tx.execute("INSERT INTO candidates(candidate_id,session_id,instrument_id,label,identified_when,created_at,created_from_plan_revision_id) VALUES(?1,?2,?3,?4,?5,?6,?7)",params![candidate_id,input.session_id,instrument_id,c.label,c.identified_when,now,plan_revision_id])?;
    tx.execute("INSERT INTO candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,directional_intent,trend_relationship,price_mode,price_from,price_to,reference_price,required_conditions_json,invalidation_conditions_json,notes,change_type,change_reason,provenance) VALUES(?1,?2,1,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,'CREATE',?13,'NATIVE')",
        params![crid,candidate_id,now,c.directional_intent,c.trend_relationship,c.price_mode,c.price_from,c.price_to,c.reference_price,serde_json::to_string(&c.required_conditions)?,serde_json::to_string(&c.invalidation_conditions)?,c.notes,input.why_changed])?;
    tx.execute("INSERT INTO candidate_status_events(status_event_id,candidate_id,occurred_at,status,reason,provenance) VALUES(?1,?2,?3,'PLANNED','Added during active session','NATIVE')",params![seid,candidate_id,now])?;
    for source in &c.sources { let csid=Uuid::new_v4().to_string(); tx.execute("INSERT INTO candidate_sources(candidate_source_id,candidate_id,candidate_revision_id,source_type_id,source_price,note,is_primary,provenance) VALUES(?1,?2,?3,?4,?5,?6,?7,'NATIVE')",params![csid,candidate_id,crid,source.source_type_id,source.source_price,source.note,if source.is_primary.unwrap_or(false){1}else{0}])?; }
    tx.execute("UPDATE sessions SET updated_at=?1 WHERE session_id=?2",params![now,input.session_id])?;
    tx.commit()?;
    Ok(AddLiveCandidateResult{plan_revision_id,candidate_id})
}

pub fn add_evidence_observation(conn:&Connection,input:EvidenceObservationInput)->Result<String,AppError>{
    if !matches!(input.role.as_str(),"LEVEL_SOURCE"|"SETUP_SUPPORT"|"ENTRY_CONFIRMATION"|"CONTRADICTING_EVIDENCE"|"INVALIDATION"|"MANAGEMENT_SIGNAL"|"EXIT_SIGNAL"|"GENERAL_OBSERVATION") { return Err(AppError::Validation("invalid evidence role".into())); }
    let session_status:String=conn.query_row("SELECT status FROM sessions WHERE session_id=?1",[&input.session_id],|r|r.get(0))?;
    if session_status!="ACTIVE" { return Err(AppError::Validation("evidence capture requires an active session".into())); }
    if let Some(ref cid)=input.candidate_id {
        let owner_session:String=conn.query_row("SELECT session_id FROM candidates WHERE candidate_id=?1",[cid],|r|r.get(0))?;
        if owner_session!=input.session_id { return Err(AppError::Validation("candidate does not belong to session".into())); }
    }
    let exists:i64=conn.query_row("SELECT COUNT(*) FROM evidence_types WHERE evidence_type_id=?1 AND active=1",[&input.evidence_type_id],|r|r.get(0))?;
    if exists==0 { return Err(AppError::Validation("unknown or inactive evidence type".into())); }
    let id=Uuid::new_v4().to_string(); let now=Utc::now().to_rfc3339();
    conn.execute("INSERT INTO evidence_observations(evidence_id,session_id,candidate_id,evidence_type_id,role,occurred_at,direction,price,numeric_value,strength,present,note,provenance) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,1,?11,'NATIVE')",
        params![id,input.session_id,input.candidate_id,input.evidence_type_id,input.role,now,input.direction,input.price,input.numeric_value,input.strength,input.note])?;
    Ok(id)
}

pub fn list_candidate_evidence(conn:&Connection,candidate_id:&str)->Result<Vec<EvidenceObservationDto>,AppError>{
    let mut stmt=conn.prepare("SELECT eo.evidence_id,COALESCE(eo.occurred_at,''),eo.candidate_id,eo.evidence_type_id,et.label,eo.role,eo.direction,eo.price,eo.numeric_value,eo.strength,eo.note FROM evidence_observations eo JOIN evidence_types et ON et.evidence_type_id=eo.evidence_type_id WHERE eo.candidate_id=?1 ORDER BY eo.occurred_at DESC,eo.rowid DESC")?;
    let rows=stmt.query_map([candidate_id],|r|Ok(EvidenceObservationDto{evidence_id:r.get(0)?,occurred_at:r.get(1)?,candidate_id:r.get(2)?,evidence_type_id:r.get(3)?,evidence_label:r.get(4)?,role:r.get(5)?,direction:r.get(6)?,price:r.get(7)?,numeric_value:r.get(8)?,strength:r.get(9)?,note:r.get(10)?}))?;
    Ok(rows.collect::<Result<Vec<_>,_>>()?)
}

pub fn check_plan_consistency(conn:&Connection,session_id:&str)->Result<PlanConsistencyDto,AppError>{
    let mut active=0_i64; let mut cancelled=0_i64; let mut warnings=Vec::new();
    let mut stmt=conn.prepare("SELECT c.candidate_id,cr.price_mode,cr.price_from,cr.price_to,cr.reference_price,cr.directional_intent,(SELECT status FROM candidate_status_events se WHERE se.candidate_id=c.candidate_id ORDER BY se.occurred_at DESC,se.rowid DESC LIMIT 1) FROM candidates c JOIN candidate_revisions cr ON cr.candidate_id=c.candidate_id AND cr.revision_number=(SELECT MAX(cr2.revision_number) FROM candidate_revisions cr2 WHERE cr2.candidate_id=c.candidate_id) WHERE c.session_id=?1 AND c.archived_at IS NULL")?;
    let rows=stmt.query_map([session_id],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,Option<f64>>(2)?,r.get::<_,Option<f64>>(3)?,r.get::<_,Option<f64>>(4)?,r.get::<_,String>(5)?,r.get::<_,Option<String>>(6)?)))?;
    for row in rows { let (cid,mode,pf,pt,rp,intent,status)=row?; let st=status.unwrap_or_else(||"PLANNED".into()); if matches!(st.as_str(),"CANCELLED"|"INVALIDATED"|"EXPIRED"){cancelled+=1;}else{active+=1;}
        if mode=="RANGE" && (pf.is_none()||pt.is_none()){warnings.push(format!("{cid}:RANGE_PRICE_MISSING"));}
        if mode=="SINGLE" && rp.is_none(){warnings.push(format!("{cid}:SINGLE_PRICE_MISSING"));}
        if intent=="UNKNOWN"{warnings.push(format!("{cid}:INTENT_UNKNOWN"));}
    }
    if active==0 { warnings.push("NO_ACTIVE_CANDIDATES".into()); }
    Ok(PlanConsistencyDto{active_candidate_count:active,cancelled_candidate_count:cancelled,warning_codes:warnings})
}

pub fn create_plan_revision(conn: &mut Connection, input: CreatePlanRevisionInput) -> Result<String, AppError> {
    if input.why_changed.trim().is_empty() { return Err(AppError::Validation("plan revision requires a reason".into())); }
    if let Some(ref bias)=input.initial_bias { if !matches!(bias.as_str(),"LONG"|"SHORT"|"NEUTRAL"|"MIXED"|"UNKNOWN") { return Err(AppError::Validation("invalid bias".into())); } }
    let tx=conn.transaction()?;
    let status:String=tx.query_row("SELECT status FROM sessions WHERE session_id=?1",[&input.session_id],|r|r.get(0))?;
    if status!="ACTIVE" { return Err(AppError::Validation("plan revisions require an active session".into())); }
    let prev:(String,i64,String,Option<String>,Option<String>,Option<String>,Option<String>,Option<String>,Option<String>)=tx.query_row(
        "SELECT revision_id,revision_number,COALESCE(initial_bias,'UNKNOWN'),market_posture,main_scenario,alternative_scenario,expected_context_json,scenario_invalidation,things_not_to_do_json FROM session_plan_revisions WHERE session_id=?1 ORDER BY revision_number DESC LIMIT 1",
        [&input.session_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?,r.get(5)?,r.get(6)?,r.get(7)?,r.get(8)?)))?;
    let new_id=Uuid::new_v4().to_string(); let now=Utc::now().to_rfc3339(); let new_num=prev.1+1;
    let change_json=serde_json::to_string(&serde_json::json!({"change_type":input.change_type}))?;
    tx.execute("INSERT INTO session_plan_revisions(revision_id,session_id,revision_number,revision_type,created_at,previous_revision_id,initial_bias,market_posture,main_scenario,alternative_scenario,expected_context_json,scenario_invalidation,things_not_to_do_json,what_changed_json,why_changed,new_evidence_summary,created_by,provenance) VALUES(?1,?2,?3,'UPDATE',?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,'USER','NATIVE')",
        params![new_id,input.session_id,new_num,now,prev.0,input.initial_bias.unwrap_or(prev.2),input.market_posture.or(prev.3),input.main_scenario.or(prev.4),input.alternative_scenario.or(prev.5),prev.6,prev.7,prev.8,change_json,input.why_changed,input.new_evidence_summary])?;
    tx.execute("UPDATE sessions SET updated_at=?1 WHERE session_id=?2",params![now,input.session_id])?;
    tx.commit()?; Ok(new_id)
}

pub fn revise_candidate(conn: &mut Connection, input: ReviseCandidateInput) -> Result<String, AppError> {
    if input.change_reason.trim().is_empty() { return Err(AppError::Validation("candidate revision requires a reason".into())); }
    let candidate_stub=CandidateDraftInput{label:None,directional_intent:input.directional_intent.clone(),trend_relationship:input.trend_relationship.clone(),price_mode:input.price_mode.clone(),price_from:input.price_from,price_to:input.price_to,reference_price:input.reference_price,identified_when:"DURING_SESSION".into(),required_conditions:input.required_conditions.clone(),invalidation_conditions:input.invalidation_conditions.clone(),notes:input.notes.clone(),sources:input.sources.iter().map(|s|CandidateSourceInput{source_type_id:s.source_type_id.clone(),is_primary:s.is_primary,source_price:s.source_price,note:s.note.clone()}).collect()};
    validate_candidate(&candidate_stub)?;
    let tx=conn.transaction()?;
    let session_status:String=tx.query_row("SELECT s.status FROM candidates c JOIN sessions s ON s.session_id=c.session_id WHERE c.candidate_id=?1",[&input.candidate_id],|r|r.get(0))?;
    if session_status!="ACTIVE" { return Err(AppError::Validation("candidate revisions require an active session".into())); }
    let (prev_id,prev_num):(String,i64)=tx.query_row("SELECT candidate_revision_id,revision_number FROM candidate_revisions WHERE candidate_id=?1 ORDER BY revision_number DESC LIMIT 1",[&input.candidate_id],|r|Ok((r.get(0)?,r.get(1)?)))?;
    let id=Uuid::new_v4().to_string(); let now=Utc::now().to_rfc3339();
    tx.execute("INSERT INTO candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,previous_revision_id,directional_intent,trend_relationship,price_mode,price_from,price_to,reference_price,required_conditions_json,invalidation_conditions_json,notes,change_type,change_reason,provenance) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,'NATIVE')",
        params![id,input.candidate_id,prev_num+1,now,prev_id,input.directional_intent,input.trend_relationship,input.price_mode,input.price_from,input.price_to,input.reference_price,serde_json::to_string(&input.required_conditions)?,serde_json::to_string(&input.invalidation_conditions)?,input.notes,input.change_type,input.change_reason])?;
    for source in &input.sources { let csid=Uuid::new_v4().to_string(); tx.execute("INSERT INTO candidate_sources(candidate_source_id,candidate_id,candidate_revision_id,source_type_id,source_price,note,is_primary,provenance) VALUES(?1,?2,?3,?4,?5,?6,?7,'NATIVE')",params![csid,input.candidate_id,id,source.source_type_id,source.source_price,source.note,if source.is_primary.unwrap_or(false){1}else{0}])?; }
    tx.commit()?; Ok(id)
}

fn transition_allowed(from:&str,to:&str)->bool {
    if from==to { return false; }
    match from {
        "PLANNED" => matches!(to,"WATCHING"|"REACHED"|"INVALIDATED"|"CANCELLED"|"EXPIRED"),
        "WATCHING" => matches!(to,"REACHED"|"VALID"|"INVALIDATED"|"CANCELLED"|"EXPIRED"),
        "REACHED" => matches!(to,"WATCHING"|"VALID"|"INVALIDATED"|"CANCELLED"|"EXPIRED"),
        "VALID" => matches!(to,"WATCHING"|"INVALIDATED"|"CANCELLED"|"EXPIRED"),
        "INVALIDATED"|"CANCELLED"|"EXPIRED" => to=="PLANNED",
        _ => false,
    }
}

pub fn add_candidate_status(conn:&Connection,input:AddCandidateStatusInput)->Result<(),AppError>{
    if !matches!(input.status.as_str(),"PLANNED"|"WATCHING"|"REACHED"|"VALID"|"INVALIDATED"|"CANCELLED"|"EXPIRED") { return Err(AppError::Validation("invalid candidate status".into())); }
    let current:String=conn.query_row("SELECT status FROM candidate_status_events WHERE candidate_id=?1 ORDER BY occurred_at DESC,rowid DESC LIMIT 1",[&input.candidate_id],|r|r.get(0))?;
    if !transition_allowed(&current,&input.status){return Err(AppError::Validation(format!("candidate status transition {current} -> {} is not allowed",input.status)));}
    let id=Uuid::new_v4().to_string(); let now=Utc::now().to_rfc3339();
    conn.execute("INSERT INTO candidate_status_events(status_event_id,candidate_id,occurred_at,status,reason,provenance) VALUES(?1,?2,?3,?4,?5,'NATIVE')",params![id,input.candidate_id,now,input.status,input.reason])?; Ok(())
}

pub fn list_plan_timeline(conn:&Connection,session_id:&str)->Result<Vec<TimelineEventDto>,AppError>{
    let mut out=Vec::new();
    let mut p=conn.prepare("SELECT created_at,revision_type,revision_number,initial_bias,why_changed FROM session_plan_revisions WHERE session_id=?1 ORDER BY created_at")?;
    for row in p.query_map([session_id],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,i64>(2)?,r.get::<_,Option<String>>(3)?,r.get::<_,Option<String>>(4)?)))? { let (at,typ,num,bias,why)=row?; out.push(TimelineEventDto{occurred_at:at,event_type:"PLAN_REVISION".into(),title:if typ=="INITIAL"{"Initial plan confirmed".into()}else{format!("Plan revision #{num}")},detail:why.or(bias),revision_number:Some(num),candidate_id:None}); }
    let mut c=conn.prepare("SELECT cr.created_at,cr.revision_number,c.candidate_id,COALESCE(c.label,'Zone'),cr.change_type,cr.change_reason FROM candidate_revisions cr JOIN candidates c ON c.candidate_id=cr.candidate_id WHERE c.session_id=?1 ORDER BY cr.created_at")?;
    for row in c.query_map([session_id],|r|Ok((r.get::<_,String>(0)?,r.get::<_,i64>(1)?,r.get::<_,String>(2)?,r.get::<_,String>(3)?,r.get::<_,String>(4)?,r.get::<_,Option<String>>(5)?)))? { let (at,num,cid,label,change,reason)=row?; out.push(TimelineEventDto{occurred_at:at,event_type:"CANDIDATE_REVISION".into(),title:if num==1{format!("{label} created")}else{format!("{label}: {change}")},detail:reason,revision_number:Some(num),candidate_id:Some(cid)}); }
    let mut st=conn.prepare("SELECT se.occurred_at,c.candidate_id,COALESCE(c.label,'Zone'),se.status,se.reason FROM candidate_status_events se JOIN candidates c ON c.candidate_id=se.candidate_id WHERE c.session_id=?1 ORDER BY se.occurred_at")?;
    for row in st.query_map([session_id],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,r.get::<_,String>(3)?,r.get::<_,Option<String>>(4)?)))? { let (at,cid,label,status,reason)=row?; out.push(TimelineEventDto{occurred_at:at,event_type:"CANDIDATE_STATUS".into(),title:format!("{label} → {status}"),detail:reason,revision_number:None,candidate_id:Some(cid)}); }
    let mut ev=conn.prepare("SELECT COALESCE(eo.occurred_at,''),eo.candidate_id,et.label,eo.role,eo.direction,eo.note FROM evidence_observations eo JOIN evidence_types et ON et.evidence_type_id=eo.evidence_type_id WHERE eo.session_id=?1 ORDER BY eo.occurred_at")?;
    for row in ev.query_map([session_id],|r|Ok((r.get::<_,String>(0)?,r.get::<_,Option<String>>(1)?,r.get::<_,String>(2)?,r.get::<_,String>(3)?,r.get::<_,Option<String>>(4)?,r.get::<_,Option<String>>(5)?)))? { let (at,cid,label,role,direction,note)=row?; let detail=note.or(direction); out.push(TimelineEventDto{occurred_at:at,event_type:"EVIDENCE".into(),title:format!("{label} · {role}"),detail,revision_number:None,candidate_id:cid}); }
    let mut de=conn.prepare("SELECT d.occurred_at,d.candidate_id,d.decision_type,d.reason_code,d.intended_direction,d.plan_alignment FROM candidate_decisions d WHERE d.session_id=?1 ORDER BY d.occurred_at")?;
    for row in de.query_map([session_id],|r|Ok((r.get::<_,String>(0)?,r.get::<_,Option<String>>(1)?,r.get::<_,String>(2)?,r.get::<_,Option<String>>(3)?,r.get::<_,Option<String>>(4)?,r.get::<_,Option<String>>(5)?)))? { let (at,cid,typ,reason,direction,alignment)=row?; let detail=reason.or(alignment); let title=if let Some(d)=direction{format!("{typ} · {d}")}else{typ.clone()}; out.push(TimelineEventDto{occurred_at:at,event_type:"DECISION".into(),title,detail,revision_number:None,candidate_id:cid}); }
    out.sort_by(|a,b|a.occurred_at.cmp(&b.occurred_at)); Ok(out)
}


#[derive(Debug, Deserialize)]
pub struct CreateCandidateDecisionInput {
    pub session_id: String,
    pub candidate_id: Option<String>,
    pub decision_type: String,
    pub intended_direction: Option<String>,
    pub reason_code: Option<String>,
    pub reason_note: Option<String>,
    pub decision_quality: Option<String>,
    pub decision_quality_note: Option<String>,
    pub plan_mismatch_reason: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CandidateDecisionDto {
    pub decision_id: String,
    pub candidate_id: Option<String>,
    pub occurred_at: String,
    pub decision_type: String,
    pub intended_direction: Option<String>,
    pub reason_code: Option<String>,
    pub reason_note: Option<String>,
    pub decision_quality: Option<String>,
    pub plan_alignment: Option<String>,
    pub plan_mismatch_reason: Option<String>,
    pub based_on_plan_revision_id: Option<String>,
    pub based_on_candidate_revision_id: Option<String>,
}

fn decision_alignment(candidate_intent: Option<&str>, trend_relationship: Option<&str>, intended_direction: Option<&str>) -> &'static str {
    let Some(direction) = intended_direction else { return "NOT_APPLICABLE"; };
    match candidate_intent {
        None => "UNPLANNED",
        Some("LONG") if direction == "LONG" => {
            if trend_relationship == Some("COUNTERTREND") { "PLANNED_COUNTERTREND" } else { "ALIGNED" }
        }
        Some("SHORT") if direction == "SHORT" => {
            if trend_relationship == Some("COUNTERTREND") { "PLANNED_COUNTERTREND" } else { "ALIGNED" }
        }
        Some("LONG") | Some("SHORT") => "MISMATCH",
        Some("CONDITIONAL") | Some("WATCH") | Some("UNKNOWN") => "UNKNOWN",
        _ => "UNKNOWN",
    }
}

pub fn create_candidate_decision(conn: &Connection, input: CreateCandidateDecisionInput) -> Result<CandidateDecisionDto, AppError> {
    if !matches!(input.decision_type.as_str(), "TRADE"|"NO_TRADE"|"MISSED") {
        return Err(AppError::Validation("invalid decision type".into()));
    }
    if let Some(ref q) = input.decision_quality {
        if !matches!(q.as_str(), "A"|"B"|"C"|"INVALID"|"UNCLEAR") {
            return Err(AppError::Validation("invalid decision quality".into()));
        }
    }
    if input.decision_type == "TRADE" {
        let Some(ref d) = input.intended_direction else { return Err(AppError::Validation("trade decision requires intended direction".into())); };
        if !matches!(d.as_str(), "LONG"|"SHORT") { return Err(AppError::Validation("invalid trade direction".into())); }
    } else if input.reason_code.as_deref().unwrap_or("").trim().is_empty()
        && input.reason_note.as_deref().unwrap_or("").trim().is_empty() {
        return Err(AppError::Validation("No-trade and Missed decisions require a reason".into()));
    }
    let session_status: String = conn.query_row("SELECT status FROM sessions WHERE session_id=?1", [&input.session_id], |r| r.get(0))?;
    if session_status != "ACTIVE" { return Err(AppError::Validation("decisions require an active session".into())); }

    let latest_plan: Option<String> = conn.query_row(
        "SELECT revision_id FROM session_plan_revisions WHERE session_id=?1 ORDER BY revision_number DESC LIMIT 1",
        [&input.session_id], |r| r.get(0)).optional()?;

    let (candidate_revision_id, candidate_intent, trend_relationship) = if let Some(ref cid) = input.candidate_id {
        let owner_session: String = conn.query_row("SELECT session_id FROM candidates WHERE candidate_id=?1", [cid], |r| r.get(0))?;
        if owner_session != input.session_id { return Err(AppError::Validation("candidate does not belong to session".into())); }
        let row: (String,String,Option<String>) = conn.query_row(
            "SELECT candidate_revision_id,directional_intent,trend_relationship FROM candidate_revisions WHERE candidate_id=?1 ORDER BY revision_number DESC LIMIT 1",
            [cid], |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?)))?;
        (Some(row.0), Some(row.1), row.2)
    } else {
        (None, None, None)
    };

    let alignment = decision_alignment(candidate_intent.as_deref(), trend_relationship.as_deref(), input.intended_direction.as_deref()).to_string();
    if alignment == "MISMATCH" && input.plan_mismatch_reason.as_deref().unwrap_or("").trim().is_empty() {
        return Err(AppError::Validation("a trade opposite to the candidate plan requires a reason".into()));
    }
    if input.candidate_id.is_none() && input.decision_type == "TRADE" && input.plan_mismatch_reason.as_deref().unwrap_or("").trim().is_empty() {
        return Err(AppError::Validation("an unplanned trade decision requires a reason".into()));
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO candidate_decisions(decision_id,candidate_id,session_id,occurred_at,decision_type,reason_code,reason_note,decision_quality,decision_quality_note,based_on_plan_revision_id,based_on_candidate_revision_id,provenance,intended_direction,plan_alignment,plan_mismatch_reason) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,'NATIVE',?12,?13,?14)",
        params![id,input.candidate_id,input.session_id,now,input.decision_type,input.reason_code,input.reason_note,input.decision_quality,input.decision_quality_note,latest_plan,candidate_revision_id,input.intended_direction,alignment,input.plan_mismatch_reason]
    )?;

    Ok(CandidateDecisionDto {
        decision_id: id,
        candidate_id: input.candidate_id,
        occurred_at: now,
        decision_type: input.decision_type,
        intended_direction: input.intended_direction,
        reason_code: input.reason_code,
        reason_note: input.reason_note,
        decision_quality: input.decision_quality,
        plan_alignment: Some(alignment),
        plan_mismatch_reason: input.plan_mismatch_reason,
        based_on_plan_revision_id: latest_plan,
        based_on_candidate_revision_id: candidate_revision_id,
    })
}

pub fn list_candidate_decisions(conn: &Connection, candidate_id: &str) -> Result<Vec<CandidateDecisionDto>, AppError> {
    let mut stmt = conn.prepare("SELECT decision_id,candidate_id,occurred_at,decision_type,intended_direction,reason_code,reason_note,decision_quality,plan_alignment,plan_mismatch_reason,based_on_plan_revision_id,based_on_candidate_revision_id FROM candidate_decisions WHERE candidate_id=?1 ORDER BY occurred_at DESC,rowid DESC")?;
    let rows = stmt.query_map([candidate_id], |r| Ok(CandidateDecisionDto {
        decision_id:r.get(0)?, candidate_id:r.get(1)?, occurred_at:r.get(2)?, decision_type:r.get(3)?, intended_direction:r.get(4)?, reason_code:r.get(5)?, reason_note:r.get(6)?, decision_quality:r.get(7)?, plan_alignment:r.get(8)?, plan_mismatch_reason:r.get(9)?, based_on_plan_revision_id:r.get(10)?, based_on_candidate_revision_id:r.get(11)?
    }))?.collect::<Result<Vec<_>,_>>()?;
    Ok(rows)
}

// =============================
// Phase 3 v0.7 — Trade Execution Core
// =============================

#[derive(Debug, Deserialize)]
pub struct CreateTradeExecutionInput {
    pub decision_id: String,
    pub entry_price: f64,
    pub stop_price: f64,
    pub quantity: f64,
    pub order_type: Option<String>,
    pub planned_target_price: Option<f64>,
    pub commission: Option<f64>,
    pub fees: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct AddTradeFillInput {
    pub trade_id: String,
    pub action: String,
    pub price: f64,
    pub quantity: f64,
    pub order_type: Option<String>,
    pub commission: Option<f64>,
    pub fees: Option<f64>,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MoveStopInput {
    pub trade_id: String,
    pub stop_price: f64,
    pub reason: Option<String>,
    pub was_rule_compliant: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct TradeMetricsDto {
    pub trade_id: String,
    pub session_id: String,
    pub candidate_id: Option<String>,
    pub direction: String,
    pub status: String,
    pub average_entry: Option<f64>,
    pub total_entry_quantity: f64,
    pub total_exit_quantity: f64,
    pub open_quantity: f64,
    pub latest_stop_price: Option<f64>,
    pub initial_risk_dollars: Option<f64>,
    pub gross_realized_pnl: Option<f64>,
    pub net_realized_pnl: Option<f64>,
    pub realized_r: Option<f64>,
    pub fill_count: i64,
}

#[derive(Debug, Serialize)]
pub struct ExecutionFillDto {
    pub execution_id: String,
    pub occurred_at: Option<String>,
    pub action: String,
    pub side: String,
    pub price: f64,
    pub quantity: f64,
    pub order_type: Option<String>,
    pub commission: Option<f64>,
    pub fees: Option<f64>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TradeDetailDto {
    pub metrics: TradeMetricsDto,
    pub fills: Vec<ExecutionFillDto>,
}

fn price_tick_aligned(price: f64, tick_size: f64) -> bool {
    if tick_size <= 0.0 { return false; }
    let units = price / tick_size;
    (units - units.round()).abs() <= 1e-8
}

fn validate_order_type(order_type: &Option<String>) -> Result<(), AppError> {
    if let Some(v) = order_type {
        if !matches!(v.as_str(), "MARKET"|"LIMIT"|"STOP"|"OTHER") {
            return Err(AppError::Validation("invalid order type".into()));
        }
    }
    Ok(())
}

fn instrument_spec_for_session(conn: &Connection, session_id: &str) -> Result<(f64,f64),AppError> {
    Ok(conn.query_row(
        "SELECT COALESCE(s.instrument_tick_size_snapshot,i.tick_size),COALESCE(s.instrument_point_value_snapshot,i.point_value) FROM sessions s JOIN instruments i ON i.instrument_id=s.instrument_id WHERE s.session_id=?1",
        [session_id], |r| Ok((r.get(0)?,r.get(1)?))
    )?)
}

fn trade_metrics(conn: &Connection, trade_id: &str) -> Result<TradeMetricsDto,AppError> {
    let (session_id,candidate_id,direction,status):(String,Option<String>,String,String)=conn.query_row(
        "SELECT session_id,candidate_id,direction,status FROM trades WHERE trade_id=?1",
        [trade_id], |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?))
    )?;
    let (_tick_size,point_value)=instrument_spec_for_session(conn,&session_id)?;

    let mut stmt=conn.prepare("SELECT action,price,quantity,COALESCE(commission,0),COALESCE(fees,0) FROM execution_fills WHERE trade_id=?1 ORDER BY COALESCE(occurred_at,''),rowid")?;
    let rows=stmt.query_map([trade_id],|r|Ok((r.get::<_,String>(0)?,r.get::<_,f64>(1)?,r.get::<_,f64>(2)?,r.get::<_,f64>(3)?,r.get::<_,f64>(4)?)))?;
    let mut entries:Vec<(f64,f64)>=Vec::new(); let mut exits:Vec<(f64,f64)>=Vec::new(); let mut costs=0.0; let mut fill_count=0_i64;
    for row in rows { let (action,price,qty,comm,fees)=row?; fill_count+=1; costs += comm + fees; if action=="ENTRY" {entries.push((price,qty));} else {exits.push((price,qty));} }
    let entry_qty: f64=entries.iter().map(|x|x.1).sum(); let exit_qty:f64=exits.iter().map(|x|x.1).sum();
    let avg_entry=if entry_qty>0.0 {Some(entries.iter().map(|(p,q)|p*q).sum::<f64>()/entry_qty)} else {None};
    let gross=if let Some(avg)=avg_entry { if exit_qty>0.0 { let sign=if direction=="LONG"{1.0}else{-1.0}; Some(exits.iter().map(|(p,q)|(p-avg)*sign*q*point_value).sum()) } else {None} } else {None};
    let net=gross.map(|g|g-costs);
    let initial_risk:Option<f64>=conn.query_row(
        "SELECT risk_dollars FROM risk_snapshots WHERE trade_id=?1 AND snapshot_type='INITIAL' ORDER BY occurred_at,rowid LIMIT 1",
        [trade_id], |r| r.get(0)
    ).optional()?;
    let latest_stop:Option<f64>=conn.query_row(
        "SELECT stop_price FROM risk_snapshots WHERE trade_id=?1 AND stop_price IS NOT NULL ORDER BY occurred_at DESC,rowid DESC LIMIT 1",
        [trade_id], |r| r.get(0)
    ).optional()?;
    let rr=match(net,initial_risk){(Some(n),Some(r)) if r>0.0=>Some(n/r),_=>None};
    Ok(TradeMetricsDto{trade_id:trade_id.into(),session_id,candidate_id,direction,status,average_entry:avg_entry,total_entry_quantity:entry_qty,total_exit_quantity:exit_qty,open_quantity:(entry_qty-exit_qty).max(0.0),latest_stop_price:latest_stop,initial_risk_dollars:initial_risk,gross_realized_pnl:gross,net_realized_pnl:net,realized_r:rr,fill_count})
}

pub fn create_trade_with_entry(conn:&mut Connection,input:CreateTradeExecutionInput)->Result<TradeDetailDto,AppError>{
    if input.quantity<=0.0 {return Err(AppError::Validation("quantity must be greater than zero".into()));}
    validate_order_type(&input.order_type)?;
    let tx=conn.transaction()?;
    let (session_id,candidate_id,decision_type,direction):(String,Option<String>,String,Option<String>)=tx.query_row(
        "SELECT session_id,candidate_id,decision_type,intended_direction FROM candidate_decisions WHERE decision_id=?1",
        [&input.decision_id], |r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?))
    )?;
    if decision_type!="TRADE" {return Err(AppError::Validation("only a TRADE decision can create an executed trade".into()));}
    let direction=direction.ok_or_else(||AppError::Validation("trade decision has no direction".into()))?;
    let existing:Option<String>=tx.query_row("SELECT trade_id FROM trades WHERE decision_id=?1",[&input.decision_id],|r|r.get(0)).optional()?;
    if existing.is_some(){return Err(AppError::Validation("this decision already has a trade".into()));}
    let (tick_size,point_value)=instrument_spec_for_session(&tx,&session_id)?;
    if !price_tick_aligned(input.entry_price,tick_size) || !price_tick_aligned(input.stop_price,tick_size) {return Err(AppError::Validation(format!("entry and stop must align to tick size {tick_size}")));}
    if direction=="LONG" && input.stop_price>=input.entry_price {return Err(AppError::Validation("for a LONG trade, stop must be below entry".into()));}
    if direction=="SHORT" && input.stop_price<=input.entry_price {return Err(AppError::Validation("for a SHORT trade, stop must be above entry".into()));}
    let now=Utc::now().to_rfc3339(); let trade_id=Uuid::new_v4().to_string(); let fill_id=Uuid::new_v4().to_string(); let risk_id=Uuid::new_v4().to_string();
    let side=if direction=="LONG"{"BUY"}else{"SELL"};
    let risk=(input.entry_price-input.stop_price).abs()*point_value*input.quantity;
    tx.execute("INSERT INTO trades(trade_id,decision_id,session_id,candidate_id,direction,planned_entry_price,planned_stop_price,planned_target_price,status,provenance) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,'OPEN','NATIVE')",
        params![trade_id,input.decision_id,session_id,candidate_id,direction,input.entry_price,input.stop_price,input.planned_target_price])?;
    tx.execute("INSERT INTO execution_fills(execution_id,trade_id,occurred_at,action,side,price,quantity,order_type,commission,fees,source,note) VALUES(?1,?2,?3,'ENTRY',?4,?5,?6,?7,?8,?9,'MANUAL','Initial manual entry')",
        params![fill_id,trade_id,now,side,input.entry_price,input.quantity,input.order_type,input.commission,input.fees])?;
    tx.execute("INSERT INTO risk_snapshots(risk_snapshot_id,trade_id,occurred_at,snapshot_type,stop_price,quantity,risk_dollars,provenance) VALUES(?1,?2,?3,'INITIAL',?4,?5,?6,'NATIVE')",
        params![risk_id,trade_id,now,input.stop_price,input.quantity,risk])?;
    tx.commit()?;
    get_trade_detail(conn,&trade_id)
}

pub fn add_trade_fill(conn:&mut Connection,input:AddTradeFillInput)->Result<TradeDetailDto,AppError>{
    if input.quantity<=0.0{return Err(AppError::Validation("quantity must be greater than zero".into()));}
    if !matches!(input.action.as_str(),"ENTRY"|"EXIT"){return Err(AppError::Validation("action must be ENTRY or EXIT".into()));}
    validate_order_type(&input.order_type)?;
    let tx=conn.transaction()?;
    let (session_id,direction,status):(String,String,String)=tx.query_row("SELECT session_id,direction,status FROM trades WHERE trade_id=?1",[&input.trade_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?)))?;
    if matches!(status.as_str(),"CLOSED"|"CANCELLED"){return Err(AppError::Validation("closed/cancelled trades cannot receive new fills".into()));}
    let (tick_size,point_value)=instrument_spec_for_session(&tx,&session_id)?;
    if !price_tick_aligned(input.price,tick_size){return Err(AppError::Validation(format!("price must align to tick size {tick_size}")));}
    let (entry_qty,exit_qty):(f64,f64)=tx.query_row("SELECT COALESCE(SUM(CASE WHEN action='ENTRY' THEN quantity ELSE 0 END),0),COALESCE(SUM(CASE WHEN action='EXIT' THEN quantity ELSE 0 END),0) FROM execution_fills WHERE trade_id=?1",[&input.trade_id],|r|Ok((r.get(0)?,r.get(1)?)))?;
    if input.action=="EXIT" && input.quantity > (entry_qty-exit_qty)+1e-9{return Err(AppError::Validation("exit quantity exceeds open quantity".into()));}
    let side=match(direction.as_str(),input.action.as_str()){("LONG","ENTRY")=>"BUY",("LONG","EXIT")=>"SELL",("SHORT","ENTRY")=>"SELL",("SHORT","EXIT")=>"BUY",_=>return Err(AppError::Validation("invalid trade direction".into()))};
    let id=Uuid::new_v4().to_string(); let now=Utc::now().to_rfc3339();
    tx.execute("INSERT INTO execution_fills(execution_id,trade_id,occurred_at,action,side,price,quantity,order_type,commission,fees,source,note) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,'MANUAL',?11)",params![id,input.trade_id,now,input.action,side,input.price,input.quantity,input.order_type,input.commission,input.fees,input.note])?;
    let new_entry=entry_qty+if input.action=="ENTRY"{input.quantity}else{0.0}; let new_exit=exit_qty+if input.action=="EXIT"{input.quantity}else{0.0}; let open=(new_entry-new_exit).max(0.0);
    let new_status=if open<=1e-9 && new_entry>0.0{"CLOSED"}else if new_exit>0.0{"PARTIALLY_CLOSED"}else{"OPEN"};
    tx.execute("UPDATE trades SET status=?1 WHERE trade_id=?2",params![new_status,input.trade_id])?;
    if input.action=="ENTRY" {
        let latest_stop:Option<f64>=tx.query_row("SELECT stop_price FROM risk_snapshots WHERE trade_id=?1 AND stop_price IS NOT NULL ORDER BY occurred_at DESC,rowid DESC LIMIT 1",[&input.trade_id],|r|r.get(0)).optional()?;
        if let Some(stop)=latest_stop {
            let avg_entry:f64=tx.query_row("SELECT SUM(price*quantity)/SUM(quantity) FROM execution_fills WHERE trade_id=?1 AND action='ENTRY'",[&input.trade_id],|r|r.get(0))?;
            let rid=Uuid::new_v4().to_string(); let risk=(avg_entry-stop).abs()*point_value*new_entry;
            tx.execute("INSERT INTO risk_snapshots(risk_snapshot_id,trade_id,occurred_at,snapshot_type,stop_price,quantity,risk_dollars,change_reason,provenance) VALUES(?1,?2,?3,'MODIFIED',?4,?5,?6,'Position size changed','NATIVE')",params![rid,input.trade_id,now,stop,new_entry,risk])?;
        }
    }
    tx.commit()?; get_trade_detail(conn,&input.trade_id)
}

pub fn move_trade_stop(conn:&mut Connection,input:MoveStopInput)->Result<TradeDetailDto,AppError>{
    let tx=conn.transaction()?;
    let (session_id,direction,status):(String,String,String)=tx.query_row("SELECT session_id,direction,status FROM trades WHERE trade_id=?1",[&input.trade_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?)))?;
    if matches!(status.as_str(),"CLOSED"|"CANCELLED"){return Err(AppError::Validation("cannot move stop on a closed/cancelled trade".into()));}
    let (tick_size,point_value)=instrument_spec_for_session(&tx,&session_id)?; if !price_tick_aligned(input.stop_price,tick_size){return Err(AppError::Validation(format!("stop must align to tick size {tick_size}")));}
    let (entry_qty,exit_qty,avg_entry):(f64,f64,f64)=tx.query_row("SELECT COALESCE(SUM(CASE WHEN action='ENTRY' THEN quantity ELSE 0 END),0),COALESCE(SUM(CASE WHEN action='EXIT' THEN quantity ELSE 0 END),0),COALESCE(SUM(CASE WHEN action='ENTRY' THEN price*quantity ELSE 0 END)/NULLIF(SUM(CASE WHEN action='ENTRY' THEN quantity ELSE 0 END),0),0) FROM execution_fills WHERE trade_id=?1",[&input.trade_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?)))?;
    if direction=="LONG" && input.stop_price>=avg_entry { /* BE/profit stops are valid; no rejection */ }
    if direction=="SHORT" && input.stop_price<=avg_entry { /* BE/profit stops are valid; no rejection */ }
    let open=(entry_qty-exit_qty).max(0.0); let risk=(avg_entry-input.stop_price).abs()*point_value*open; let now=Utc::now().to_rfc3339(); let id=Uuid::new_v4().to_string();
    tx.execute("INSERT INTO risk_snapshots(risk_snapshot_id,trade_id,occurred_at,snapshot_type,stop_price,quantity,risk_dollars,change_reason,was_rule_compliant,provenance) VALUES(?1,?2,?3,'MODIFIED',?4,?5,?6,?7,?8,'NATIVE')",params![id,input.trade_id,now,input.stop_price,open,risk,input.reason,input.was_rule_compliant.map(|x|if x{1}else{0})])?;
    tx.commit()?; get_trade_detail(conn,&input.trade_id)
}

pub fn get_trade_detail(conn:&Connection,trade_id:&str)->Result<TradeDetailDto,AppError>{
    let metrics=trade_metrics(conn,trade_id)?;
    let mut stmt=conn.prepare("SELECT execution_id,occurred_at,action,side,price,quantity,order_type,commission,fees,note FROM execution_fills WHERE trade_id=?1 ORDER BY COALESCE(occurred_at,''),rowid")?;
    let rows=stmt.query_map([trade_id],|r|Ok(ExecutionFillDto{execution_id:r.get(0)?,occurred_at:r.get(1)?,action:r.get(2)?,side:r.get(3)?,price:r.get(4)?,quantity:r.get(5)?,order_type:r.get(6)?,commission:r.get(7)?,fees:r.get(8)?,note:r.get(9)?}))?;
    Ok(TradeDetailDto{metrics,fills:rows.collect::<Result<Vec<_>,_>>()?})
}

pub fn list_session_trades(conn:&Connection,session_id:&str)->Result<Vec<TradeMetricsDto>,AppError>{
    let mut stmt=conn.prepare("SELECT trade_id FROM trades WHERE session_id=?1 ORDER BY rowid DESC")?;
    let ids=stmt.query_map([session_id],|r|r.get::<_,String>(0))?.collect::<Result<Vec<_>,_>>()?;
    ids.into_iter().map(|id|trade_metrics(conn,&id)).collect()
}

// =============================
// Phase 4 v0.8 — Lightweight Post-Trade Review Core
// =============================

#[derive(Debug, Serialize)]
pub struct MistakeTypeDto {
    pub mistake_type_id: String,
    pub code: String,
    pub label: String,
    pub mistake_group: String,
}

#[derive(Debug, Deserialize)]
pub struct SaveTradeReviewInput {
    pub trade_id: String,
    pub decision_quality: Option<String>,
    pub execution_quality: Option<String>,
    pub management_quality: Option<String>,
    pub exit_reason_code: Option<String>,
    pub exit_reason_note: Option<String>,
    pub emotion_affected: Option<bool>,
    pub psychology_state: Option<String>,
    pub psychology_intensity: Option<i64>,
    pub psychology_stage: Option<String>,
    pub mistake_type_ids: Vec<String>,
    pub note: Option<String>,
    pub finalize: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct TradeReviewDto {
    pub review_id: String,
    pub trade_id: String,
    pub status: String,
    pub decision_quality: Option<String>,
    pub execution_quality: Option<String>,
    pub management_quality: Option<String>,
    pub exit_reason_code: Option<String>,
    pub exit_reason_note: Option<String>,
    pub emotion_affected: Option<bool>,
    pub psychology_state: Option<String>,
    pub psychology_intensity: Option<i64>,
    pub psychology_stage: Option<String>,
    pub mistake_type_ids: Vec<String>,
    pub note: Option<String>,
    pub completed_at: Option<String>,
}

fn seed_mistake_types(conn: &Connection) -> Result<(), AppError> {
    let items = [
        ("EARLY_ENTRY","Early Entry","ENTRY"),("LATE_ENTRY","Late Entry","ENTRY"),("CHASE","Chase","ENTRY"),("NO_CONFIRMATION","No Confirmation","ENTRY"),
        ("OVERSIZING","Oversizing","RISK"),("STOP_MOVED","Stop Moved","RISK"),
        ("FOMO","FOMO","DISCIPLINE"),("REVENGE","Revenge","DISCIPLINE"),("OVERTRADING","Overtrading","DISCIPLINE"),("OUTSIDE_PLAN","Outside Plan","DISCIPLINE"),("IGNORED_INVALIDATION","Ignored Invalidation","DISCIPLINE"),
        ("EXIT_TOO_EARLY","Exit Too Early","EXIT"),("EXIT_TOO_LATE","Exit Too Late","EXIT"),
        ("WRONG_LEVEL","Wrong Level","CONTEXT"),("MISREAD_CONTEXT","Misread Context","CONTEXT"),("OTHER","Other","OTHER")
    ];
    for (code,label,group) in items {
        let id=format!("mistake-{code}");
        conn.execute("INSERT OR IGNORE INTO mistake_types(mistake_type_id,code,label,mistake_group,active,user_defined) VALUES(?1,?2,?3,?4,1,0)",params![id,code,label,group])?;
    }
    Ok(())
}

pub fn list_mistake_types(conn:&Connection)->Result<Vec<MistakeTypeDto>,AppError>{
    seed_mistake_types(conn)?;
    let mut stmt=conn.prepare("SELECT mistake_type_id,code,label,mistake_group FROM mistake_types WHERE active=1 ORDER BY mistake_group,label")?;
    let rows=stmt.query_map([],|r|Ok(MistakeTypeDto{mistake_type_id:r.get(0)?,code:r.get(1)?,label:r.get(2)?,mistake_group:r.get(3)?}))?;
    Ok(rows.collect::<Result<Vec<_>,_>>()?)
}

fn validate_review_input(input:&SaveTradeReviewInput)->Result<(),AppError>{
    if let Some(v)=&input.decision_quality { if !matches!(v.as_str(),"A"|"B"|"C"|"INVALID"|"UNCLEAR") {return Err(AppError::Validation("invalid decision quality".into()));} }
    if let Some(v)=&input.execution_quality { if !matches!(v.as_str(),"GOOD"|"ACCEPTABLE"|"NEEDS_IMPROVEMENT"|"UNCLEAR") {return Err(AppError::Validation("invalid execution quality".into()));} }
    if let Some(v)=&input.management_quality { if !matches!(v.as_str(),"GOOD"|"ACCEPTABLE"|"NEEDS_IMPROVEMENT"|"UNCLEAR") {return Err(AppError::Validation("invalid management quality".into()));} }
    if let Some(v)=input.psychology_intensity { if !(1..=5).contains(&v) {return Err(AppError::Validation("psychology intensity must be 1-5".into()));} }
    if let Some(v)=&input.psychology_stage { if !matches!(v.as_str(),"ENTRY"|"MANAGEMENT"|"EXIT"|"MULTIPLE") {return Err(AppError::Validation("invalid psychology stage".into()));} }
    if input.emotion_affected==Some(false) && (input.psychology_state.is_some() || input.psychology_intensity.is_some() || input.psychology_stage.is_some()) {
        return Err(AppError::Validation("psychology details should be empty when emotion did not affect the trade".into()));
    }
    if input.emotion_affected==Some(true) {
        if input.psychology_state.as_deref().unwrap_or("").trim().is_empty() {
            return Err(AppError::Validation("psychology state is required when emotion affected the trade".into()));
        }
        if input.psychology_stage.as_deref().unwrap_or("").trim().is_empty() {
            return Err(AppError::Validation("affected stage is required when emotion affected the trade".into()));
        }
    }
    Ok(())
}

pub fn save_trade_review(conn:&mut Connection,input:SaveTradeReviewInput)->Result<TradeReviewDto,AppError>{
    validate_review_input(&input)?;
    seed_mistake_types(conn)?;
    let tx=conn.transaction()?;
    let trade_status:String=tx.query_row("SELECT status FROM trades WHERE trade_id=?1",[&input.trade_id],|r|r.get(0))?;
    if trade_status!="CLOSED" && input.finalize==Some(true) {return Err(AppError::Validation("only a closed trade can finalize post-trade review".into()));}
    let existing:Option<(String,String)>=tx.query_row("SELECT review_id,status FROM trade_reviews WHERE trade_id=?1",[&input.trade_id],|r|Ok((r.get(0)?,r.get(1)?))).optional()?;
    if let Some((_,status))=&existing { if status=="COMPLETED" {return Err(AppError::Validation("completed trade review is immutable".into()));} }
    let now=Utc::now().to_rfc3339();
    let review_id=existing.as_ref().map(|x|x.0.clone()).unwrap_or_else(||Uuid::new_v4().to_string());
    let status=if input.finalize==Some(true){"COMPLETED"}else{"DRAFT"};
    let completed=if status=="COMPLETED"{Some(now.clone())}else{None};
    if existing.is_some(){
        tx.execute("UPDATE trade_reviews SET status=?1,updated_at=?2,completed_at=?3,decision_quality=?4,execution_quality=?5,management_quality=?6,exit_reason_code=?7,exit_reason_note=?8,emotion_affected=?9,psychology_state=?10,psychology_intensity=?11,psychology_stage=?12,note=?13 WHERE review_id=?14",
            params![status,now,completed,input.decision_quality,input.execution_quality,input.management_quality,input.exit_reason_code,input.exit_reason_note,input.emotion_affected.map(|x|if x{1}else{0}),input.psychology_state,input.psychology_intensity,input.psychology_stage,input.note,review_id])?;
        tx.execute("DELETE FROM trade_mistakes WHERE review_id=?1",[&review_id])?;
    } else {
        tx.execute("INSERT INTO trade_reviews(review_id,trade_id,status,created_at,updated_at,completed_at,decision_quality,execution_quality,management_quality,exit_reason_code,exit_reason_note,emotion_affected,psychology_state,psychology_intensity,psychology_stage,note) VALUES(?1,?2,?3,?4,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)",
            params![review_id,input.trade_id,status,now,completed,input.decision_quality,input.execution_quality,input.management_quality,input.exit_reason_code,input.exit_reason_note,input.emotion_affected.map(|x|if x{1}else{0}),input.psychology_state,input.psychology_intensity,input.psychology_stage,input.note])?;
    }
    for mid in &input.mistake_type_ids {
        let exists:i64=tx.query_row("SELECT COUNT(*) FROM mistake_types WHERE mistake_type_id=?1 AND active=1",[mid],|r|r.get(0))?;
        if exists==0{return Err(AppError::Validation(format!("unknown mistake type: {mid}")));}
        tx.execute("INSERT INTO trade_mistakes(trade_mistake_id,trade_id,review_id,mistake_type_id,occurred_at,provenance) VALUES(?1,?2,?3,?4,?5,'NATIVE')",params![Uuid::new_v4().to_string(),input.trade_id,review_id,mid,now])?;
    }
    tx.commit()?;
    get_trade_review(conn,&input.trade_id)?.ok_or_else(||AppError::Validation("trade review was not saved".into()))
}

pub fn get_trade_review(conn:&Connection,trade_id:&str)->Result<Option<TradeReviewDto>,AppError>{
    let base:Option<(String,String,Option<String>,Option<String>,Option<String>,Option<String>,Option<String>,Option<i64>,Option<String>,Option<i64>,Option<String>,Option<String>,Option<String>)>=conn.query_row(
        "SELECT review_id,status,decision_quality,execution_quality,management_quality,exit_reason_code,exit_reason_note,emotion_affected,psychology_state,psychology_intensity,psychology_stage,note,completed_at FROM trade_reviews WHERE trade_id=?1",
        [trade_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?,r.get(5)?,r.get(6)?,r.get(7)?,r.get(8)?,r.get(9)?,r.get(10)?,r.get(11)?,r.get(12)?))
    ).optional()?;
    let Some((review_id,status,dq,eq,mq,exit_code,exit_note,emotion_int,psy_state,psy_intensity,psy_stage,note,completed_at))=base else{return Ok(None)};
    let mut stmt=conn.prepare("SELECT mistake_type_id FROM trade_mistakes WHERE review_id=?1 ORDER BY rowid")?;
    let mids=stmt.query_map([&review_id],|r|r.get::<_,String>(0))?.collect::<Result<Vec<_>,_>>()?;
    Ok(Some(TradeReviewDto{review_id,trade_id:trade_id.into(),status,decision_quality:dq,execution_quality:eq,management_quality:mq,exit_reason_code:exit_code,exit_reason_note:exit_note,emotion_affected:emotion_int.map(|x|x!=0),psychology_state:psy_state,psychology_intensity:psy_intensity,psychology_stage:psy_stage,mistake_type_ids:mids,note,completed_at}))
}

// =============================
// Phase 5 v0.9 — Rule Adherence + Lightweight Session Review
// =============================

#[derive(Debug, Serialize)]
pub struct RuleDto {
    pub rule_id: String,
    pub rule_version_id: String,
    pub code: String,
    pub label: String,
    pub scope: String,
    pub version_label: String,
}

#[derive(Debug, Deserialize)]
pub struct SaveTradeRuleCheckInput {
    pub trade_id: String,
    pub any_violation: bool,
    pub violated_rule_version_ids: Vec<String>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TradeRuleCheckDto {
    pub trade_rule_check_id: String,
    pub trade_id: String,
    pub any_violation: bool,
    pub violated_rule_version_ids: Vec<String>,
    pub note: Option<String>,
    pub checked_at: String,
}

#[derive(Debug, Serialize)]
pub struct SessionReviewSummaryDto {
    pub session_id: String,
    pub trade_count: i64,
    pub closed_trade_count: i64,
    pub open_trade_count: i64,
    pub no_trade_count: i64,
    pub missed_count: i64,
    pub net_r: Option<f64>,
    pub rule_violation_count: i64,
    pub mistake_count: i64,
    pub good_decision_count: i64,
    pub weak_decision_count: i64,
}

#[derive(Debug, Deserialize)]
pub struct SaveSessionReviewInput {
    pub session_id: String,
    pub what_went_well: Option<String>,
    pub what_went_poorly: Option<String>,
    pub best_decision: Option<String>,
    pub biggest_mistake: Option<String>,
    pub market_learning: Option<String>,
    pub next_improvement: Option<String>,
    pub plan_quality: Option<String>,
    pub setup_selection: Option<String>,
    pub execution: Option<String>,
    pub risk_management: Option<String>,
    pub discipline: Option<String>,
    pub trade_management: Option<String>,
    pub overall_assessment: Option<String>,
    pub notes: Option<String>,
    pub finalize: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct SessionReviewDto {
    pub review_id: String,
    pub session_id: String,
    pub status: String,
    pub what_went_well: Option<String>,
    pub what_went_poorly: Option<String>,
    pub best_decision: Option<String>,
    pub biggest_mistake: Option<String>,
    pub market_learning: Option<String>,
    pub next_improvement: Option<String>,
    pub plan_quality: Option<String>,
    pub setup_selection: Option<String>,
    pub execution: Option<String>,
    pub risk_management: Option<String>,
    pub discipline: Option<String>,
    pub trade_management: Option<String>,
    pub overall_assessment: Option<String>,
    pub notes: Option<String>,
    pub completed_at: Option<String>,
}

fn seed_rules(conn: &Connection) -> Result<(), AppError> {
    let workspace_id = ensure_default_workspace(conn)?;
    let now = Utc::now().to_rfc3339();
    let items = [
        ("NO_CHASING", "No chasing", "TRADE"),
        ("NO_REVENGE", "No revenge trade", "TRADE"),
        ("NO_STOP_WIDENING", "Do not widen stop without valid plan reason", "TRADE"),
        ("NO_OVERSIZING", "Correct position size", "TRADE"),
        ("NO_OUTSIDE_PLAN", "No unauthorized / outside-plan trade", "TRADE"),
        ("NO_OVERTRADING", "No overtrading", "BOTH"),
        ("MAX_DAILY_TRADES", "Respect maximum daily trades", "SESSION"),
        ("MAX_DAILY_RISK", "Respect maximum daily risk", "SESSION"),
        ("OTHER_RULE_VIOLATION", "Other rule violation", "BOTH"),
    ];
    for (code,label,scope) in items {
        let rule_id=format!("rule-{code}");
        let version_id=format!("rulever-{code}-1");
        conn.execute("INSERT OR IGNORE INTO rules(rule_id,workspace_id,code,label,scope,active,user_defined) VALUES(?1,?2,?3,?4,?5,1,0)",params![rule_id,workspace_id,code,label,scope])?;
        conn.execute("INSERT OR IGNORE INTO rule_versions(rule_version_id,rule_id,version_label,effective_from,definition,status) VALUES(?1,?2,'1.0',?3,?4,'ACTIVE')",params![version_id,rule_id,now,label])?;
    }
    Ok(())
}

pub fn list_rules(conn:&Connection)->Result<Vec<RuleDto>,AppError>{
    seed_rules(conn)?;
    let mut stmt=conn.prepare("SELECT r.rule_id,rv.rule_version_id,r.code,r.label,r.scope,rv.version_label FROM rules r JOIN rule_versions rv ON rv.rule_id=r.rule_id WHERE r.active=1 AND rv.status='ACTIVE' ORDER BY r.scope,r.label")?;
    let rows=stmt.query_map([],|r|Ok(RuleDto{rule_id:r.get(0)?,rule_version_id:r.get(1)?,code:r.get(2)?,label:r.get(3)?,scope:r.get(4)?,version_label:r.get(5)?}))?;
    Ok(rows.collect::<Result<Vec<_>,_>>()?)
}

pub fn save_trade_rule_check(conn:&mut Connection,input:SaveTradeRuleCheckInput)->Result<TradeRuleCheckDto,AppError>{
    seed_rules(conn)?;
    if input.any_violation && input.violated_rule_version_ids.is_empty(){return Err(AppError::Validation("select at least one violated rule, or choose no rule violation".into()));}
    if !input.any_violation && !input.violated_rule_version_ids.is_empty(){return Err(AppError::Validation("violated rules must be empty when no violation is reported".into()));}
    let tx=conn.transaction()?;
    let trade_exists:i64=tx.query_row("SELECT COUNT(*) FROM trades WHERE trade_id=?1",[&input.trade_id],|r|r.get(0))?;
    if trade_exists==0{return Err(AppError::Validation("unknown trade".into()));}
    let completed:i64=tx.query_row("SELECT COUNT(*) FROM trade_reviews WHERE trade_id=?1 AND status='COMPLETED'",[&input.trade_id],|r|r.get(0))?;
    if completed>0{return Err(AppError::Validation("rule check is locked after trade review completion".into()));}
    let now=Utc::now().to_rfc3339();
    let existing:Option<String>=tx.query_row("SELECT trade_rule_check_id FROM trade_rule_checks WHERE trade_id=?1",[&input.trade_id],|r|r.get(0)).optional()?;
    let id=existing.unwrap_or_else(||Uuid::new_v4().to_string());
    tx.execute("DELETE FROM rule_assessments WHERE trade_id=?1",[&input.trade_id])?;
    if tx.query_row("SELECT COUNT(*) FROM trade_rule_checks WHERE trade_id=?1",[&input.trade_id],|r|r.get::<_,i64>(0))?>0 {
        tx.execute("UPDATE trade_rule_checks SET checked_at=?1,any_violation=?2,note=?3 WHERE trade_id=?4",params![now,if input.any_violation{1}else{0},input.note,input.trade_id])?;
    } else {
        tx.execute("INSERT INTO trade_rule_checks(trade_rule_check_id,trade_id,checked_at,any_violation,note,provenance) VALUES(?1,?2,?3,?4,?5,'NATIVE')",params![id,input.trade_id,now,if input.any_violation{1}else{0},input.note])?;
    }
    for rv in &input.violated_rule_version_ids {
        let active:i64=tx.query_row("SELECT COUNT(*) FROM rule_versions WHERE rule_version_id=?1 AND status='ACTIVE'",[rv],|r|r.get(0))?;
        if active==0{return Err(AppError::Validation(format!("unknown or inactive rule version: {rv}")));}
        tx.execute("INSERT INTO rule_assessments(rule_assessment_id,rule_version_id,trade_id,assessed_at,result,provenance) VALUES(?1,?2,?3,?4,'VIOLATED','NATIVE')",params![Uuid::new_v4().to_string(),rv,input.trade_id,now])?;
    }
    tx.commit()?;
    get_trade_rule_check(conn,&input.trade_id)?.ok_or_else(||AppError::Validation("rule check was not saved".into()))
}

pub fn get_trade_rule_check(conn:&Connection,trade_id:&str)->Result<Option<TradeRuleCheckDto>,AppError>{
    let base:Option<(String,String,i64,Option<String>)>=conn.query_row("SELECT trade_rule_check_id,checked_at,any_violation,note FROM trade_rule_checks WHERE trade_id=?1",[trade_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?))).optional()?;
    let Some((id,checked_at,any_int,note))=base else{return Ok(None)};
    let mut stmt=conn.prepare("SELECT rule_version_id FROM rule_assessments WHERE trade_id=?1 AND result='VIOLATED' ORDER BY rowid")?;
    let violated=stmt.query_map([trade_id],|r|r.get::<_,String>(0))?.collect::<Result<Vec<_>,_>>()?;
    Ok(Some(TradeRuleCheckDto{trade_rule_check_id:id,trade_id:trade_id.into(),any_violation:any_int!=0,violated_rule_version_ids:violated,note,checked_at}))
}

fn validate_session_grade(v:&Option<String>)->Result<(),AppError>{
    if let Some(x)=v { if !matches!(x.as_str(),"GOOD"|"ACCEPTABLE"|"NEEDS_IMPROVEMENT"|"NA") {return Err(AppError::Validation("invalid session review grade".into()));} }
    Ok(())
}

pub fn get_session_review_summary(conn:&Connection,session_id:&str)->Result<SessionReviewSummaryDto,AppError>{
    let trade_count:i64=conn.query_row("SELECT COUNT(*) FROM trades WHERE session_id=?1",[session_id],|r|r.get(0))?;
    let closed_trade_count:i64=conn.query_row("SELECT COUNT(*) FROM trades WHERE session_id=?1 AND status='CLOSED'",[session_id],|r|r.get(0))?;
    let open_trade_count:i64=conn.query_row("SELECT COUNT(*) FROM trades WHERE session_id=?1 AND status IN ('OPEN','PARTIALLY_CLOSED')",[session_id],|r|r.get(0))?;
    let no_trade_count:i64=conn.query_row("SELECT COUNT(*) FROM candidate_decisions WHERE session_id=?1 AND decision_type='NO_TRADE'",[session_id],|r|r.get(0))?;
    let missed_count:i64=conn.query_row("SELECT COUNT(*) FROM candidate_decisions WHERE session_id=?1 AND decision_type='MISSED'",[session_id],|r|r.get(0))?;
    let rule_violation_count:i64=conn.query_row("SELECT COUNT(*) FROM rule_assessments ra JOIN trades t ON t.trade_id=ra.trade_id WHERE t.session_id=?1 AND ra.result='VIOLATED'",[session_id],|r|r.get(0))?;
    let mistake_count:i64=conn.query_row("SELECT COUNT(*) FROM trade_mistakes tm JOIN trades t ON t.trade_id=tm.trade_id WHERE t.session_id=?1",[session_id],|r|r.get(0))?;
    let good_decision_count:i64=conn.query_row("SELECT COUNT(*) FROM trade_reviews tr JOIN trades t ON t.trade_id=tr.trade_id WHERE t.session_id=?1 AND tr.decision_quality IN ('A','B')",[session_id],|r|r.get(0))?;
    let weak_decision_count:i64=conn.query_row("SELECT COUNT(*) FROM trade_reviews tr JOIN trades t ON t.trade_id=tr.trade_id WHERE t.session_id=?1 AND tr.decision_quality IN ('C','INVALID')",[session_id],|r|r.get(0))?;
    let metrics=list_session_trades(conn,session_id)?;
    let mut net=0.0; let mut has_r=false;
    for m in metrics { if let Some(r)=m.realized_r {net+=r;has_r=true;} }
    Ok(SessionReviewSummaryDto{session_id:session_id.into(),trade_count,closed_trade_count,open_trade_count,no_trade_count,missed_count,net_r:if has_r{Some(net)}else{None},rule_violation_count,mistake_count,good_decision_count,weak_decision_count})
}

pub fn save_session_review(conn:&mut Connection,input:SaveSessionReviewInput)->Result<SessionReviewDto,AppError>{
    for v in [&input.plan_quality,&input.setup_selection,&input.execution,&input.risk_management,&input.discipline,&input.trade_management,&input.overall_assessment] { validate_session_grade(v)?; }
    let tx=conn.transaction()?;
    let status:String=tx.query_row("SELECT status FROM sessions WHERE session_id=?1",[&input.session_id],|r|r.get(0))?;
    if !matches!(status.as_str(),"ACTIVE"|"CLOSED") {return Err(AppError::Validation("session review requires an active or closed session".into()));}
    if input.finalize==Some(true) {
        let open:i64=tx.query_row("SELECT COUNT(*) FROM trades WHERE session_id=?1 AND status IN ('OPEN','PARTIALLY_CLOSED')",[&input.session_id],|r|r.get(0))?;
        if open>0{return Err(AppError::Validation("close or resolve open trades before completing session review".into()));}
    }
    let existing:Option<(String,String)>=tx.query_row("SELECT review_id,status FROM session_reviews WHERE session_id=?1",[&input.session_id],|r|Ok((r.get(0)?,r.get(1)?))).optional()?;
    if let Some((_,s))=&existing {if s=="COMPLETED" {return Err(AppError::Validation("completed session review is immutable".into()));}}
    let now=Utc::now().to_rfc3339(); let review_id=existing.as_ref().map(|x|x.0.clone()).unwrap_or_else(||Uuid::new_v4().to_string());
    let review_status=if input.finalize==Some(true){"COMPLETED"}else{"DRAFT"}; let completed=if review_status=="COMPLETED"{Some(now.clone())}else{None};
    if existing.is_some(){
        tx.execute("UPDATE session_reviews SET status=?1,completed_at=?2,what_went_well=?3,what_went_poorly=?4,best_decision=?5,biggest_mistake=?6,market_learning=?7,next_improvement=?8,plan_quality=?9,setup_selection=?10,execution=?11,risk_management=?12,discipline=?13,trade_management=?14,overall_assessment=?15,notes=?16,updated_at=?17 WHERE review_id=?18",
            params![review_status,completed,input.what_went_well,input.what_went_poorly,input.best_decision,input.biggest_mistake,input.market_learning,input.next_improvement,input.plan_quality,input.setup_selection,input.execution,input.risk_management,input.discipline,input.trade_management,input.overall_assessment,input.notes,now,review_id])?;
    } else {
        tx.execute("INSERT INTO session_reviews(review_id,session_id,status,created_at,completed_at,what_went_well,what_went_poorly,best_decision,biggest_mistake,market_learning,next_improvement,plan_quality,setup_selection,execution,risk_management,discipline,trade_management,overall_assessment,notes,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?4)",
            params![review_id,input.session_id,review_status,now,completed,input.what_went_well,input.what_went_poorly,input.best_decision,input.biggest_mistake,input.market_learning,input.next_improvement,input.plan_quality,input.setup_selection,input.execution,input.risk_management,input.discipline,input.trade_management,input.overall_assessment,input.notes])?;
    }
    if review_status=="COMPLETED" {tx.execute("UPDATE sessions SET status='CLOSED',closed_at=?1,updated_at=?1 WHERE session_id=?2",params![now,input.session_id])?;}
    tx.commit()?;
    get_session_review(conn,&input.session_id)?.ok_or_else(||AppError::Validation("session review was not saved".into()))
}

pub fn get_session_review(conn:&Connection,session_id:&str)->Result<Option<SessionReviewDto>,AppError>{
    conn.query_row("SELECT review_id,session_id,status,what_went_well,what_went_poorly,best_decision,biggest_mistake,market_learning,next_improvement,plan_quality,setup_selection,execution,risk_management,discipline,trade_management,overall_assessment,notes,completed_at FROM session_reviews WHERE session_id=?1",[session_id],|r|Ok(SessionReviewDto{review_id:r.get(0)?,session_id:r.get(1)?,status:r.get(2)?,what_went_well:r.get(3)?,what_went_poorly:r.get(4)?,best_decision:r.get(5)?,biggest_mistake:r.get(6)?,market_learning:r.get(7)?,next_improvement:r.get(8)?,plan_quality:r.get(9)?,setup_selection:r.get(10)?,execution:r.get(11)?,risk_management:r.get(12)?,discipline:r.get(13)?,trade_management:r.get(14)?,overall_assessment:r.get(15)?,notes:r.get(16)?,completed_at:r.get(17)?})).optional().map_err(AppError::from)
}

// ---------------- Phase 6: Basic Journal + Analytics Core ----------------
#[derive(Debug, Deserialize, Default, Clone)]
pub struct JournalFilterInput {
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub instrument_symbol: Option<String>,
    pub direction: Option<String>,
    pub decision_quality: Option<String>,
    pub rule_status: Option<String>, // FOLLOWED / VIOLATED / UNCHECKED
    pub level_source_type_id: Option<String>,
    pub evidence_type_id: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct JournalTradeRowDto {
    pub trade_id: String,
    pub session_id: String,
    pub session_date: String,
    pub instrument_symbol: String,
    pub direction: String,
    pub status: String,
    pub candidate_label: Option<String>,
    pub decision_quality: Option<String>,
    pub rule_status: String,
    pub level_sources: Vec<String>,
    pub mistakes: Vec<String>,
    pub realized_r: Option<f64>,
    pub net_realized_pnl: Option<f64>,
    pub open_quantity: f64,
}

#[derive(Debug, Serialize)]
pub struct AnalyticsSummaryDto {
    pub trade_count: i64,
    pub eligible_r_count: i64,
    pub wins: i64,
    pub losses: i64,
    pub breakeven: i64,
    pub win_rate: Option<f64>,
    pub average_r: Option<f64>,
    pub median_r: Option<f64>,
    pub net_r: Option<f64>,
    pub average_winner_r: Option<f64>,
    pub average_loser_r: Option<f64>,
    pub profit_factor_r: Option<f64>,
    pub expectancy_r: Option<f64>,
    pub net_pnl: Option<f64>,
    pub rule_violation_trades: i64,
    pub bad_decision_win_count: i64,
    pub small_sample: bool,
}

#[derive(Debug, Serialize)]
pub struct MistakeSummaryDto {
    pub mistake_type_id: String,
    pub label: String,
    pub count: i64,
}

fn trade_level_sources(conn:&Connection, candidate_id:&Option<String>)->Result<Vec<(String,String)>,AppError>{
    let Some(cid)=candidate_id else{return Ok(Vec::new())};
    let latest:Option<String>=conn.query_row(
        "SELECT candidate_revision_id FROM candidate_revisions WHERE candidate_id=?1 ORDER BY revision_number DESC LIMIT 1",
        [cid], |r| r.get(0)
    ).optional()?;
    let Some(rev)=latest else{return Ok(Vec::new())};
    let mut stmt=conn.prepare("SELECT lst.source_type_id,lst.label FROM candidate_sources cs JOIN level_source_types lst ON lst.source_type_id=cs.source_type_id WHERE cs.candidate_revision_id=?1 ORDER BY cs.is_primary DESC,lst.label")?;
    let rows = stmt.query_map([rev],|r|Ok((r.get(0)?,r.get(1)?)))?.collect::<Result<Vec<_>,_>>()?;
    Ok(rows)
}

fn trade_mistake_labels(conn:&Connection,trade_id:&str)->Result<Vec<String>,AppError>{
    let mut stmt=conn.prepare("SELECT mt.label FROM trade_mistakes tm JOIN mistake_types mt ON mt.mistake_type_id=tm.mistake_type_id WHERE tm.trade_id=?1 ORDER BY mt.label")?;
    let rows = stmt.query_map([trade_id],|r|r.get::<_,String>(0))?.collect::<Result<Vec<_>,_>>()?;
    Ok(rows)
}

fn trade_has_evidence(conn:&Connection,trade_id:&str,candidate_id:&Option<String>,evidence_type_id:&str)->Result<bool,AppError>{
    let n:i64=conn.query_row(
        "SELECT COUNT(*) FROM evidence_observations WHERE evidence_type_id=?1 AND present=1 AND (trade_id=?2 OR (?3 IS NOT NULL AND candidate_id=?3))",
        params![evidence_type_id,trade_id,candidate_id], |r|r.get(0)
    )?;
    Ok(n>0)
}

pub fn list_journal_trades(conn:&Connection,filter:JournalFilterInput)->Result<Vec<JournalTradeRowDto>,AppError>{
    let mut stmt=conn.prepare(
        "SELECT t.trade_id,t.session_id,s.session_date,COALESCE(s.instrument_symbol_snapshot,i.symbol),t.direction,t.status,t.candidate_id,c.label,COALESCE(tr.decision_quality,t.decision_quality,cd.decision_quality),COALESCE(trc.any_violation,-1)
         FROM trades t
         JOIN sessions s ON s.session_id=t.session_id
         JOIN instruments i ON i.instrument_id=s.instrument_id
         JOIN candidate_decisions cd ON cd.decision_id=t.decision_id
         LEFT JOIN candidates c ON c.candidate_id=t.candidate_id
         LEFT JOIN trade_reviews tr ON tr.trade_id=t.trade_id
         LEFT JOIN trade_rule_checks trc ON trc.trade_id=t.trade_id
         ORDER BY s.session_date DESC, COALESCE((SELECT MIN(occurred_at) FROM execution_fills ef WHERE ef.trade_id=t.trade_id),'') DESC"
    )?;
    let base=stmt.query_map([],|r|Ok((
        r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,r.get::<_,String>(3)?,r.get::<_,String>(4)?,r.get::<_,String>(5)?,
        r.get::<_,Option<String>>(6)?,r.get::<_,Option<String>>(7)?,r.get::<_,Option<String>>(8)?,r.get::<_,i64>(9)?
    )))?.collect::<Result<Vec<_>,_>>()?;
    let mut out=Vec::new();
    for (trade_id,session_id,session_date,instrument,direction,status,candidate_id,candidate_label,decision_quality,rule_flag) in base {
        if let Some(v)=&filter.date_from {if session_date.as_str() < v.as_str() {continue;}}
        if let Some(v)=&filter.date_to {if session_date.as_str() > v.as_str() {continue;}}
        if let Some(v)=&filter.instrument_symbol {if instrument.as_str() != v.as_str() {continue;}}
        if let Some(v)=&filter.direction {if direction.as_str() != v.as_str() {continue;}}
        if let Some(v)=&filter.decision_quality {if decision_quality.as_deref()!=Some(v.as_str()) {continue;}}
        let rule_status=match rule_flag {1=>"VIOLATED",0=>"FOLLOWED",_=>"UNCHECKED"}.to_string();
        if let Some(v)=&filter.rule_status {if rule_status.as_str() != v.as_str() {continue;}}
        let sources=trade_level_sources(conn,&candidate_id)?;
        if let Some(v)=&filter.level_source_type_id {if !sources.iter().any(|(id,_)|id==v){continue;}}
        if let Some(v)=&filter.evidence_type_id {if !trade_has_evidence(conn,&trade_id,&candidate_id,v)?{continue;}}
        let metrics=trade_metrics(conn,&trade_id)?;
        out.push(JournalTradeRowDto{
            trade_id,session_id,session_date,instrument_symbol:instrument,direction,status,candidate_label,decision_quality,rule_status,
            level_sources:sources.into_iter().map(|(_,label)|label).collect(),mistakes:trade_mistake_labels(conn,&metrics.trade_id)?,
            realized_r:metrics.realized_r,net_realized_pnl:metrics.net_realized_pnl,open_quantity:metrics.open_quantity
        });
    }
    Ok(out)
}

pub fn get_analytics_summary(conn:&Connection,filter:JournalFilterInput)->Result<AnalyticsSummaryDto,AppError>{
    let rows=list_journal_trades(conn,filter)?;
    let closed:Vec<&JournalTradeRowDto>=rows.iter().filter(|x|x.status=="CLOSED").collect();
    let mut rs:Vec<f64>=closed.iter().filter_map(|x|x.realized_r).collect();
    let pnls:Vec<f64>=closed.iter().filter_map(|x|x.net_realized_pnl).collect();
    let wins=rs.iter().filter(|x|**x>1e-9).count() as i64;
    let losses=rs.iter().filter(|x|**x< -1e-9).count() as i64;
    let breakeven=rs.iter().filter(|x|x.abs()<=1e-9).count() as i64;
    let eligible=rs.len() as i64;
    let win_rate=if eligible>0{Some(wins as f64/eligible as f64*100.0)}else{None};
    let net_r=if rs.is_empty(){None}else{Some(rs.iter().sum())};
    let average_r=net_r.map(|n|n/eligible as f64);
    rs.sort_by(|a,b|a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let median_r=if rs.is_empty(){None}else{let n=rs.len();Some(if n%2==1{rs[n/2]}else{(rs[n/2-1]+rs[n/2])/2.0})};
    let winners:Vec<f64>=rs.iter().copied().filter(|x|*x>1e-9).collect();
    let losers:Vec<f64>=rs.iter().copied().filter(|x|*x< -1e-9).collect();
    let average_winner_r=if winners.is_empty(){None}else{Some(winners.iter().sum::<f64>()/winners.len() as f64)};
    let average_loser_r=if losers.is_empty(){None}else{Some(losers.iter().sum::<f64>()/losers.len() as f64)};
    let gross_win:f64=winners.iter().sum(); let gross_loss:f64=losers.iter().map(|x|x.abs()).sum();
    let profit_factor_r=if gross_loss>0.0{Some(gross_win/gross_loss)}else{None};
    let rule_violation_trades=rows.iter().filter(|x|x.rule_status=="VIOLATED").count() as i64;
    let bad_decision_win_count=closed.iter().filter(|x|matches!(x.decision_quality.as_deref(),Some("C")|Some("INVALID")) && x.realized_r.unwrap_or(0.0)>0.0).count() as i64;
    Ok(AnalyticsSummaryDto{
        trade_count:rows.len() as i64,eligible_r_count:eligible,wins,losses,breakeven,win_rate,average_r,median_r,net_r,
        average_winner_r,average_loser_r,profit_factor_r,expectancy_r:average_r,
        net_pnl:if pnls.is_empty(){None}else{Some(pnls.iter().sum())},rule_violation_trades,bad_decision_win_count,small_sample:eligible<20
    })
}

pub fn list_mistake_summary(conn:&Connection,filter:JournalFilterInput)->Result<Vec<MistakeSummaryDto>,AppError>{
    let rows=list_journal_trades(conn,filter)?;
    let ids:std::collections::HashSet<String>=rows.into_iter().map(|r|r.trade_id).collect();
    let mut counts:std::collections::HashMap<(String,String),i64>=std::collections::HashMap::new();
    let mut stmt=conn.prepare("SELECT tm.trade_id,mt.mistake_type_id,mt.label FROM trade_mistakes tm JOIN mistake_types mt ON mt.mistake_type_id=tm.mistake_type_id")?;
    for row in stmt.query_map([],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?)))? {
        let (tid,id,label)=row?; if ids.contains(&tid){*counts.entry((id,label)).or_insert(0)+=1;}
    }
    let mut out=counts.into_iter().map(|((mistake_type_id,label),count)|MistakeSummaryDto{mistake_type_id,label,count}).collect::<Vec<_>>();
    out.sort_by(|a,b|b.count.cmp(&a.count).then(a.label.cmp(&b.label))); Ok(out)
}


