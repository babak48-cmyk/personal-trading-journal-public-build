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
    pub setup_version_id: Option<String>,
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

// Built-in catalog only. A symbol is inserted at most once; existing edits,
// user-defined symbols, disabled instruments, and historical Session snapshots
// are never rewritten. For an existing installation new presets append after
// the trader's current instrument ordering, rather than renumbering it.
const DEFAULT_INSTRUMENT_PROFILES: &[(&str,&str,&str,f64,f64,&str,&str)] = &[
    ("instrument-ES","ES","E-mini S&P 500 Futures",0.25,50.0,"USD","FUTURES"),
    ("instrument-GC","GC","Gold Futures (COMEX)",0.10,100.0,"USD","FUTURES"),
    ("instrument-NQ","NQ","E-mini Nasdaq-100 Futures",0.25,20.0,"USD","FUTURES"),
    ("instrument-RTY","RTY","E-mini Russell 2000 Futures",0.10,50.0,"USD","FUTURES"),
    ("instrument-YM","YM","E-mini Dow Jones Futures",1.0,5.0,"USD","FUTURES"),
    ("instrument-SI","SI","Silver Futures (COMEX, 5,000 oz)",0.005,5000.0,"USD","FUTURES"),
    ("instrument-CL","CL","WTI Crude Oil Futures (NYMEX, 1,000 bbl)",0.01,1000.0,"USD","FUTURES"),
    ("instrument-AAPL","AAPL","Apple Inc. — US stock",0.01,1.0,"USD","STOCK"),
    ("instrument-MSFT","MSFT","Microsoft Corp. — US stock",0.01,1.0,"USD","STOCK"),
    ("instrument-NVDA","NVDA","NVIDIA Corp. — US stock",0.01,1.0,"USD","STOCK"),
    ("instrument-AMZN","AMZN","Amazon.com Inc. — US stock",0.01,1.0,"USD","STOCK"),
    ("instrument-GOOGL","GOOGL","Alphabet Inc. Class A — US stock",0.01,1.0,"USD","STOCK"),
    ("instrument-META","META","Meta Platforms Inc. — US stock",0.01,1.0,"USD","STOCK"),
    ("instrument-TSLA","TSLA","Tesla Inc. — US stock",0.01,1.0,"USD","STOCK"),
];

fn seed_default_instruments(conn: &Connection, workspace_id: &str) -> Result<(), AppError> {
    // This is additive reference data, not a schema migration. The previous
    // defaults and every user-created instrument keep their original identity.
    let mut next_order:i64=conn.query_row(
        "SELECT COALESCE(MAX(display_order),0)+1 FROM instruments WHERE workspace_id=?1",
        [workspace_id],|row|row.get(0)
    )?;
    for &(id,symbol,name,tick,point,currency,market_type) in DEFAULT_INSTRUMENT_PROFILES {
        let exists:bool=conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM instruments WHERE workspace_id=?1 AND (instrument_id=?2 OR symbol=?3))",
            params![workspace_id,id,symbol],|row|row.get(0)
        )?;
        if exists {continue;}
        let created=conn.execute(
            "INSERT OR IGNORE INTO instruments(instrument_id,workspace_id,symbol,display_name,tick_size,point_value,currency,active,market_type,display_order,user_defined) VALUES(?1,?2,?3,?4,?5,?6,?7,1,?8,?9,0)",
            params![id,workspace_id,symbol,name,tick,point,currency,market_type,next_order],
        )?;
        if created==1 {next_order+=1;}
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
    let mut stmt=conn.prepare("SELECT c.candidate_id,c.label,cr.directional_intent,cr.trend_relationship,cr.price_mode,cr.price_from,cr.price_to,cr.reference_price,cr.candidate_revision_id,cr.required_conditions_json,cr.invalidation_conditions_json,cr.notes,cr.setup_version_id FROM candidates c JOIN candidate_revisions cr ON cr.candidate_id=c.candidate_id AND cr.revision_number=(SELECT MAX(cr2.revision_number) FROM candidate_revisions cr2 WHERE cr2.candidate_id=c.candidate_id) WHERE c.session_id=?1 AND c.archived_at IS NULL ORDER BY c.created_at")?;
    let base=stmt.query_map([session_id], |r| Ok((r.get::<_,String>(0)?,r.get::<_,Option<String>>(1)?,r.get::<_,String>(2)?,r.get::<_,Option<String>>(3)?,r.get::<_,String>(4)?,r.get::<_,Option<f64>>(5)?,r.get::<_,Option<f64>>(6)?,r.get::<_,Option<f64>>(7)?,r.get::<_,String>(8)?,r.get::<_,Option<String>>(9)?,r.get::<_,Option<String>>(10)?,r.get::<_,Option<String>>(11)?,r.get::<_,Option<String>>(12)?)))?.collect::<Result<Vec<_>,_>>()?;
    let mut candidates=Vec::new();
    for (id,label,intent,trend,pm,pf,pt,rp,current_revision_id,required_json,invalidation_json,notes,setup_version_id) in base {
        let status:String=conn.query_row("SELECT status FROM candidate_status_events WHERE candidate_id=?1 ORDER BY occurred_at DESC,rowid DESC LIMIT 1",[&id],|r|r.get(0)).optional()?.unwrap_or_else(||"PLANNED".into());
        let mut sstmt=conn.prepare("SELECT cs.candidate_source_id,cs.source_type_id FROM candidate_sources cs WHERE cs.candidate_id=?1 AND cs.candidate_revision_id=?2 ORDER BY cs.is_primary DESC,cs.rowid")?;
        let source_rows=sstmt.query_map(params![&id,&current_revision_id],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?)))?.collect::<Result<Vec<_>,_>>()?;
        let mut source_type_ids=Vec::new();let mut sources=Vec::new();
        for (source_id,original_type) in source_rows {
            let (effective,revision,_)=crate::source_type_corrections::effective_type(conn,&source_id,&original_type)?;
            let label:String=conn.query_row(
              "SELECT label FROM level_source_types WHERE source_type_id=?1",
              [&effective],|r|r.get(0))?;
            source_type_ids.push(effective);
            sources.push(if revision>0{format!("{label} [corrected historical entry]")}else{label});
        }
        let required_conditions=required_json.as_deref().and_then(|x|serde_json::from_str(x).ok()).unwrap_or_default();
        let invalidation_conditions=invalidation_json.as_deref().and_then(|x|serde_json::from_str(x).ok()).unwrap_or_default();
        candidates.push(CandidateCurrentDto{candidate_id:id,label,directional_intent:intent,trend_relationship:trend,price_mode:pm,price_from:pf,price_to:pt,reference_price:rp,required_conditions,invalidation_conditions,notes,current_status:status,sources,source_type_ids,setup_version_id});
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

pub fn add_evidence_observations_atomic(conn:&mut Connection,inputs:Vec<EvidenceObservationInput>)->Result<Vec<String>,AppError>{
    if inputs.is_empty() || inputs.len()>32 {return Err(AppError::Validation("evidence batch must contain 1 to 32 observations".into()));}
    let first_session=&inputs[0].session_id;
    let first_candidate=&inputs[0].candidate_id;
    if inputs.iter().any(|x| &x.session_id!=first_session || &x.candidate_id!=first_candidate){
        return Err(AppError::Validation("all observations must belong to the same session and Zone".into()));
    }
    let tx=conn.transaction()?;
    let mut ids=Vec::with_capacity(inputs.len());
    for input in inputs { ids.push(add_evidence_observation(&tx,input)?); }
    tx.commit()?;
    Ok(ids)
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

    // Do not persist stale opposite-plan explanations on aligned or non-trade decisions.
    // Unplanned TRADE decisions retain their separately required explanation.
    let stored_mismatch_reason = if input.decision_type == "TRADE"
        && (alignment == "MISMATCH" || input.candidate_id.is_none()) {
        input.plan_mismatch_reason.clone()
    } else {
        None
    };

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO candidate_decisions(decision_id,candidate_id,session_id,occurred_at,decision_type,reason_code,reason_note,decision_quality,decision_quality_note,based_on_plan_revision_id,based_on_candidate_revision_id,provenance,intended_direction,plan_alignment,plan_mismatch_reason) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,'NATIVE',?12,?13,?14)",
        params![id,input.candidate_id,input.session_id,now,input.decision_type,input.reason_code,input.reason_note,input.decision_quality,input.decision_quality_note,latest_plan,candidate_revision_id,input.intended_direction,alignment,stored_mismatch_reason]
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
        plan_mismatch_reason: stored_mismatch_reason,
        based_on_plan_revision_id: latest_plan,
        based_on_candidate_revision_id: candidate_revision_id,
    })
}

pub fn list_candidate_decisions(conn: &Connection, candidate_id: &str) -> Result<Vec<CandidateDecisionDto>, AppError> {
    let mut stmt = conn.prepare("SELECT decision_id,candidate_id,occurred_at,decision_type,intended_direction,reason_code,reason_note,decision_quality,plan_alignment,plan_mismatch_reason,based_on_plan_revision_id,based_on_candidate_revision_id FROM candidate_decisions WHERE candidate_id=?1 ORDER BY (julianday(occurred_at) IS NULL),julianday(occurred_at) DESC,rowid DESC")?;
    let rows = stmt.query_map([candidate_id], |r| Ok(CandidateDecisionDto {
        decision_id:r.get(0)?, candidate_id:r.get(1)?, occurred_at:r.get(2)?, decision_type:r.get(3)?, intended_direction:r.get(4)?, reason_code:r.get(5)?, reason_note:r.get(6)?, decision_quality:r.get(7)?, plan_alignment:r.get(8)?, plan_mismatch_reason:r.get(9)?, based_on_plan_revision_id:r.get(10)?, based_on_candidate_revision_id:r.get(11)?
    }))?.collect::<Result<Vec<_>,_>>()?;
    Ok(rows)
}

/// Chronological sorting must compare absolute instants (RFC3339 may have offsets),
/// not the raw text. Unparseable legacy timestamps remain readable last.
/// Read-only recovery of TRADE decisions that have no associated execution.
/// Never infer this relationship from Zone or timestamps: two independent
/// decisions may legitimately be made in the same Zone.
pub fn list_unexecuted_trade_decisions(conn:&Connection,session_id:&str)->Result<Vec<CandidateDecisionDto>,AppError>{
    let mut stmt=conn.prepare(
        "SELECT cd.decision_id,cd.candidate_id,cd.occurred_at,cd.decision_type,cd.intended_direction,
                cd.reason_code,cd.reason_note,cd.decision_quality,cd.plan_alignment,
                cd.plan_mismatch_reason,cd.based_on_plan_revision_id,cd.based_on_candidate_revision_id
         FROM candidate_decisions cd
         WHERE cd.session_id=?1 AND cd.decision_type='TRADE'
           AND NOT EXISTS(SELECT 1 FROM trades t WHERE t.decision_id=cd.decision_id)
         ORDER BY (julianday(cd.occurred_at) IS NULL),julianday(cd.occurred_at) DESC,cd.rowid DESC"
    )?;
    let decisions=stmt.query_map([session_id],|r|Ok(CandidateDecisionDto{
        decision_id:r.get(0)?,candidate_id:r.get(1)?,occurred_at:r.get(2)?,
        decision_type:r.get(3)?,intended_direction:r.get(4)?,reason_code:r.get(5)?,
        reason_note:r.get(6)?,decision_quality:r.get(7)?,plan_alignment:r.get(8)?,
        plan_mismatch_reason:r.get(9)?,based_on_plan_revision_id:r.get(10)?,
        based_on_candidate_revision_id:r.get(11)?
    }))?.collect::<Result<Vec<_>,_>>()?;
    Ok(decisions)
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
pub struct RiskSnapshotDto {
    pub risk_snapshot_id: String,
    pub occurred_at: String,
    pub snapshot_type: String,
    pub stop_price: Option<f64>,
    pub quantity: Option<f64>,
    pub risk_dollars: Option<f64>,
    pub change_reason: Option<String>,
    pub was_rule_compliant: Option<bool>,
    pub provenance: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SetupAtDecisionDto {
    pub version_id: String,
    pub name: Option<String>,
    pub version_number: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct TradeDetailDto {
    pub metrics: TradeMetricsDto,
    /// Read-only snapshot from the TRADE's stored decision-time version ID,
    /// never from the latest mutable Zone revision.
    pub setup_at_decision: Option<SetupAtDecisionDto>,
    pub fills: Vec<ExecutionFillDto>,
    /// Read-only, timestamped risk history. Existing events never rewritten.
    pub risk_snapshots: Vec<RiskSnapshotDto>,
}

fn price_tick_aligned(price: f64, tick_size: f64) -> bool {
    if tick_size <= 0.0 { return false; }
    let units = price / tick_size;
    (units - units.round()).abs() <= 1e-8
}

fn validate_execution_quantity(quantity: f64) -> Result<(), AppError> {
    if !quantity.is_finite() || quantity <= 0.0 || quantity.fract() != 0.0 {
        return Err(AppError::Validation("fill quantity must be a finite positive whole number".into()));
    }
    Ok(())
}

fn validate_execution_costs(commission: Option<f64>, fees: Option<f64>) -> Result<(), AppError> {
    for (name,value) in [("commission",commission),("fees",fees)] {
        if let Some(amount)=value {
            if !amount.is_finite() || amount<0.0 {
                return Err(AppError::Validation(format!("{name} must be a finite non-negative total per fill")));
            }
        }
    }
    Ok(())
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


#[derive(Debug, Clone, Default)]
pub(crate) struct ExecutionLedger {
    pub(crate) entry_qty: f64,
    pub(crate) exit_qty: f64,
    pub(crate) open_qty: f64,
    pub(crate) open_average_entry: Option<f64>,
    pub(crate) last_average_entry: Option<f64>,
    pub(crate) gross_realized: Option<f64>,
    pub(crate) costs: f64,
    pub(crate) unknown_cost_fields: usize,
    pub(crate) fill_count: i64,
}

/// Chronological moving-average cost basis. Exit prices are evaluated using the
/// cost basis that existed at the time of that exit; future entries must not
/// retrospectively change realized P&L. Does not modify stored execution events.
pub(crate) fn execution_ledger(events: &[(String,f64,f64,f64,f64)],direction:&str,point_value:f64)
    -> Result<ExecutionLedger,AppError>
{
    if !matches!(direction,"LONG"|"SHORT") || !point_value.is_finite() || point_value<=0.0 {
        return Err(AppError::Validation("invalid direction or instrument point value".into()));
    }
    let sign=if direction=="LONG"{1.0}else{-1.0};
    let mut state=ExecutionLedger::default();
    let mut avg=0.0_f64;
    let mut gross=0.0_f64;
    for (action,price,quantity,commission,fees) in events {
        if !price.is_finite() || !quantity.is_finite() || *quantity<=0.0 ||
           !commission.is_finite() || !fees.is_finite() {
            return Err(AppError::Validation("invalid historical execution event; no derived P&L calculated".into()));
        }
        state.fill_count+=1;
        state.costs+=commission+fees;
        if action=="ENTRY" {
            let next_qty=state.open_qty+quantity;
            avg=(avg*state.open_qty+price*quantity)/next_qty;
            state.open_qty=next_qty;
            state.entry_qty+=quantity;
            state.last_average_entry=Some(avg);
        } else if action=="EXIT" {
            if *quantity>state.open_qty+1e-9 {
                return Err(AppError::Validation("historical exit exceeds quantity open".into()));
            }
            gross+=(price-avg)*sign*quantity*point_value;
            state.open_qty=(state.open_qty-quantity).max(0.0);
            state.exit_qty+=quantity;
            state.gross_realized=Some(gross);
            if state.open_qty<=1e-9 {
                state.open_qty=0.0;
                avg=0.0;
            }
        } else {
            return Err(AppError::Validation("unknown historical fill action".into()));
        }
    }
    state.open_average_entry=if state.open_qty>0.0{Some(avg)}else{None};
    Ok(state)
}

fn trade_execution_ledger(conn:&Connection,trade_id:&str,direction:&str,point_value:f64)
    -> Result<ExecutionLedger,AppError>
{
    use crate::fill_corrections::{effective_fill_number,FillField};
    // Resolve the complete audited, append-only effective value chain before
    // calculating Gross / Net / R. A missing charge remains UNKNOWN, not zero.
    let mut stmt=conn.prepare(
        "SELECT execution_id,action,price,quantity,commission,fees
         FROM execution_fills WHERE trade_id=?1 ORDER BY COALESCE(occurred_at,''),rowid")?;
    let rows=stmt.query_map([trade_id],|r|Ok((
        r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,f64>(2)?,
        r.get::<_,f64>(3)?,r.get::<_,Option<f64>>(4)?,r.get::<_,Option<f64>>(5)?
    )))?;
    let persisted=rows.collect::<Result<Vec<_>,_>>()?;
    let mut unknown_cost_fields=0;
    let mut events=Vec::with_capacity(persisted.len());
    for (id,action,original_price,original_qty,original_commission,original_fees) in persisted {
        let price=effective_fill_number(conn,&id,FillField::Price,Some(original_price))?
            .ok_or_else(||AppError::Validation("corrected price unexpectedly missing".into()))?;
        let qty=effective_fill_number(conn,&id,FillField::Quantity,Some(original_qty))?
            .ok_or_else(||AppError::Validation("corrected quantity unexpectedly missing".into()))?;
        let commission=effective_fill_number(conn,&id,FillField::Commission,original_commission)?;
        let fees=effective_fill_number(conn,&id,FillField::Fees,original_fees)?;
        unknown_cost_fields+=usize::from(commission.is_none())+usize::from(fees.is_none());
        events.push((action,price,qty,commission.unwrap_or(0.0),fees.unwrap_or(0.0)));
    }
    let mut ledger=execution_ledger(&events,direction,point_value)?;
    ledger.unknown_cost_fields=unknown_cost_fields;
    Ok(ledger)
}
fn trade_metrics(conn: &Connection, trade_id: &str) -> Result<TradeMetricsDto,AppError> {
    let (session_id,candidate_id,direction,status):(String,Option<String>,String,String)=conn.query_row(
        "SELECT session_id,candidate_id,direction,status FROM trades WHERE trade_id=?1",
        [trade_id], |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?))
    )?;
    let (_tick_size,point_value)=instrument_spec_for_session(conn,&session_id)?;

    let state=trade_execution_ledger(conn,trade_id,&direction,point_value)?;
    let gross=state.gross_realized;
    let net=if state.unknown_cost_fields==0 {gross.map(|g|g-state.costs)} else {None};
    let initial_raw:Option<(String,Option<f64>)>=conn.query_row(
        "SELECT risk_snapshot_id,risk_dollars FROM risk_snapshots
         WHERE trade_id=?1 AND snapshot_type='INITIAL' ORDER BY occurred_at,rowid LIMIT 1",
        [trade_id], |r| Ok((r.get(0)?,r.get(1)?))
    ).optional()?;
    let initial_risk=match initial_raw{
        Some((id,original))=>crate::initial_risk_corrections::effective_initial_risk(
            conn,&id,original)?.0,
        None=>None
    };
    let latest_stop:Option<f64>=conn.query_row(
        "SELECT stop_price FROM risk_snapshots WHERE trade_id=?1 AND stop_price IS NOT NULL ORDER BY occurred_at DESC,rowid DESC LIMIT 1",
        [trade_id], |r| r.get(0)
    ).optional()?;
    let rr=match(net,initial_risk){(Some(n),Some(r)) if r>0.0=>Some(n/r),_=>None};
    Ok(TradeMetricsDto{trade_id:trade_id.into(),session_id,candidate_id,direction,status,average_entry:state.open_average_entry.or(state.last_average_entry),total_entry_quantity:state.entry_qty,total_exit_quantity:state.exit_qty,open_quantity:state.open_qty,latest_stop_price:latest_stop,initial_risk_dollars:initial_risk,gross_realized_pnl:gross,net_realized_pnl:net,realized_r:rr,fill_count:state.fill_count})
}

pub fn create_trade_with_entry(conn:&mut Connection,input:CreateTradeExecutionInput)->Result<TradeDetailDto,AppError>{
    validate_execution_quantity(input.quantity)?;
    validate_execution_costs(input.commission,input.fees)?;
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
    if let Some(target)=input.planned_target_price {
        if !price_tick_aligned(target,tick_size) {return Err(AppError::Validation(format!("planned target must align to tick size {tick_size}")));}
    }
    if direction=="LONG" && input.stop_price>=input.entry_price {return Err(AppError::Validation("for a LONG trade, stop must be below entry".into()));}
    if direction=="SHORT" && input.stop_price<=input.entry_price {return Err(AppError::Validation("for a SHORT trade, stop must be above entry".into()));}
    let at_decision_setup:Option<String>=tx.query_row(
        "SELECT cr.setup_version_id FROM candidate_decisions d
         LEFT JOIN candidate_revisions cr ON cr.candidate_revision_id=d.based_on_candidate_revision_id
         WHERE d.decision_id=?1",
        [&input.decision_id],|r|r.get(0))?;
    let now=Utc::now().to_rfc3339(); let trade_id=Uuid::new_v4().to_string(); let fill_id=Uuid::new_v4().to_string(); let risk_id=Uuid::new_v4().to_string();
    let side=if direction=="LONG"{"BUY"}else{"SELL"};
    let risk=(input.entry_price-input.stop_price).abs()*point_value*input.quantity;
    // Snapshot the exact Setup version AT DECISION time. Later Zone revisions
    // must never silently relabel a saved Trade.
    tx.execute("INSERT INTO trades(trade_id,decision_id,session_id,candidate_id,setup_version_id,direction,planned_entry_price,planned_stop_price,planned_target_price,status,provenance) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,'OPEN','NATIVE')",
        params![trade_id,input.decision_id,session_id,candidate_id,at_decision_setup,direction,input.entry_price,input.stop_price,input.planned_target_price])?;
    tx.execute("INSERT INTO execution_fills(execution_id,trade_id,occurred_at,action,side,price,quantity,order_type,commission,fees,source,note) VALUES(?1,?2,?3,'ENTRY',?4,?5,?6,?7,?8,?9,'MANUAL','Initial manual entry')",
        params![fill_id,trade_id,now,side,input.entry_price,input.quantity,input.order_type,input.commission,input.fees])?;
    tx.execute("INSERT INTO risk_snapshots(risk_snapshot_id,trade_id,occurred_at,snapshot_type,stop_price,quantity,risk_dollars,provenance) VALUES(?1,?2,?3,'INITIAL',?4,?5,?6,'NATIVE')",
        params![risk_id,trade_id,now,input.stop_price,input.quantity,risk])?;
    tx.commit()?;
    get_trade_detail(conn,&trade_id)
}

pub fn add_trade_fill(conn:&mut Connection,input:AddTradeFillInput)->Result<TradeDetailDto,AppError>{
    validate_execution_quantity(input.quantity)?;
    validate_execution_costs(input.commission,input.fees)?;
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
            let ledger=trade_execution_ledger(&tx,&input.trade_id,&direction,point_value)?;
            let avg_entry=ledger.open_average_entry.ok_or_else(||AppError::Validation("no open position for risk snapshot".into()))?;
            let rid=Uuid::new_v4().to_string();
            let risk=(avg_entry-stop).abs()*point_value*ledger.open_qty;
            tx.execute("INSERT INTO risk_snapshots(risk_snapshot_id,trade_id,occurred_at,snapshot_type,stop_price,quantity,risk_dollars,change_reason,provenance) VALUES(?1,?2,?3,'MODIFIED',?4,?5,?6,'Position size changed','NATIVE')",params![rid,input.trade_id,now,stop,ledger.open_qty,risk])?;
        }
    }
    tx.commit()?; get_trade_detail(conn,&input.trade_id)
}

pub fn move_trade_stop(conn:&mut Connection,input:MoveStopInput)->Result<TradeDetailDto,AppError>{
    let tx=conn.transaction()?;
    let (session_id,direction,status):(String,String,String)=tx.query_row("SELECT session_id,direction,status FROM trades WHERE trade_id=?1",[&input.trade_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?)))?;
    if matches!(status.as_str(),"CLOSED"|"CANCELLED"){return Err(AppError::Validation("cannot move stop on a closed/cancelled trade".into()));}
    let (tick_size,point_value)=instrument_spec_for_session(&tx,&session_id)?; if !price_tick_aligned(input.stop_price,tick_size){return Err(AppError::Validation(format!("stop must align to tick size {tick_size}")));}
    let ledger=trade_execution_ledger(&tx,&input.trade_id,&direction,point_value)?;
    let avg_entry=ledger.open_average_entry.ok_or_else(||AppError::Validation("cannot move stop without an open position".into()))?;
    // A stop at breakeven or in profit remains permitted. Snapshot captures
    // the actual OPEN quantity and contemporary average cost, not lifetime entries.
    let open=ledger.open_qty;
    let risk=(avg_entry-input.stop_price).abs()*point_value*open;
    let now=Utc::now().to_rfc3339(); let id=Uuid::new_v4().to_string();
    tx.execute("INSERT INTO risk_snapshots(risk_snapshot_id,trade_id,occurred_at,snapshot_type,stop_price,quantity,risk_dollars,change_reason,was_rule_compliant,provenance) VALUES(?1,?2,?3,'MODIFIED',?4,?5,?6,?7,?8,'NATIVE')",params![id,input.trade_id,now,input.stop_price,open,risk,input.reason,input.was_rule_compliant.map(|x|if x{1}else{0})])?;
    tx.commit()?; get_trade_detail(conn,&input.trade_id)
}

fn trade_risk_history(conn:&Connection,trade_id:&str)->Result<Vec<RiskSnapshotDto>,AppError>{
    let mut risk_stmt=conn.prepare(
        "SELECT risk_snapshot_id,occurred_at,snapshot_type,stop_price,quantity,risk_dollars,
                change_reason,was_rule_compliant,provenance
         FROM risk_snapshots WHERE trade_id=?1 ORDER BY COALESCE(occurred_at,''),rowid"
    )?;
    let mut items=risk_stmt.query_map([trade_id],|r|Ok(RiskSnapshotDto{
        risk_snapshot_id:r.get(0)?,occurred_at:r.get(1)?,snapshot_type:r.get(2)?,
        stop_price:r.get(3)?,quantity:r.get(4)?,risk_dollars:r.get(5)?,
        change_reason:r.get(6)?,was_rule_compliant:r.get::<_,Option<i64>>(7)?.map(|n|n!=0),
        provenance:r.get(8)?
    }))?.collect::<Result<Vec<_>,_>>()?;
    // Only the earliest INITIAL record is the R denominator.
    // Its original SQLite value remains unchanged; display effective audit overlay.
    if let Some(initial)=items.iter_mut().find(|item|item.snapshot_type=="INITIAL"){
        initial.risk_dollars=crate::initial_risk_corrections::effective_initial_risk(
            conn,&initial.risk_snapshot_id,initial.risk_dollars)?.0;
    }
    Ok(items)
}

pub fn get_trade_detail(conn:&Connection,trade_id:&str)->Result<TradeDetailDto,AppError>{
    let metrics=trade_metrics(conn,trade_id)?;
    let mut stmt=conn.prepare("SELECT execution_id,occurred_at,action,side,price,quantity,order_type,commission,fees,note FROM execution_fills WHERE trade_id=?1 ORDER BY COALESCE(occurred_at,''),rowid")?;
    let rows=stmt.query_map([trade_id],|r|Ok(ExecutionFillDto{execution_id:r.get(0)?,occurred_at:r.get(1)?,action:r.get(2)?,side:r.get(3)?,price:r.get(4)?,quantity:r.get(5)?,order_type:r.get(6)?,commission:r.get(7)?,fees:r.get(8)?,note:r.get(9)?}))?;
    // Return current effective values while preserving immutable recorded
    // originals in SQLite and independent correction events for audit.
    let mut fills=rows.collect::<Result<Vec<_>,_>>()?;
    for fill in &mut fills {
        use crate::fill_corrections::{effective_fill_number,FillField};
        let id=&fill.execution_id;
        fill.price=effective_fill_number(conn,id,FillField::Price,Some(fill.price))?
            .ok_or_else(||AppError::Validation("corrected price unexpectedly missing".into()))?;
        fill.quantity=effective_fill_number(conn,id,FillField::Quantity,Some(fill.quantity))?
            .ok_or_else(||AppError::Validation("corrected quantity unexpectedly missing".into()))?;
        fill.commission=effective_fill_number(conn,id,FillField::Commission,fill.commission)?;
        fill.fees=effective_fill_number(conn,id,FillField::Fees,fill.fees)?;
    }
    let risk_snapshots=trade_risk_history(conn,trade_id)?;
    let setup_at_decision=conn.query_row(
        "SELECT t.setup_version_id,d.name_snapshot,d.version_number
         FROM trades t LEFT JOIN setup_playbook_details d ON d.version_id=t.setup_version_id
         WHERE t.trade_id=?1 AND t.setup_version_id IS NOT NULL",
        [trade_id],|r|Ok(SetupAtDecisionDto{
            version_id:r.get(0)?,name:r.get(1)?,version_number:r.get(2)?
        })
    ).optional()?;
    Ok(TradeDetailDto{metrics,fills,risk_snapshots,setup_at_decision})
}

/// Exact, read-only recovery for a possibly committed entry whose response
/// was lost. Cross-session IDs cannot retrieve another session's execution.
fn trade_id_for_decision(conn:&Connection,session_id:&str,decision_id:&str)->Result<Option<String>,AppError>{
    let id=conn.query_row(
        "SELECT t.trade_id FROM trades t
         JOIN candidate_decisions cd ON cd.decision_id=t.decision_id
         WHERE cd.session_id=?1 AND t.session_id=?1 AND cd.decision_id=?2",
        params![session_id,decision_id],|r|r.get(0)
    ).optional()?;
    Ok(id)
}

pub fn get_trade_for_decision(conn:&Connection,session_id:&str,decision_id:&str)->Result<Option<TradeDetailDto>,AppError>{
    trade_id_for_decision(conn,session_id,decision_id)?
        .map(|trade_id|get_trade_detail(conn,&trade_id))
        .transpose()
}

pub fn list_session_trades(conn:&Connection,session_id:&str)->Result<Vec<TradeMetricsDto>,AppError>{
    let mut stmt=conn.prepare("SELECT trade_id FROM trades WHERE session_id=?1 ORDER BY rowid DESC")?;
    let ids=stmt.query_map([session_id],|r|r.get::<_,String>(0))?.collect::<Result<Vec<_>,_>>()?;
    ids.into_iter().map(|id|trade_metrics(conn,&id)).collect()
}

/// Read-only backlog across all sessions; reviews are never synthesized and
/// completed records never re-enter the queue. No schema change or stored edits.
#[derive(Debug, Serialize)]
pub struct CrossSessionPendingReviewDto {
    pub trade_id: String,
    pub direction: String,
    pub review_status: String,
    pub session: SessionSummary,
}

pub fn list_cross_session_pending_reviews(
    conn: &Connection, limit: i64,
) -> Result<Vec<CrossSessionPendingReviewDto>, AppError> {
    if !(1..=250).contains(&limit) {
        return Err(AppError::Validation("Review queue limit must be 1..250".into()));
    }
    let mut stmt=conn.prepare(
        "SELECT t.trade_id,t.direction,COALESCE(r.status,'NONE'),
                s.session_id,s.session_date,
                COALESCE(s.instrument_symbol_snapshot,i.symbol),
                COALESCE(s.instrument_display_name_snapshot,i.display_name),
                COALESCE(s.instrument_tick_size_snapshot,i.tick_size),
                COALESCE(s.instrument_point_value_snapshot,i.point_value),
                COALESCE(s.instrument_currency_snapshot,i.currency),
                s.environment,s.status,s.opened_at
         FROM trades t
         JOIN sessions s ON s.session_id=t.session_id
         JOIN instruments i ON i.instrument_id=s.instrument_id
         LEFT JOIN trade_reviews r ON r.trade_id=t.trade_id
         WHERE t.status='CLOSED' AND (r.status IS NULL OR r.status='DRAFT')
         ORDER BY s.session_date DESC, s.opened_at DESC, t.rowid DESC LIMIT ?1"
    )?;
    let records=stmt.query_map([limit], |r| {
        Ok(CrossSessionPendingReviewDto{
            trade_id:r.get(0)?,direction:r.get(1)?,review_status:r.get(2)?,
            session:SessionSummary{
                session_id:r.get(3)?,session_date:r.get(4)?,
                instrument_symbol:r.get(5)?,instrument_display_name:r.get(6)?,
                instrument_tick_size:r.get(7)?,instrument_point_value:r.get(8)?,
                instrument_currency:r.get(9)?,environment:r.get(10)?,
                status:r.get(11)?,opened_at:r.get(12)?
            },
        })
    })?.collect::<Result<Vec<_>,_>>()?;
    Ok(records)
}

#[cfg(test)]
mod cross_session_review_queue_tests {
    use super::*;
    #[test]
    fn backlog_is_read_only_and_separates_sessions_and_review_statuses() {
        let db=Connection::open_in_memory().unwrap();
        db.execute_batch("
          CREATE TABLE instruments(instrument_id TEXT PRIMARY KEY,symbol TEXT,display_name TEXT,
            tick_size REAL,point_value REAL,currency TEXT);
          CREATE TABLE sessions(session_id TEXT PRIMARY KEY,instrument_id TEXT,session_date TEXT,
            environment TEXT,status TEXT,opened_at TEXT,
            instrument_symbol_snapshot TEXT,instrument_display_name_snapshot TEXT,
            instrument_tick_size_snapshot REAL,instrument_point_value_snapshot REAL,
            instrument_currency_snapshot TEXT);
          CREATE TABLE trades(trade_id TEXT PRIMARY KEY,session_id TEXT,direction TEXT,status TEXT);
          CREATE TABLE trade_reviews(trade_id TEXT UNIQUE,status TEXT);
          INSERT INTO instruments VALUES('i','ES','E-mini S&P 500',0.25,50,'USD');
          INSERT INTO sessions(session_id,instrument_id,session_date,environment,status,opened_at)
            VALUES('a','i','2026-11-12','DEMO','ACTIVE','2026-11-12T09:00:00'),
                  ('b','i','2026-11-13','DEMO','CLOSED','2026-11-13T09:00:00');
          INSERT INTO trades VALUES('a-pending','a','LONG','CLOSED'),
                                   ('b-draft','b','SHORT','CLOSED'),
                                   ('b-completed','b','LONG','CLOSED'),
                                   ('b-open','b','LONG','OPEN');
          INSERT INTO trade_reviews VALUES('b-draft','DRAFT'),('b-completed','COMPLETED');
        ").unwrap();
        let result=list_cross_session_pending_reviews(&db,250).unwrap();
        assert_eq!(result.iter().map(|x| x.trade_id.as_str()).collect::<Vec<_>>(),
                   vec!["b-draft","a-pending"]);
        assert_eq!(result[0].review_status,"DRAFT");
        assert_eq!(result[1].review_status,"NONE");
        assert_eq!(result[0].session.session_id,"b");
        assert_eq!(result[1].session.session_id,"a");
        assert_eq!(result[0].session.instrument_symbol,"ES");
        assert_eq!(list_cross_session_pending_reviews(&db,1).unwrap().len(),1);
        assert!(list_cross_session_pending_reviews(&db,0).is_err());
        let remaining:i64=db.query_row("SELECT COUNT(*) FROM trades",[],|r|r.get(0)).unwrap();
        assert_eq!(remaining,4);
    }
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
    // Review Pending is deliberately incomplete: only finalization requires
    // full emotion details. Do not weaken value/domain checks or immutable history.
    if input.finalize==Some(true) && input.emotion_affected==Some(true) {
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
    if input.finalize==Some(true) {
        // Enforce custom-field completion at the persistence boundary too, not only in React.
        // A review_id must already exist to allow custom events to be attached to it.
        let mut query=tx.prepare(
            "SELECT field_id,field_type,label FROM custom_field_definitions WHERE stage='session-review' AND is_required=1 AND is_active=1 ORDER BY display_order,field_id"
        )?;
        let required=query.query_map([],|row|Ok((row.get::<_,String>(0)?,row.get::<_,String>(1)?,row.get::<_,String>(2)?)))?
            .collect::<Result<Vec<_>,_>>()?;
        drop(query);
        if !required.is_empty() && existing.is_none() {
            return Err(AppError::Validation("save a session review draft before completing required custom fields".into()));
        }
        if let Some((review_id,_))=&existing {
            for (field_id,field_type,label) in required {
                let present=match field_type.as_str() {
                    "SINGLE_SELECT" | "MULTI_SELECT" =>
                        crate::custom_fields::read_current_selection(&tx,"session-review",review_id,&field_id)?
                            .is_some_and(|value|!value.options.is_empty()),
                    "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" => {
                        let value=crate::custom_fields::read_current_typed_value(&tx,"session-review",review_id,&field_id)?;
                        value.is_some_and(|v|match field_type.as_str(){
                            "TEXT"=>v.text_value.is_some_and(|s|!s.trim().is_empty()),
                            "NUMBER"=>v.number_value.is_some_and(|n|n.is_finite()),
                            "BOOLEAN"=>v.boolean_value.is_some(),
                            "DATE"=>v.date_value.is_some_and(|s|!s.trim().is_empty()),
                            _=>false
                        })
                    },
                    _=>false
                };
                if !present {
                    return Err(AppError::Validation(format!("required Session Review custom field missing: {label}")));
                }
            }
        }
    }
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
    /// Default ANY_RECORDED preserves existing analytics. AT_DECISION excludes
    /// evidence created after the decision; no hindsight-based confirmation.
    pub evidence_timing: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct JournalTradeRowDto {
    pub trade_id: String,
    pub session_id: String,
    pub session_date: String,
    /// Original Decision instant; not entry/exit time or planned event.
    pub decision_occurred_at: Option<String>,
    /// IANA timezone stored for the Session; never use device timezone.
    pub session_timezone_id: Option<String>,
    pub instrument_symbol: String,
    pub direction: String,
    pub status: String,
    pub candidate_label: Option<String>,
    pub decision_quality: Option<String>,
    pub rule_status: String,
    pub level_sources: Vec<String>,
    /// True if a historical trade has a Zone but lacks decision-time revision provenance.
    /// Such rows must not be mislabelled as having no Level Sources.
    pub level_source_snapshot_missing: bool,
    pub mistakes: Vec<String>,
    pub realized_r: Option<f64>,
    pub net_realized_pnl: Option<f64>,
    pub open_quantity: f64,
    /// Number of immutable audit events recorded against this Trade's Fills;
    /// counts audit provenance, not corrected/confirmed profitability.
    pub audited_correction_count: i64,
    /// Initial-risk correction events for this specific historical Trade.
    pub audited_initial_risk_correction_count: i64,
    /// Level Source type correction events attached to the Decision's saved Zone revision.
    pub audited_source_type_correction_count: i64,
    /// Level Source price correction events attached to the Decision's saved Zone revision.
    pub audited_source_price_correction_count: i64,
    /// At-decision Setup version is distinct from retrospective closed-trade attribution.
    pub setup_version_id: Option<String>,
    pub setup_version_name: Option<String>,
    pub setup_version_number: Option<i64>,
    pub setup_attribution: String,
    /// Definition context for the saved version; never market conditions observed at execution.
    pub setup_defined_market_context: Option<String>,
    /// Only stored observed events with a parsable event timestamp <= original Decision instant.
    /// Distinct from planned source provenance and setup-defined context.
    pub evidence_observed_at_decision: Vec<String>,
    pub evidence_post_decision_count: i64,
    pub evidence_unknown_timing_count: i64,
}

#[derive(Debug, Serialize)]
pub struct AnalyticsSummaryDto {
    pub trade_count: i64,
    /// Closed Trades; includes those with unknown costs or initial risk.
    pub closed_trade_count: i64,
    /// Closed Trades with verified net P&L, even if initial risk is unknown.
    pub eligible_net_pnl_count: i64,
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
    /// Mean winning R divided by absolute mean losing R (payoff, not win/loss count).
    pub win_loss_payoff_r: Option<f64>,
    /// Known closed net P&L divided by the count of closed Trades with known net P&L.
    pub expectancy_pnl: Option<f64>,
    /// Single confirmed original Session currency for eligible net P&L, if any.
    pub pnl_currency: Option<String>,
    /// SINGLE_CURRENCY / MIXED_CURRENCIES / UNKNOWN_CURRENCY / NO_ELIGIBLE.
    pub pnl_currency_status: String,
    /// Consecutive positive/negative R outcomes in known closing-time order.
    pub max_winning_streak: Option<i64>,
    pub max_losing_streak: Option<i64>,
    /// Largest peak-to-trough drop in cumulative realized net R of the
    /// COMPLETE filtered closed-trade sequence. NOT account equity drawdown.
    pub max_realized_r_drawdown: Option<f64>,
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

fn trade_level_sources(conn:&Connection, decision_candidate_revision_id:&Option<String>)->Result<Vec<(String,String)>,AppError>{
    // Anti-hindsight: a trade's Level Sources belong to the candidate revision
    // captured WITH THE DECISION, never the candidate's latest revision.
    // A legacy decision without a revision snapshot stays UNKNOWN (no attribution)
    // rather than acquiring sources added after the trade.
    let Some(revision_id)=decision_candidate_revision_id else{return Ok(Vec::new())};
    let mut stmt=conn.prepare("SELECT candidate_source_id,source_type_id FROM candidate_sources WHERE candidate_revision_id=?1 ORDER BY is_primary DESC,rowid")?;
    let originals=stmt.query_map([revision_id],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?)))?.collect::<Result<Vec<_>,_>>()?;
    let mut rows=Vec::new();
    for (source_id,original_id) in originals{
        let (effective,revision,_)=crate::source_type_corrections::effective_type(conn,&source_id,&original_id)?;
        let label:String=conn.query_row("SELECT label FROM level_source_types WHERE source_type_id=?1",[&effective],|r|r.get(0))?;
        rows.push((effective,if revision>0{format!("{label} [corrected historical entry]")}else{label}));
    }
    Ok(rows)
}

fn trade_mistake_labels(conn:&Connection,trade_id:&str)->Result<Vec<String>,AppError>{
    let mut stmt=conn.prepare("SELECT mt.label FROM trade_mistakes tm JOIN mistake_types mt ON mt.mistake_type_id=tm.mistake_type_id WHERE tm.trade_id=?1 ORDER BY mt.label")?;
    let rows = stmt.query_map([trade_id],|r|r.get::<_,String>(0))?.collect::<Result<Vec<_>,_>>()?;
    Ok(rows)
}

fn trade_evidence_temporal_snapshot(
    conn:&Connection,trade_id:&str,candidate_id:&Option<String>,decision_at:Option<&str>
)->Result<(Vec<String>,i64,i64),AppError>{
    let mut stmt=conn.prepare(
      "SELECT et.label,eo.role,eo.occurred_at,
              CASE WHEN julianday(eo.occurred_at) IS NULL OR ?3 IS NULL OR julianday(?3) IS NULL
                     THEN 'UNKNOWN'
                   WHEN julianday(eo.occurred_at)<=julianday(?3) THEN 'AT_DECISION'
                   ELSE 'AFTER_DECISION' END
       FROM evidence_observations eo
       JOIN evidence_types et ON et.evidence_type_id=eo.evidence_type_id
       WHERE eo.present=1 AND (eo.trade_id=?1 OR (?2 IS NOT NULL AND eo.candidate_id=?2))
       ORDER BY eo.rowid")?;
    let events=stmt.query_map(params![trade_id,candidate_id,decision_at],|r|Ok((
        r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,Option<String>>(2)?,
        r.get::<_,String>(3)?
    )))?;
    let mut labels=Vec::new();let mut post=0;let mut unknown=0;
    for event in events {
        let (label,role,_timestamp,bucket)=event?;
        match bucket.as_str(){
            "AT_DECISION"=>{
                let combined=format!("{role}: {label}");
                if !labels.contains(&combined){labels.push(combined);}
            },
            "AFTER_DECISION"=>post+=1,
            _=>unknown+=1,
        }
    }
    Ok((labels,post,unknown))
}

fn trade_has_evidence(conn:&Connection,trade_id:&str,candidate_id:&Option<String>,evidence_type_id:&str,
    decision_at:Option<&str>,at_decision:bool)->Result<bool,AppError>{
    // Existing ANY_RECORDED filter means observed at any point in the lifecycle.
    // Only the opt-in AT_DECISION filter enforces a contemporaneous timestamp.
    // julianday converts timezone offsets and excludes unparseable/unknown dates.
    // Do not silently interpret post-decision observations as entry confirmation.
    let n:i64=conn.query_row(
        "SELECT COUNT(*) FROM evidence_observations
         WHERE evidence_type_id=?1 AND present=1
           AND (trade_id=?2 OR (?3 IS NOT NULL AND candidate_id=?3))
           AND (?4=0 OR (?5 IS NOT NULL AND julianday(occurred_at) IS NOT NULL
               AND julianday(?5) IS NOT NULL AND julianday(occurred_at)<=julianday(?5)))",
        params![evidence_type_id,trade_id,candidate_id,i64::from(at_decision),decision_at], |r|r.get(0)
    )?;
    Ok(n>0)
}

#[derive(Debug, Serialize, Clone)]
pub struct DecisionOnlyAnalyticsDto {
    pub session_date: String,
    pub instrument_symbol: String,
    pub no_trade_count: i64,
    pub missed_count: i64,
    pub reason_missing_count: i64,
}

#[derive(Debug, Serialize, Clone)]
pub struct DecisionReasonAnalyticsDto {
    pub session_date: String,
    pub instrument_symbol: String,
    pub decision_type: String,
    /// Existing structured reason code, or an explicit marker for uncoded notes/missing.
    /// Raw free-text reason notes are never returned in aggregated analytics.
    pub reason_code: String,
    pub decision_count: i64,
}

/// Read-only descriptive aggregation. Never infer missed validity from a reason.
pub fn list_decision_reason_analytics(
    conn: &Connection,
    filter: JournalFilterInput,
)->Result<Vec<DecisionReasonAnalyticsDto>,AppError>{
    let mut stmt=conn.prepare(
        "SELECT s.session_date, COALESCE(s.instrument_symbol_snapshot,i.symbol),
                cd.decision_type,
                CASE
                  WHEN TRIM(COALESCE(cd.reason_code,''))<>'' THEN TRIM(cd.reason_code)
                  WHEN TRIM(COALESCE(cd.reason_note,''))<>'' THEN '[FREE_TEXT_ONLY]'
                  ELSE '[NO_REASON]'
                END AS reason_group,
                COUNT(*)
         FROM candidate_decisions cd
         JOIN sessions s ON s.session_id=cd.session_id
         JOIN instruments i ON i.instrument_id=s.instrument_id
         WHERE cd.decision_type IN ('NO_TRADE','MISSED')
           AND (?1 IS NULL OR s.session_date>=?1)
           AND (?2 IS NULL OR s.session_date<=?2)
           AND (?3 IS NULL OR COALESCE(s.instrument_symbol_snapshot,i.symbol)=?3)
         GROUP BY s.session_date,COALESCE(s.instrument_symbol_snapshot,i.symbol),
                  cd.decision_type,reason_group
         ORDER BY s.session_date DESC,COUNT(*) DESC,cd.decision_type,reason_group"
    )?;
    let rows=stmt.query_map(
        params![filter.date_from,filter.date_to,filter.instrument_symbol],
        |row|Ok(DecisionReasonAnalyticsDto{
            session_date:row.get(0)?,instrument_symbol:row.get(1)?,
            decision_type:row.get(2)?,reason_code:row.get(3)?,
            decision_count:row.get(4)?,
        })
    )?.collect::<Result<Vec<_>,_>>()?;
    Ok(rows)
}

/// Read-only and intentionally scoped to session dates and instrument. Other trade
/// filters (R, rule checks, evidence, direction) do not apply to unexecuted decisions.
pub fn list_decision_only_analytics(
    conn: &Connection,
    filter: JournalFilterInput,
)->Result<Vec<DecisionOnlyAnalyticsDto>,AppError>{
    let mut stmt=conn.prepare(
        "SELECT s.session_date, COALESCE(s.instrument_symbol_snapshot,i.symbol),
                SUM(CASE WHEN cd.decision_type='NO_TRADE' THEN 1 ELSE 0 END),
                SUM(CASE WHEN cd.decision_type='MISSED' THEN 1 ELSE 0 END),
                SUM(CASE WHEN TRIM(COALESCE(cd.reason_code,''))='' AND TRIM(COALESCE(cd.reason_note,''))='' THEN 1 ELSE 0 END)
         FROM candidate_decisions cd
         JOIN sessions s ON s.session_id=cd.session_id
         JOIN instruments i ON i.instrument_id=s.instrument_id
         WHERE cd.decision_type IN ('NO_TRADE','MISSED')
           AND (?1 IS NULL OR s.session_date>=?1)
           AND (?2 IS NULL OR s.session_date<=?2)
           AND (?3 IS NULL OR COALESCE(s.instrument_symbol_snapshot,i.symbol)=?3)
         GROUP BY s.session_date,COALESCE(s.instrument_symbol_snapshot,i.symbol)
         ORDER BY s.session_date DESC,COALESCE(s.instrument_symbol_snapshot,i.symbol)"
    )?;
    let rows=stmt.query_map(
        params![filter.date_from,filter.date_to,filter.instrument_symbol],
        |row|Ok(DecisionOnlyAnalyticsDto{
            session_date:row.get(0)?,instrument_symbol:row.get(1)?,
            no_trade_count:row.get(2)?,missed_count:row.get(3)?,
            reason_missing_count:row.get(4)?,
        })
    )?.collect::<Result<Vec<_>,_>>()?;
    Ok(rows)
}

pub fn list_journal_trades(conn:&Connection,filter:JournalFilterInput)->Result<Vec<JournalTradeRowDto>,AppError>{
    if !matches!(filter.evidence_timing.as_deref(),None|Some("ANY_RECORDED")|Some("AT_DECISION")){
        return Err(AppError::Validation("unknown evidence timing filter".into()));
    }
    let mut stmt=conn.prepare(
        "SELECT t.trade_id,t.session_id,s.session_date,COALESCE(s.instrument_symbol_snapshot,i.symbol),t.direction,t.status,t.candidate_id,c.label,COALESCE(tr.decision_quality,t.decision_quality,cd.decision_quality),COALESCE(trc.any_violation,-1),cd.based_on_candidate_revision_id,cd.occurred_at
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
        r.get::<_,Option<String>>(6)?,r.get::<_,Option<String>>(7)?,r.get::<_,Option<String>>(8)?,r.get::<_,i64>(9)?,r.get::<_,Option<String>>(10)?,r.get::<_,Option<String>>(11)?
    )))?.collect::<Result<Vec<_>,_>>()?;
    let mut out=Vec::new();
    for (trade_id,session_id,session_date,instrument,direction,status,candidate_id,candidate_label,decision_quality,rule_flag,decision_candidate_revision_id,decision_at) in base {
        if let Some(v)=&filter.date_from {if session_date.as_str() < v.as_str() {continue;}}
        if let Some(v)=&filter.date_to {if session_date.as_str() > v.as_str() {continue;}}
        if let Some(v)=&filter.instrument_symbol {if instrument.as_str() != v.as_str() {continue;}}
        if let Some(v)=&filter.direction {if direction.as_str() != v.as_str() {continue;}}
        if let Some(v)=&filter.decision_quality {if decision_quality.as_deref()!=Some(v.as_str()) {continue;}}
        let rule_status=match rule_flag {1=>"VIOLATED",0=>"FOLLOWED",_=>"UNCHECKED"}.to_string();
        if let Some(v)=&filter.rule_status {if rule_status.as_str() != v.as_str() {continue;}}
        let sources=trade_level_sources(conn,&decision_candidate_revision_id)?;
        if let Some(v)=&filter.level_source_type_id {if !sources.iter().any(|(id,_)|id==v){continue;}}
        if let Some(v)=&filter.evidence_type_id {
            let at_decision=matches!(filter.evidence_timing.as_deref(),Some("AT_DECISION"));
            if !trade_has_evidence(conn,&trade_id,&candidate_id,v,decision_at.as_deref(),at_decision)?{continue;}
        }
        let evidence_temporal=trade_evidence_temporal_snapshot(
            conn,&trade_id,&candidate_id,decision_at.as_deref()
        )?;
        let session_timezone_id:Option<String>=conn.query_row(
            "SELECT timezone_id FROM sessions WHERE session_id=?1",
            [&session_id],|r|r.get(0)
        )?;
        let metrics=trade_metrics(conn,&trade_id)?;
        let audited_correction_count:i64=conn.query_row(
          "SELECT COUNT(*) FROM fill_correction_events ce
           JOIN execution_fills f ON f.execution_id=ce.execution_id
           WHERE f.trade_id=?1",
          [&trade_id],|r|r.get(0))?;
        // Reuse the existing trade-scoped audit readouts. Do not count unrelated
        // Zone revisions or other trades, and never infer corrections from
        // changed effective values alone. A shared source may affect each
        // independently saved Decision/Trade referencing that exact revision.
        let audited_initial_risk_correction_count=
            crate::initial_risk_corrections::list_initial_risk_corrections(conn,&trade_id)?.len() as i64;
        let audited_source_type_correction_count=
            crate::source_type_corrections::list_source_corrections_for_trade(conn,&trade_id)?.len() as i64;
        let audited_source_price_correction_count=
            crate::source_price_corrections::list_for_trade(conn,&trade_id)?.len() as i64;
        // This read-only attribution uses the saved version ID snapshotted at
        // the original entry. Historical closed-trade links are labelled
        // RETROSPECTIVE, never misrepresented as known at decision time.
        let setup=conn.query_row(
          "SELECT COALESCE(t.setup_version_id,stl.version_id),
                  d.name_snapshot,d.version_number,
                  CASE WHEN t.setup_version_id IS NOT NULL THEN 'AT_ENTRY'
                       WHEN stl.version_id IS NOT NULL THEN 'RETROSPECTIVE'
                       ELSE 'NOT_RECORDED' END,
                  d.market_context
           FROM trades t
           LEFT JOIN setup_trade_links stl ON stl.trade_id=t.trade_id
           LEFT JOIN setup_playbook_details d
             ON d.version_id=COALESCE(t.setup_version_id,stl.version_id)
           WHERE t.trade_id=?1",
          [&trade_id],|r|Ok((
            r.get::<_,Option<String>>(0)?,r.get::<_,Option<String>>(1)?,
            r.get::<_,Option<i64>>(2)?,r.get::<_,String>(3)?,
            r.get::<_,Option<String>>(4)?
          ))
        )?;
        out.push(JournalTradeRowDto{
            trade_id,session_id,session_date,
            decision_occurred_at:decision_at,session_timezone_id,
            instrument_symbol:instrument,direction,status,candidate_label,decision_quality,rule_status,
            level_sources:sources.into_iter().map(|(_,label)|label).collect(),
            level_source_snapshot_missing:candidate_id.is_some()&&decision_candidate_revision_id.is_none(),
            mistakes:trade_mistake_labels(conn,&metrics.trade_id)?,
            realized_r:metrics.realized_r,net_realized_pnl:metrics.net_realized_pnl,
            open_quantity:metrics.open_quantity,audited_correction_count,
            audited_initial_risk_correction_count,audited_source_type_correction_count,
            audited_source_price_correction_count,
            setup_version_id:setup.0,setup_version_name:setup.1,
            setup_version_number:setup.2,setup_attribution:setup.3,
            setup_defined_market_context:setup.4,
            evidence_observed_at_decision:evidence_temporal.0,
            evidence_post_decision_count:evidence_temporal.1,
            evidence_unknown_timing_count:evidence_temporal.2,
        });
    }
    Ok(out)
}

/// Descriptive R payoff only when both winning and losing closed samples exist.
fn closed_r_payoff(avg_winner_r:Option<f64>,avg_loser_r:Option<f64>)->Option<f64>{
    match (avg_winner_r,avg_loser_r){
        (Some(win),Some(loss)) if win.is_finite() && loss.is_finite() && win>0.0 && loss<0.0
            =>Some(win/loss.abs()),
        _=>None,
    }
}

/// Currency-denominated expectancy uses ONLY closed Trades with known net P&L;
/// missing-cost outcomes never enter this denominator, even when R is unknown.
fn known_pnl_expectancy(pnls:&[f64])->Option<f64>{
    if pnls.is_empty() || pnls.iter().any(|p|!p.is_finite()){return None;}
    Some(pnls.iter().sum::<f64>()/pnls.len() as f64)
}

#[cfg(test)]
mod extra_analytics_metric_tests {
    use super::{closed_r_payoff,known_pnl_expectancy};
    #[test]
    fn win_loss_payoff_requires_both_signed_closed_r_samples(){
        assert_eq!(closed_r_payoff(Some(2.0),Some(-0.5)),Some(4.0));
        assert_eq!(closed_r_payoff(Some(1.0),None),None);
        assert_eq!(closed_r_payoff(None,Some(-1.0)),None);
        assert_eq!(closed_r_payoff(Some(0.0),Some(-1.0)),None);
        assert_eq!(closed_r_payoff(Some(2.0),Some(0.0)),None);
        assert_eq!(closed_r_payoff(Some(f64::NAN),Some(-1.0)),None);
    }
    #[test]
    fn net_pnl_expectancy_uses_known_denominator_not_all_trades(){
        assert_eq!(known_pnl_expectancy(&[292.0,-104.0]),Some(94.0));
        assert_eq!(known_pnl_expectancy(&[0.0]),Some(0.0));
        assert_eq!(known_pnl_expectancy(&[]),None);
        assert_eq!(known_pnl_expectancy(&[292.0,f64::NAN]),None);
    }
}

/// Sequence analytics are available only for an entirely date-ordered,
/// R-eligible CLOSED sample. Do not collapse missing-R Trades into zero or
/// invent the order of simultaneous/unknown exits.
fn complete_realized_r_sequence(
    mut points:Vec<(chrono::DateTime<chrono::Utc>,f64)>
)->Option<(i64,i64,f64)>{
    if points.is_empty()||points.iter().any(|(_,r)|!r.is_finite()){return None;}
    points.sort_by_key(|(at,_)|*at);
    if points.windows(2).any(|w|w[0].0==w[1].0){return None;}
    let mut run_win=0;let mut run_loss=0;
    let mut best_win=0;let mut best_loss=0;
    let mut cumulative=0.0_f64;let mut peak=0.0_f64;let mut drawdown=0.0_f64;
    for (_,r) in points{
        if r>1e-9{run_win+=1;run_loss=0;}
        else if r< -1e-9{run_loss+=1;run_win=0;}
        else{run_win=0;run_loss=0;}
        best_win=best_win.max(run_win);
        best_loss=best_loss.max(run_loss);
        cumulative+=r;peak=peak.max(cumulative);
        drawdown=drawdown.max(peak-cumulative);
    }
    Some((best_win,best_loss,drawdown))
}

#[cfg(test)]
mod chronological_realized_r_tests {
    use super::complete_realized_r_sequence;
    use chrono::{DateTime,Utc};
    fn at(s:&str)->DateTime<Utc>{
        DateTime::parse_from_rfc3339(s).unwrap().with_timezone(&Utc)
    }
    #[test]
    fn ordered_realized_r_peak_drawdown_and_streaks(){
        let dates=["2026-11-09T01:00:00Z","2026-11-09T02:00:00Z",
          "2026-11-09T03:00:00Z","2026-11-09T04:00:00Z",
          "2026-11-09T05:00:00Z","2026-11-09T06:00:00Z"];
        // Out-of-order input must be sorted by actual close time.
        let points=vec![(at(dates[5]),0.0),(at(dates[3]),-1.0),
          (at(dates[0]),2.0),(at(dates[4]),1.0),(at(dates[2]),-2.0),
          (at(dates[1]),1.0)];
        // R equity: 0,2,3,1,0,1,1; peak-to-trough is 3 R.
        assert_eq!(complete_realized_r_sequence(points),Some((2,2,3.0)));
    }
    #[test]
    fn unknown_duplicate_or_unordered_identity_is_not_a_zero_drawdown(){
        let t=at("2026-11-09T00:00:00Z");
        assert_eq!(complete_realized_r_sequence(Vec::new()),None);
        assert_eq!(complete_realized_r_sequence(vec![(t,1.0),(t,-1.0)]),None);
        assert_eq!(complete_realized_r_sequence(vec![(t,f64::NAN)]),None);
        assert_eq!(complete_realized_r_sequence(vec![(t,-0.5)]),Some((0,1,0.5)));
    }
}

pub fn get_analytics_summary(conn:&Connection,filter:JournalFilterInput)->Result<AnalyticsSummaryDto,AppError>{
    let rows=list_journal_trades(conn,filter)?;
    let closed:Vec<&JournalTradeRowDto>=rows.iter().filter(|x|x.status=="CLOSED").collect();
    let mut rs:Vec<f64>=closed.iter().filter_map(|x|x.realized_r).collect();
    let pnls:Vec<f64>=closed.iter().filter_map(|x|x.net_realized_pnl).collect();
    // R is unitless, but currency totals cannot combine USD/AUD/etc or
    // fill a missing historical Session currency from today's instrument
    // settings (which may have changed after the original execution).
    let mut currencies=std::collections::BTreeSet::new();
    let mut missing_currency=false;
    for row in closed.iter().filter(|row|row.net_realized_pnl.is_some()){
        let saved:Option<String>=conn.query_row(
            "SELECT instrument_currency_snapshot FROM sessions WHERE session_id=?1",
            [&row.session_id],|record|record.get(0)
        )?;
        match saved{
            Some(code) if code.len()==3 && code.bytes().all(|ch|ch.is_ascii_uppercase())
                =>{currencies.insert(code);},
            _=>missing_currency=true,
        }
    }
    let pnl_currency_status=if pnls.is_empty(){"NO_ELIGIBLE"}
        else if currencies.len()>1{"MIXED_CURRENCIES"}
        else if missing_currency||currencies.is_empty(){"UNKNOWN_CURRENCY"}
        else{"SINGLE_CURRENCY"}.to_string();
    let pnl_currency=if pnl_currency_status=="SINGLE_CURRENCY"{
        currencies.into_iter().next()
    }else{None};
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
    // Keep both operands from the same verified closed-R sample; missing one
    // side is not evidence of a zero win/loss payoff.
    let win_loss_payoff_r=closed_r_payoff(average_winner_r,average_loser_r);
    // Initial risk is NOT required for trustworthy net P&L. Missing costs
    // result in NULL net P&L and those Trades cannot dilute this denominator.
    let expectancy_pnl=if pnl_currency.is_some(){
        known_pnl_expectancy(&pnls)
    }else{None};
    // Each CLOSED trade must have a finite R and a complete, unambiguous
    // timestamp for EVERY exit Fill. The final exit defines realized outcome
    // order, never Session date or a guessed Trade-ID ordering.
    let mut sequence=Vec::new();
    let mut sequence_complete=!closed.is_empty();
    for row in &closed{
        let Some(r)=row.realized_r.filter(|v|v.is_finite()) else{
            sequence_complete=false;break;
        };
        let mut query=conn.prepare(
            "SELECT occurred_at FROM execution_fills
             WHERE trade_id=?1 AND action='EXIT' ORDER BY rowid"
        )?;
        let events=query.query_map([&row.trade_id],|item|item.get::<_,Option<String>>(0))?;
        let mut last:Option<chrono::DateTime<chrono::Utc>>=None;
        let mut any=false;
        for observed in events{
            any=true;
            let Some(raw)=observed? else{sequence_complete=false;break;};
            let Ok(stamp)=chrono::DateTime::parse_from_rfc3339(&raw) else{
                sequence_complete=false;break;
            };
            let instant=stamp.with_timezone(&chrono::Utc);
            last=Some(last.map_or(instant,|old|old.max(instant)));
        }
        if !sequence_complete||!any{sequence_complete=false;break;}
        sequence.push((last.expect("at least one parsed exit timestamp"),r));
    }
    let chronological=if sequence_complete{
        complete_realized_r_sequence(sequence)
    }else{None};
    let rule_violation_trades=rows.iter().filter(|x|x.rule_status=="VIOLATED").count() as i64;
    // A known profitable result does not require a known initial risk.
    // Unknown costs -> UNKNOWN net result and are never counted as wins.
    let bad_decision_win_count=closed.iter().filter(|x|
        matches!(x.decision_quality.as_deref(),Some("C")|Some("INVALID")) &&
        x.net_realized_pnl.is_some_and(|net|net>1e-9)
    ).count() as i64;
    let currency_safe_net_pnl=if pnl_currency_status=="SINGLE_CURRENCY"{
        Some(pnls.iter().sum::<f64>())
    }else{None};
    Ok(AnalyticsSummaryDto{
        trade_count:rows.len() as i64,closed_trade_count:closed.len() as i64,
        eligible_net_pnl_count:pnls.len() as i64,eligible_r_count:eligible,
        wins,losses,breakeven,win_rate,average_r,median_r,net_r,
        average_winner_r,average_loser_r,profit_factor_r,expectancy_r:average_r,
        win_loss_payoff_r,expectancy_pnl,pnl_currency,pnl_currency_status,
        max_winning_streak:chronological.map(|v|v.0),
        max_losing_streak:chronological.map(|v|v.1),
        max_realized_r_drawdown:chronological.map(|v|v.2),
        net_pnl:currency_safe_net_pnl,rule_violation_trades,bad_decision_win_count,small_sample:eligible<20
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



#[cfg(test)]
mod evidence_atomic_batch_tests {
    use super::*;

    fn memory_db()->Connection {
        let conn=Connection::open_in_memory().expect("memory database");
        conn.execute_batch("
            CREATE TABLE sessions(session_id TEXT PRIMARY KEY,status TEXT NOT NULL);
            CREATE TABLE evidence_types(evidence_type_id TEXT PRIMARY KEY,active INTEGER NOT NULL);
            CREATE TABLE evidence_observations(
                evidence_id TEXT PRIMARY KEY, session_id TEXT NOT NULL,candidate_id TEXT,
                evidence_type_id TEXT NOT NULL,role TEXT NOT NULL,occurred_at TEXT NOT NULL,
                direction TEXT,price REAL,numeric_value REAL,strength REAL,
                present INTEGER NOT NULL,note TEXT,provenance TEXT NOT NULL
            );
            INSERT INTO sessions(session_id,status) VALUES('s1','ACTIVE');
            INSERT INTO evidence_types(evidence_type_id,active) VALUES('valid',1);
        ").expect("test schema");
        conn
    }

    fn observation(evidence_type_id:&str)->EvidenceObservationInput {
        EvidenceObservationInput {
            session_id:"s1".into(),candidate_id:None,
            evidence_type_id:evidence_type_id.into(),role:"GENERAL_OBSERVATION".into(),
            direction:None,price:None,numeric_value:None,strength:None,note:None
        }
    }

    #[test]
    fn atomic_evidence_batch_commits_all_valid_rows() {
        let mut db=memory_db();
        let ids=add_evidence_observations_atomic(&mut db,vec![observation("valid"),observation("valid")]).expect("atomic commit");
        assert_eq!(ids.len(),2);
        assert_ne!(ids[0],ids[1]);
        let count:i64=db.query_row("SELECT COUNT(*) FROM evidence_observations",[],|r|r.get(0)).unwrap();
        assert_eq!(count,2);
    }

    #[test]
    fn atomic_evidence_batch_rolls_back_all_rows_if_later_item_fails() {
        let mut db=memory_db();
        let result=add_evidence_observations_atomic(&mut db,vec![observation("valid"),observation("inactive-or-unknown")]);
        assert!(result.is_err());
        let count:i64=db.query_row("SELECT COUNT(*) FROM evidence_observations",[],|r|r.get(0)).unwrap();
        assert_eq!(count,0,"first insert must roll back with failed second observation");
    }
}

#[cfg(test)]
mod review_pending_validation_tests {
    use super::*;

    fn review(finalize: bool) -> SaveTradeReviewInput {
        SaveTradeReviewInput {
            trade_id: "test-trade".into(),
            decision_quality: None,
            execution_quality: None,
            management_quality: None,
            exit_reason_code: None,
            exit_reason_note: None,
            emotion_affected: Some(true),
            psychology_state: None,
            psychology_intensity: None,
            psychology_stage: None,
            mistake_type_ids: vec![],
            note: None,
            finalize: Some(finalize),
        }
    }

    #[test]
    fn review_pending_allows_partial_psychology_details() {
        assert!(validate_review_input(&review(false)).is_ok());
    }

    #[test]
    fn review_pending_allows_only_one_psychology_detail() {
        let mut input = review(false);
        input.psychology_state = Some("hesitation".into());
        assert!(validate_review_input(&input).is_ok());
    }

    #[test]
    fn review_pending_still_rejects_invalid_psychology_stage() {
        let mut input = review(false);
        input.psychology_stage = Some("NOT_A_REAL_STAGE".into());
        assert!(validate_review_input(&input).is_err());
    }

    #[test]
    fn completed_review_rejects_missing_psychology_details() {
        assert!(validate_review_input(&review(true)).is_err());
    }

    #[test]
    fn completed_review_accepts_required_psychology_details() {
        let mut input = review(true);
        input.psychology_state = Some("hesitation".into());
        input.psychology_stage = Some("ENTRY".into());
        assert!(validate_review_input(&input).is_ok());
    }
}


#[cfg(test)]
mod decision_mismatch_persistence_tests {
    use super::*;

    fn memory_db() -> Connection {
        let db=Connection::open_in_memory().expect("isolated SQLite test database");
        db.execute_batch("
            CREATE TABLE sessions(session_id TEXT PRIMARY KEY, status TEXT NOT NULL);
            CREATE TABLE candidates(candidate_id TEXT PRIMARY KEY, session_id TEXT NOT NULL);
            CREATE TABLE session_plan_revisions(session_id TEXT,revision_id TEXT,revision_number INTEGER);
            CREATE TABLE candidate_revisions(candidate_id TEXT,candidate_revision_id TEXT,revision_number INTEGER,directional_intent TEXT,trend_relationship TEXT);
            CREATE TABLE candidate_decisions(
                decision_id TEXT PRIMARY KEY,candidate_id TEXT,session_id TEXT,occurred_at TEXT,
                decision_type TEXT,reason_code TEXT,reason_note TEXT,decision_quality TEXT,
                decision_quality_note TEXT,based_on_plan_revision_id TEXT,based_on_candidate_revision_id TEXT,
                provenance TEXT,intended_direction TEXT,plan_alignment TEXT,plan_mismatch_reason TEXT
            );
            INSERT INTO sessions VALUES('s1','ACTIVE');
            INSERT INTO candidates VALUES('zone1','s1');
            INSERT INTO candidate_revisions VALUES('zone1','rev1',1,'LONG','WITH_TREND');
        ").expect("minimal test-only schema");
        db
    }

    fn input(kind:&str,direction:Option<&str>,reason:Option<&str>) -> CreateCandidateDecisionInput {
        CreateCandidateDecisionInput{
            session_id:"s1".into(),candidate_id:Some("zone1".into()),
            decision_type:kind.into(),intended_direction:direction.map(str::to_string),
            reason_code:if kind=="TRADE"{None}else{Some("MISSING_CONFIRMATION".into())},
            reason_note:None,decision_quality:None,decision_quality_note:None,
            plan_mismatch_reason:reason.map(str::to_string),
        }
    }

    #[test]
    fn opposite_trade_reason_round_trips_through_sqlite() {
        let db=memory_db();
        let saved=create_candidate_decision(&db,input("TRADE",Some("SHORT"),Some("NEW_EVIDENCE"))).unwrap();
        assert_eq!(saved.plan_alignment.as_deref(),Some("MISMATCH"));
        assert_eq!(saved.plan_mismatch_reason.as_deref(),Some("NEW_EVIDENCE"));
        let history=list_candidate_decisions(&db,"zone1").unwrap();
        assert_eq!(history.len(),1);
        assert_eq!(history[0].plan_mismatch_reason.as_deref(),Some("NEW_EVIDENCE"));
    }

    #[test]
    fn opposite_trade_without_reason_never_inserts_a_row() {
        let db=memory_db();
        assert!(create_candidate_decision(&db,input("TRADE",Some("SHORT"),None)).is_err());
        assert!(list_candidate_decisions(&db,"zone1").unwrap().is_empty());
    }

    #[test]
    fn aligned_trade_discards_stale_mismatch_reason_before_storage() {
        let db=memory_db();
        let saved=create_candidate_decision(&db,input("TRADE",Some("LONG"),Some("STALE_REASON"))).unwrap();
        assert_eq!(saved.plan_alignment.as_deref(),Some("ALIGNED"));
        assert_eq!(saved.plan_mismatch_reason,None);
        assert_eq!(list_candidate_decisions(&db,"zone1").unwrap()[0].plan_mismatch_reason,None);
    }

    #[test]
    fn no_trade_and_missed_discard_stale_mismatch_reason_before_storage() {
        let db=memory_db();
        for kind in ["NO_TRADE","MISSED"] {
            let saved=create_candidate_decision(&db,input(kind,None,Some("STALE_REASON"))).unwrap();
            assert_eq!(saved.plan_mismatch_reason,None);
        }
        let history=list_candidate_decisions(&db,"zone1").unwrap();
        assert_eq!(history.len(),2);
        assert!(history.iter().all(|row| row.plan_mismatch_reason.is_none()));
    }

    #[test]
    fn package_a_two_zones_evidence_and_repeated_decisions_preserve_sqlite_owner_history() {
        // Real in-memory SQLite and native repository methods, never user data.
        // A decision to TRADE does not itself create a trade or an execution fill.
        let mut db=memory_db();
        db.execute_batch("
            CREATE TABLE evidence_types(
                evidence_type_id TEXT PRIMARY KEY,label TEXT NOT NULL,active INTEGER NOT NULL
            );
            CREATE TABLE evidence_observations(
                evidence_id TEXT PRIMARY KEY,session_id TEXT NOT NULL,candidate_id TEXT,
                evidence_type_id TEXT NOT NULL,role TEXT NOT NULL,occurred_at TEXT NOT NULL,
                direction TEXT,price REAL,numeric_value REAL,strength REAL,
                present INTEGER NOT NULL,note TEXT,provenance TEXT NOT NULL
            );
            CREATE TABLE trades(trade_id TEXT PRIMARY KEY,decision_id TEXT);
            CREATE TABLE execution_fills(fill_id TEXT PRIMARY KEY,trade_id TEXT);
            INSERT INTO evidence_types VALUES('delta','Delta',1),('absorption','Absorption',1);
            INSERT INTO candidates VALUES('zone2','s1');
            INSERT INTO candidate_revisions VALUES('zone2','rev2',1,'SHORT','WITH_TREND');
            INSERT INTO sessions VALUES('s2','ACTIVE');
            INSERT INTO candidates VALUES('other-session-zone','s2');
            INSERT INTO candidate_revisions VALUES('other-session-zone','otherrev',1,'LONG','WITH_TREND');
        ").expect("two-Zone isolated fixture");

        let observation=|zone:&str,kind:&str,role:&str| EvidenceObservationInput {
            session_id:"s1".into(),candidate_id:Some(zone.into()),
            evidence_type_id:kind.into(),role:role.into(),
            direction:None,price:None,numeric_value:None,strength:None,note:None,
        };

        let ids=add_evidence_observations_atomic(&mut db,vec![
            observation("zone1","delta","SETUP_SUPPORT"),
            observation("zone1","absorption","CONTRADICTING_EVIDENCE"),
        ]).expect("atomic Zone 1 observations");
        assert_eq!(ids.len(),2);
        assert_ne!(ids[0],ids[1]);
        let second=add_evidence_observations_atomic(&mut db,vec![
            observation("zone2","delta","GENERAL_OBSERVATION"),
        ]).expect("independent Zone 2 evidence");
        assert_eq!(second.len(),1);

        // A mixed-Zone batch must be rejected before the first append; a
        // candidate belonging to another Session cannot be used as evidence.
        assert!(add_evidence_observations_atomic(&mut db,vec![
            observation("zone1","delta","GENERAL_OBSERVATION"),
            observation("zone2","absorption","GENERAL_OBSERVATION"),
        ]).is_err());
        assert!(add_evidence_observations_atomic(&mut db,vec![
            observation("other-session-zone","delta","GENERAL_OBSERVATION"),
        ]).is_err());

        let zone1=list_candidate_evidence(&db,"zone1").expect("persisted evidence A");
        let zone2=list_candidate_evidence(&db,"zone2").expect("persisted evidence B");
        assert_eq!(zone1.len(),2);
        assert_eq!(zone2.len(),1);
        assert!(zone1.iter().any(|e|e.role=="SETUP_SUPPORT"));
        assert!(zone1.iter().any(|e|e.role=="CONTRADICTING_EVIDENCE"));
        assert!(zone2.iter().all(|e|e.candidate_id.as_deref()==Some("zone2")));

        let no_trade=create_candidate_decision(&db,input("NO_TRADE",None,None))
            .expect("reasoned NO_TRADE");
        let mut missed_input=input("MISSED",None,None);
        missed_input.candidate_id=Some("zone2".into());
        let missed=create_candidate_decision(&db,missed_input).expect("reasoned MISSED");
        let trade_first=create_candidate_decision(&db,input("TRADE",Some("LONG"),None))
            .expect("first TRADE intent");
        let trade_second=create_candidate_decision(&db,input("TRADE",Some("LONG"),None))
            .expect("independent same-Zone re-entry intent");
        assert_ne!(trade_first.decision_id,trade_second.decision_id);

        let decisions_a=list_candidate_decisions(&db,"zone1").expect("Zone 1 decisions");
        let decisions_b=list_candidate_decisions(&db,"zone2").expect("Zone 2 decisions");
        assert_eq!(decisions_a.len(),3);
        assert_eq!(decisions_b.len(),1);
        assert_eq!(no_trade.decision_type,"NO_TRADE");
        assert_eq!(missed.decision_type,"MISSED");
        assert!(decisions_a.iter().any(|d|d.decision_id==no_trade.decision_id));
        assert!(decisions_a.iter().any(|d|d.decision_id==trade_first.decision_id));
        assert!(decisions_a.iter().any(|d|d.decision_id==trade_second.decision_id));
        assert_eq!(decisions_b[0].decision_id,missed.decision_id);
        assert!(decisions_a.iter().all(|d|!d.occurred_at.is_empty()));

        let trade_count:i64=db.query_row("SELECT COUNT(*) FROM trades",[],|row|row.get(0)).unwrap();
        let fill_count:i64=db.query_row("SELECT COUNT(*) FROM execution_fills",[],|row|row.get(0)).unwrap();
        assert_eq!(trade_count,0,"Trade intent alone must never create an executed trade");
        assert_eq!(fill_count,0,"No actual fill was captured");
    }

}

#[cfg(test)]
mod expanded_instrument_catalog_tests {
    use super::*;

    fn test_db()->Connection {
        let conn=Connection::open_in_memory().expect("isolated in-memory SQLite");
        crate::db::migrate(&conn).expect("schema v9");
        conn
    }

    #[test]
    fn fresh_catalog_has_all_preset_contracts_and_stock_profiles() {
        let db=test_db();
        let instruments=list_all_instruments(&db).unwrap();
        assert_eq!(instruments.len(),DEFAULT_INSTRUMENT_PROFILES.len());
        for &(_,symbol,_,tick,point,currency,kind) in DEFAULT_INSTRUMENT_PROFILES {
            let profile=instruments.iter().find(|i|i.symbol==symbol).expect("missing preset");
            assert!((profile.tick_size-tick).abs()<1e-9,"wrong tick for {symbol}");
            assert!((profile.point_value-point).abs()<1e-9,"wrong point value for {symbol}");
            assert_eq!(profile.currency,currency);
            assert_eq!(profile.market_type.as_deref(),Some(kind));
            assert!(profile.active);
            assert!(!profile.user_defined);
            assert!((profile.tick_size*profile.point_value)>0.0);
        }
        assert_eq!(instruments[0].symbol,"ES");
        assert_eq!(instruments[1].symbol,"GC");
    }

    #[test]
    fn reopening_never_restores_deactivated_or_overwrites_edited_presets() {
        let db=test_db();
        let first=list_all_instruments(&db).unwrap();
        let nq=first.iter().find(|i|i.symbol=="NQ").unwrap().clone();
        let changed=UpdateInstrumentInput {
            instrument_id:nq.instrument_id.clone(),
            symbol:nq.symbol.clone(),display_name:Some("MY CUSTOM NQ LABEL".into()),
            tick_size:0.5,point_value:22.0,currency:"USD".into(),
            market_type:Some("FUTURES".into()),active:false,display_order:321,
        };
        update_instrument(&db,changed).unwrap();
        let second=list_all_instruments(&db).unwrap();
        assert_eq!(first.len(),second.len());
        let preserved=second.iter().find(|i|i.symbol=="NQ").unwrap();
        assert!(!preserved.active);
        assert_eq!(preserved.tick_size,0.5);
        assert_eq!(preserved.point_value,22.0);
        assert_eq!(preserved.display_name.as_deref(),Some("MY CUSTOM NQ LABEL"));
        assert_eq!(preserved.display_order,321);
        assert!(!list_instruments(&db).unwrap().iter().any(|i|i.symbol=="NQ"));
    }

    #[test]
    fn old_two_symbol_catalog_grows_without_rewriting_existing_or_custom_order() {
        let db=test_db();
        db.execute("INSERT INTO workspaces(workspace_id,name,created_at) VALUES('default-workspace','Existing','2026-10-15')",[]).unwrap();
        for (id,symbol,order) in [("instrument-ES","ES",20_i64),("instrument-GC","GC",2_i64)] {
            db.execute(
                "INSERT INTO instruments(instrument_id,workspace_id,symbol,display_name,tick_size,point_value,currency,active,market_type,display_order,user_defined) VALUES(?1,'default-workspace',?2,'Original user value',0.5,80,'USD',1,'FUTURES',?3,0)",
                params![id,symbol,order],
            ).unwrap();
        }
        db.execute("INSERT INTO instruments(instrument_id,workspace_id,symbol,display_name,tick_size,point_value,currency,active,market_type,display_order,user_defined) VALUES('custom-1','default-workspace','CUSTOM','Custom symbol',0.01,1,'USD',1,'STOCK',75,1)",[]).unwrap();
        let rows=list_all_instruments(&db).unwrap();
        assert_eq!(rows.len(),DEFAULT_INSTRUMENT_PROFILES.len()+1);
        let old_es=rows.iter().find(|i|i.symbol=="ES").unwrap();
        assert_eq!(old_es.display_order,20);
        assert_eq!(old_es.tick_size,0.5);
        assert_eq!(old_es.point_value,80.0);
        let custom=rows.iter().find(|i|i.symbol=="CUSTOM").unwrap();
        assert_eq!(custom.display_order,75);
        assert!(custom.user_defined);
        let added=rows.iter().find(|i|i.symbol=="NQ").unwrap();
        assert!(added.display_order>75);
        assert_eq!(list_all_instruments(&db).unwrap().len(),rows.len());
    }

    #[test]
    fn trader_owned_ticker_is_not_replaced_by_same_symbol_catalog_entry() {
        let db=test_db();
        db.execute("INSERT INTO workspaces(workspace_id,name,created_at) VALUES('default-workspace','Existing','2026-10-15')",[]).unwrap();
        db.execute("INSERT INTO instruments(instrument_id,workspace_id,symbol,display_name,tick_size,point_value,currency,active,market_type,display_order,user_defined) VALUES('user-symbol','default-workspace','NVDA','Trader chosen symbol',0.05,1,'USD',0,'STOCK',10,1)",[]).unwrap();
        let rows=list_all_instruments(&db).unwrap();
        assert_eq!(rows.len(),DEFAULT_INSTRUMENT_PROFILES.len());
        let nvda=rows.iter().find(|i|i.symbol=="NVDA").unwrap();
        assert_eq!(nvda.instrument_id,"user-symbol");
        assert_eq!(nvda.tick_size,0.05);
        assert!(!nvda.active);
        assert!(nvda.user_defined);
    }
    #[test]
    fn new_futures_and_stock_sessions_snapshot_correct_preset_values() {
        let db=test_db();
        for (symbol,tick,point,environment) in [
            ("NQ",0.25,20.0,"DEMO"),
            ("RTY",0.1,50.0,"FORWARD_TEST"),
            ("SI",0.005,5000.0,"DEMO"),
            ("CL",0.01,1000.0,"DEMO"),
            ("AAPL",0.01,1.0,"DEMO"),
        ] {
            let session=create_draft_session(&db,CreateSessionInput {
                session_date:"2026-11-09".into(),
                instrument_symbol:symbol.into(),environment:environment.into(),session_label:None,
            }).expect("valid preset draft session");
            assert_eq!(session.instrument_symbol,symbol);
            assert!((session.instrument_tick_size-tick).abs()<1e-9);
            assert!((session.instrument_point_value-point).abs()<1e-9);
            assert_eq!(session.instrument_currency,"USD");
            let snapshot:(f64,f64)=db.query_row(
                "SELECT instrument_tick_size_snapshot,instrument_point_value_snapshot FROM sessions WHERE session_id=?1",
                [&session.session_id],|row|Ok((row.get(0)?,row.get(1)?))
            ).unwrap();
            assert_eq!(snapshot,(tick,point));
        }
    }

}

#[cfg(test)]
mod execution_input_safety_regressions {
    use super::*;

    #[test]
    fn backend_rejects_fractional_zero_negative_nonfinite_quantities() {
        for quantity in [0.0,-1.0,1.5,f64::NAN,f64::INFINITY,f64::NEG_INFINITY] {
            assert!(validate_execution_quantity(quantity).is_err(),"unexpected acceptance: {quantity:?}");
        }
        for quantity in [1.0,2.0,100.0] {
            assert!(validate_execution_quantity(quantity).is_ok());
        }
    }

    #[test]
    fn backend_distinguishes_confirmed_zero_cost_from_unknown_and_rejects_negative() {
        assert!(validate_execution_costs(None,None).is_ok());
        assert!(validate_execution_costs(Some(0.0),Some(0.0)).is_ok());
        assert!(validate_execution_costs(Some(2.75),Some(0.35)).is_ok());
        for amount in [-1.0,f64::NAN,f64::INFINITY,f64::NEG_INFINITY] {
            assert!(validate_execution_costs(Some(amount),None).is_err());
            assert!(validate_execution_costs(None,Some(amount)).is_err());
        }
    }

    #[test]
    fn backend_validates_optional_planned_target_price_grid() {
        assert!(price_tick_aligned(6025.25,0.25));
        assert!(!price_tick_aligned(6025.3,0.25));
    }
}

#[cfg(test)]
mod chronological_trade_accounting_tests {
    use super::*;

    fn events(rows:&[(&str,f64,f64,f64,f64)]) -> Vec<(String,f64,f64,f64,f64)> {
        rows.iter().map(|(action,price,qty,commission,fees)|
            (action.to_string(),*price,*qty,*commission,*fees)).collect()
    }

    #[test]
    fn later_entry_does_not_rewrite_prior_realized_long_profit() {
        let first=events(&[("ENTRY",100.0,2.0,1.0,0.5),("EXIT",110.0,1.0,1.0,0.5)]);
        let before=execution_ledger(&first,"LONG",50.0).unwrap();
        assert_eq!(before.gross_realized,Some(500.0));
        assert_eq!(before.open_average_entry,Some(100.0));
        let after=events(&[
            ("ENTRY",100.0,2.0,1.0,0.5),
            ("EXIT",110.0,1.0,1.0,0.5),
            ("ENTRY",120.0,1.0,1.0,0.5),
            ("EXIT",130.0,1.0,1.0,0.5),
        ]);
        let ledger=execution_ledger(&after,"LONG",50.0).unwrap();
        // second exit uses average of remaining 100 + new 120 = 110.
        assert_eq!(ledger.gross_realized,Some(1500.0));
        assert_eq!(ledger.open_qty,1.0);
        assert_eq!(ledger.open_average_entry,Some(110.0));
        assert_eq!(ledger.entry_qty,3.0);
        assert_eq!(ledger.exit_qty,2.0);
        assert_eq!(ledger.costs,6.0);
        assert_eq!(ledger.gross_realized.map(|n|n-ledger.costs),Some(1494.0));
    }

    #[test]
    fn short_partial_exit_then_scale_in_keeps_chronological_realized_pnl() {
        let fills=events(&[
            ("ENTRY",100.0,2.0,0.0,0.0),
            ("EXIT",90.0,1.0,0.0,0.0),
            ("ENTRY",80.0,1.0,0.0,0.0),
            ("EXIT",70.0,2.0,0.0,0.0),
        ]);
        let ledger=execution_ledger(&fills,"SHORT",5.0).unwrap();
        // 1 at 100 -> 90 = +10; 2 at avg 90 -> 70 = +40, * 5 = 250.
        assert_eq!(ledger.gross_realized,Some(250.0));
        assert_eq!(ledger.open_qty,0.0);
        assert_eq!(ledger.last_average_entry,Some(90.0));
    }

    #[test]
    fn gc_contract_partial_exits_cost_aware_net_r_uses_initial_risk() {
        // GC: 0.10 price tick, $100 per full price point ($10 per tick).
        // Two contracts bought 4100.0, initial stop 4099.5 => $100 initial risk.
        let tick_size=0.10_f64;
        let point_value=100.0_f64;
        assert!(price_tick_aligned(4100.0,tick_size));
        assert!(price_tick_aligned(4100.7,tick_size));
        assert!(!price_tick_aligned(4100.75,tick_size));
        let initial_risk=(4100.0-4099.5)*point_value*2.0;
        assert!((initial_risk-100.0).abs()<1e-8);
        let fills=events(&[
            ("ENTRY",4100.0,2.0,4.0,0.0),
            ("EXIT",4100.7,1.0,2.0,0.0),
            ("EXIT",4099.8,1.0,2.0,0.0),
        ]);
        let before=execution_ledger(&fills[..2],"LONG",point_value).unwrap();
        assert_eq!(before.open_qty,1.0);
        assert!((before.gross_realized.unwrap()-70.0).abs()<1e-8);
        let after=execution_ledger(&fills,"LONG",point_value).unwrap();
        assert_eq!(after.open_qty,0.0);
        let gross=after.gross_realized.unwrap();
        let net=gross-after.costs;
        assert!((gross-50.0).abs()<1e-8);
        assert!((after.costs-8.0).abs()<1e-8);
        assert!((net-42.0).abs()<1e-8);
        assert!((net/initial_risk-0.42).abs()<1e-8);
    }

    #[test]
    fn gc_short_side_and_invalid_exit_quantities_are_not_silently_accepted() {
        let fills=events(&[
            ("ENTRY",4100.0,1.0,2.0,0.0),
            ("EXIT",4099.5,1.0,2.0,0.0),
        ]);
        let state=execution_ledger(&fills,"SHORT",100.0).unwrap();
        assert!((state.gross_realized.unwrap()-50.0).abs()<1e-8);
        assert!((state.gross_realized.unwrap()-state.costs-46.0).abs()<1e-8);
        let over_exit=events(&[
            ("ENTRY",4100.0,1.0,2.0,0.0),
            ("EXIT",4099.5,2.0,2.0,0.0),
        ]);
        assert!(execution_ledger(&over_exit,"SHORT",100.0).is_err());
    }

    #[test]
    fn open_trade_without_exit_has_no_realized_pnl_even_with_entry_cost() {
        let ledger=execution_ledger(&events(&[("ENTRY",100.0,2.0,4.0,0.0)]),"LONG",50.0).unwrap();
        assert_eq!(ledger.gross_realized,None);
        assert_eq!(ledger.costs,4.0);
    }

    #[test]
    fn invalid_historical_fill_sequence_fails_closed_without_modifying_records() {
        let bad=events(&[("ENTRY",100.0,1.0,0.0,0.0),("EXIT",110.0,2.0,0.0,0.0)]);
        assert!(execution_ledger(&bad,"LONG",50.0).is_err());
        assert!(execution_ledger(&events(&[("ENTRY",f64::NAN,1.0,0.0,0.0)]),"LONG",50.0).is_err());
    }
}

#[cfg(test)]
mod gc_persisted_contract_acceptance_tests {
    use super::*;

    fn gc_closed_fixture(unknown_entry_fee:bool)->(Connection,String) {
        let conn=Connection::open_in_memory().unwrap();
        crate::db::migrate(&conn).unwrap();
        let session=create_draft_session(&conn,CreateSessionInput{
            session_date:"2026-11-23".into(),instrument_symbol:"GC".into(),
            environment:"DEMO".into(),session_label:Some("GC isolated cost acceptance".into()),
        }).unwrap();
        conn.execute("INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type,intended_direction)
          VALUES('gc-decision',?1,'2026-11-23T08:00:00Z','TRADE','LONG')",[&session.session_id]).unwrap();
        conn.execute("INSERT INTO trades(trade_id,decision_id,session_id,direction,status)
          VALUES('gc-closed','gc-decision',?1,'LONG','CLOSED')",[&session.session_id]).unwrap();
        let fees=if unknown_entry_fee{"NULL"}else{"1.0"};
        conn.execute_batch(&format!(
          "INSERT INTO execution_fills(execution_id,trade_id,occurred_at,action,side,price,quantity,commission,fees)
           VALUES ('gc-entry','gc-closed','2026-11-23T08:00:01Z','ENTRY','BUY',4100.0,2,4.0,{fees}),
                  ('gc-exit-1','gc-closed','2026-11-23T08:01:00Z','EXIT','SELL',4100.7,1,2.0,1.0),
                  ('gc-exit-2','gc-closed','2026-11-23T08:02:00Z','EXIT','SELL',4099.8,1,2.0,1.0);
           INSERT INTO risk_snapshots(risk_snapshot_id,trade_id,occurred_at,snapshot_type,stop_price,quantity,risk_dollars)
           VALUES('gc-risk','gc-closed','2026-11-23T08:00:01Z','INITIAL',4099.5,2,100.0);"
        )).unwrap();
        (conn,session.session_id)
    }

    #[test]
    fn gc_persisted_partial_exits_have_correct_contract_ticks_net_cost_and_r(){
        let (conn,session_id)=gc_closed_fixture(false);
        let spec=instrument_spec_for_session(&conn,&session_id).unwrap();
        assert_eq!(spec,(0.1,100.0));
        let metrics=trade_metrics(&conn,"gc-closed").unwrap();
        assert_eq!(metrics.status,"CLOSED");
        assert_eq!(metrics.open_quantity,0.0);
        assert_eq!(metrics.total_entry_quantity,2.0);
        assert_eq!(metrics.total_exit_quantity,2.0);
        assert!((metrics.gross_realized_pnl.unwrap()-50.0).abs()<1e-8);
        // Total known commissions: 4+2+2 = 8; fees: 1+1+1 = 3.
        assert!((metrics.net_realized_pnl.unwrap()-39.0).abs()<1e-8);
        assert!((metrics.realized_r.unwrap()-0.39).abs()<1e-8);
        let summary=get_analytics_summary(&conn,JournalFilterInput{
            instrument_symbol:Some("GC".into()),..JournalFilterInput::default()
        }).unwrap();
        assert_eq!(summary.closed_trade_count,1);
        assert_eq!(summary.eligible_net_pnl_count,1);
        assert_eq!(summary.eligible_r_count,1);
        assert!((summary.net_pnl.unwrap()-39.0).abs()<1e-8);
        assert!((summary.net_r.unwrap()-0.39).abs()<1e-8);
        assert_eq!(summary.max_winning_streak,Some(1));
        assert_eq!(summary.max_losing_streak,Some(0));
        assert_eq!(summary.max_realized_r_drawdown,Some(0.0));
        // The C9 clock belongs to the original saved Decision, not to a
        // later Fill or the user's current machine timezone.
        let journal=list_journal_trades(&conn,JournalFilterInput{
            instrument_symbol:Some("GC".into()),..JournalFilterInput::default()
        }).unwrap();
        assert_eq!(journal.len(),1);
        assert_eq!(journal[0].decision_occurred_at.as_deref(),
          Some("2026-11-23T08:00:00Z"));
        assert_eq!(journal[0].session_timezone_id.as_deref(),
          Some("Australia/Sydney"));
        assert_eq!(crate::db::integrity_check(&conn).unwrap(),"ok");
    }

    #[test]
    fn gc_unknown_fee_remains_unknown_in_net_pnl_r_and_chronological_analytics(){
        let (conn,_)=gc_closed_fixture(true);
        let metrics=trade_metrics(&conn,"gc-closed").unwrap();
        assert!((metrics.gross_realized_pnl.unwrap()-50.0).abs()<1e-8);
        assert_eq!(metrics.net_realized_pnl,None);
        assert_eq!(metrics.realized_r,None);
        let summary=get_analytics_summary(&conn,JournalFilterInput::default()).unwrap();
        assert_eq!(summary.closed_trade_count,1);
        assert_eq!(summary.eligible_net_pnl_count,0);
        assert_eq!(summary.eligible_r_count,0);
        assert_eq!(summary.net_pnl,None);
        assert_eq!(summary.net_r,None);
        assert_eq!(summary.max_winning_streak,None);
        assert_eq!(summary.max_losing_streak,None);
        assert_eq!(summary.max_realized_r_drawdown,None);
        let stored_fees:Option<f64>=conn.query_row(
          "SELECT fees FROM execution_fills WHERE execution_id='gc-entry'",[],|r|r.get(0)
        ).unwrap();
        assert_eq!(stored_fees,None,"UNKNOWN fee was not silently stored as zero");
    }

    #[test]
    fn mixed_or_missing_original_currency_never_produces_a_false_money_total(){
        let (conn,_)=gc_closed_fixture(false);
        let initial=get_analytics_summary(&conn,JournalFilterInput::default()).unwrap();
        assert_eq!(initial.pnl_currency_status,"SINGLE_CURRENCY");
        assert_eq!(initial.pnl_currency.as_deref(),Some("USD"));
        assert!((initial.net_pnl.unwrap()-39.0).abs()<1e-8);

        let other=create_draft_session(&conn,CreateSessionInput{
            session_date:"2026-11-24".into(),instrument_symbol:"GC".into(),
            environment:"DEMO".into(),session_label:Some("Isolated synthetic currency test".into()),
        }).unwrap();
        conn.execute(
          "UPDATE sessions SET instrument_currency_snapshot='AUD' WHERE session_id=?1",
          [&other.session_id]
        ).unwrap();
        conn.execute(
          "INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type,intended_direction)
           VALUES('second-decision',?1,'2026-11-24T08:00:00Z','TRADE','LONG')",
          [&other.session_id]
        ).unwrap();
        conn.execute(
          "INSERT INTO trades(trade_id,decision_id,session_id,direction,status)
           VALUES('second-trade','second-decision',?1,'LONG','CLOSED')",
          [&other.session_id]
        ).unwrap();
        conn.execute_batch(
          "INSERT INTO execution_fills(execution_id,trade_id,occurred_at,action,side,price,quantity,commission,fees)
             VALUES('second-entry','second-trade','2026-11-24T08:01:00Z','ENTRY','BUY',4100,1,0,0),
                   ('second-exit','second-trade','2026-11-24T08:02:00Z','EXIT','SELL',4101,1,0,0);
           INSERT INTO risk_snapshots(risk_snapshot_id,trade_id,occurred_at,snapshot_type,risk_dollars)
             VALUES('second-risk','second-trade','2026-11-24T08:01:00Z','INITIAL',100);"
        ).unwrap();
        let mixed=get_analytics_summary(&conn,JournalFilterInput::default()).unwrap();
        assert_eq!(mixed.closed_trade_count,2);
        assert_eq!(mixed.eligible_net_pnl_count,2);
        assert_eq!(mixed.pnl_currency_status,"MIXED_CURRENCIES");
        assert_eq!(mixed.pnl_currency,None);
        assert_eq!(mixed.net_pnl,None);
        assert_eq!(mixed.expectancy_pnl,None);
        assert!(mixed.net_r.is_some(),
          "unitless eligible net R must remain usable when monetary units differ");

        // A legacy NULL snapshot cannot be silently replaced with the mutable
        // current instrument currency even if remaining trades are all USD.
        conn.execute(
          "UPDATE sessions SET instrument_currency_snapshot=NULL WHERE session_id=?1",
          [&other.session_id]
        ).unwrap();
        let unknown=get_analytics_summary(&conn,JournalFilterInput::default()).unwrap();
        assert_eq!(unknown.pnl_currency_status,"UNKNOWN_CURRENCY");
        assert_eq!(unknown.net_pnl,None);
        assert_eq!(unknown.expectancy_pnl,None);
        assert_eq!(crate::db::integrity_check(&conn).unwrap(),"ok");
    }

    #[test]
    fn gc_persisted_invalid_over_exit_fails_without_mutating_immutable_events(){
        let (conn,_)=gc_closed_fixture(false);
        // Import/legacy corruption is modeled by an extra persisted EXIT;
        // original Fill history stays immutable and is never UPDATEd.
        let original_count:i64=conn.query_row(
          "SELECT COUNT(*) FROM execution_fills WHERE trade_id='gc-closed'",[],|r|r.get(0)
        ).unwrap();
        conn.execute("INSERT INTO execution_fills(
          execution_id,trade_id,occurred_at,action,side,price,quantity,commission,fees
        ) VALUES('gc-corrupt-exit','gc-closed','2026-11-23T08:03:00Z','EXIT','SELL',4099.5,3,0,0)",[]).unwrap();
        assert!(trade_metrics(&conn,"gc-closed").is_err(),
          "over-exit in legacy journal must fail closed instead of calculating false R");
        let count:i64=conn.query_row(
          "SELECT COUNT(*) FROM execution_fills WHERE trade_id='gc-closed'",[],|r|r.get(0)
        ).unwrap();
        assert_eq!(count,original_count+1,
          "failed read must neither erase corrupt source events nor change originals");
        let original_exit_qty:f64=conn.query_row(
          "SELECT quantity FROM execution_fills WHERE execution_id='gc-exit-2'",[],|r|r.get(0)
        ).unwrap();
        assert_eq!(original_exit_qty,1.0);
    }
}

#[cfg(test)]
mod execution_sqlite_reconciliation_tests {
    use super::*;

    #[test]
    fn immutable_sqlite_fills_drive_chronological_pnl_and_open_position_risk() {
        let mut db=Connection::open_in_memory().unwrap();
        crate::db::migrate(&db).unwrap();
        let session=create_draft_session(&db,CreateSessionInput{
            session_date:"2026-11-09".into(),instrument_symbol:"ES".into(),
            environment:"DEMO".into(),session_label:None,
        }).unwrap();
        db.execute(
            "INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type,intended_direction) VALUES('decision-test',?1,'2026-11-09T08:00:00Z','TRADE','LONG')",
            [&session.session_id],
        ).unwrap();
        let input=CreateTradeExecutionInput{
            decision_id:"decision-test".into(),entry_price:100.0,stop_price:95.0,
            quantity:2.0,order_type:Some("MARKET".into()),
            planned_target_price:Some(130.0),commission:Some(1.0),fees:Some(0.5),
        };
        let created=create_trade_with_entry(&mut db,input).unwrap();
        let trade_id=created.metrics.trade_id.clone();
        let add=|db:&mut Connection,action:&str,price:f64,qty:f64| {
            add_trade_fill(db,AddTradeFillInput {
                trade_id:trade_id.clone(),action:action.into(),price,quantity:qty,
                order_type:Some("MARKET".into()),commission:Some(1.0),fees:Some(0.5),note:None,
            }).unwrap()
        };
        let first=add(&mut db,"EXIT",110.0,1.0);
        assert_eq!(first.metrics.gross_realized_pnl,Some(500.0));
        assert_eq!(first.metrics.open_quantity,1.0);
        let second=add(&mut db,"ENTRY",120.0,1.0);
        assert_eq!(second.metrics.gross_realized_pnl,Some(500.0));
        assert_eq!(second.metrics.open_quantity,2.0);
        assert_eq!(second.metrics.average_entry,Some(110.0));
        let latest:(f64,f64)=db.query_row(
            "SELECT quantity,risk_dollars FROM risk_snapshots WHERE trade_id=?1 AND snapshot_type='MODIFIED' ORDER BY rowid DESC LIMIT 1",
            [&trade_id],|r|Ok((r.get(0)?,r.get(1)?)),
        ).unwrap();
        assert_eq!(latest,(2.0,1500.0));
        let stop=move_trade_stop(&mut db,MoveStopInput{
            trade_id:trade_id.clone(),stop_price:105.0,reason:Some("Trailing structure".into()),
            was_rule_compliant:Some(true),
        }).unwrap();
        assert_eq!(stop.metrics.latest_stop_price,Some(105.0));
        let updated:(f64,f64)=db.query_row(
            "SELECT quantity,risk_dollars FROM risk_snapshots WHERE trade_id=?1 AND snapshot_type='MODIFIED' ORDER BY rowid DESC LIMIT 1",
            [&trade_id],|r|Ok((r.get(0)?,r.get(1)?)),
        ).unwrap();
        assert_eq!(updated,(2.0,500.0));
        let last=add(&mut db,"EXIT",130.0,1.0);
        assert_eq!(last.metrics.gross_realized_pnl,Some(1500.0));
        assert_eq!(last.metrics.net_realized_pnl,Some(1494.0));
        assert!((last.metrics.realized_r.unwrap()-2.988).abs()<1e-9);
        assert_eq!(last.metrics.open_quantity,1.0);
        assert_eq!(last.fills.len(),4);
        let count:i64=db.query_row("SELECT COUNT(*) FROM execution_fills WHERE trade_id=?1",[&trade_id],|r|r.get(0)).unwrap();
        assert_eq!(count,4);
    }
}

#[cfg(test)]
mod unknown_cost_accounting_integrity_tests {
    use super::*;

    #[test]
    fn persisted_unknown_cost_keeps_gross_but_excludes_net_and_analytics_r() {
        let mut db=Connection::open_in_memory().unwrap();
        crate::db::migrate(&db).unwrap();
        let session=create_draft_session(&db,CreateSessionInput{
            session_date:"2026-11-09".into(),instrument_symbol:"ES".into(),
            environment:"DEMO".into(),session_label:None,
        }).unwrap();
        db.execute(
            "INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type,intended_direction) VALUES('unknown-cost-decision',?1,'2026-11-09T08:00:00Z','TRADE','LONG')",
            [&session.session_id],
        ).unwrap();
        let first=create_trade_with_entry(&mut db,CreateTradeExecutionInput {
            decision_id:"unknown-cost-decision".into(),entry_price:100.0,stop_price:95.0,
            quantity:1.0,order_type:None,planned_target_price:None,
            commission:None,fees:Some(0.0),
        }).unwrap();
        let id=first.metrics.trade_id;
        let closed=add_trade_fill(&mut db,AddTradeFillInput {
            trade_id:id.clone(),action:"EXIT".into(),price:110.0,
            quantity:1.0,order_type:None,commission:Some(1.5),fees:Some(0.25),note:None,
        }).unwrap();
        assert_eq!(closed.metrics.status,"CLOSED");
        assert_eq!(closed.metrics.gross_realized_pnl,Some(500.0));
        assert_eq!(closed.metrics.net_realized_pnl,None);
        assert_eq!(closed.metrics.realized_r,None);
        assert_eq!(closed.fills[0].commission,None);
        assert_eq!(closed.fills[0].fees,Some(0.0));

        let filtered=JournalFilterInput::default();
        let summary=get_analytics_summary(&db,filtered.clone()).unwrap();
        assert_eq!(summary.trade_count,1);
        assert_eq!(summary.eligible_r_count,0);
        assert_eq!(summary.net_r,None);
        assert_eq!(summary.net_pnl,None);
        assert_eq!(summary.win_rate,None);
        let journal=list_journal_trades(&db,filtered).unwrap();
        assert_eq!(journal.len(),1);
        assert_eq!(journal[0].realized_r,None);
        assert_eq!(journal[0].net_realized_pnl,None);
        let persisted_count:i64=db.query_row(
            "SELECT COUNT(*) FROM execution_fills WHERE trade_id=?1",[&id],|row|row.get(0)
        ).unwrap();
        assert_eq!(persisted_count,2);
    }

    #[test]
    fn confirmed_zero_costs_are_eligible_for_net_r() {
        let mut db=Connection::open_in_memory().unwrap();
        crate::db::migrate(&db).unwrap();
        let session=create_draft_session(&db,CreateSessionInput{
            session_date:"2026-11-09".into(),instrument_symbol:"NQ".into(),
            environment:"DEMO".into(),session_label:None,
        }).unwrap();
        db.execute("INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type,intended_direction) VALUES('confirmed-zero',?1,'2026-11-09T08:00:00Z','TRADE','SHORT')",
            [&session.session_id]).unwrap();
        let created=create_trade_with_entry(&mut db,CreateTradeExecutionInput{
            decision_id:"confirmed-zero".into(),entry_price:20000.0,
            stop_price:20001.0,quantity:1.0,order_type:None,
            planned_target_price:None,commission:Some(0.0),fees:Some(0.0),
        }).unwrap();
        let closed=add_trade_fill(&mut db,AddTradeFillInput{
            trade_id:created.metrics.trade_id,action:"EXIT".into(),price:19999.0,
            quantity:1.0,order_type:None,commission:Some(0.0),fees:Some(0.0),note:None
        }).unwrap();
        assert_eq!(closed.metrics.gross_realized_pnl,Some(20.0));
        assert_eq!(closed.metrics.net_realized_pnl,Some(20.0));
        assert_eq!(closed.metrics.realized_r,Some(1.0));
        let summary=get_analytics_summary(&db,JournalFilterInput::default()).unwrap();
        assert_eq!(summary.eligible_r_count,1);
        assert_eq!(summary.net_r,Some(1.0));
        assert_eq!(summary.net_pnl,Some(20.0));
        assert_eq!(summary.max_winning_streak,Some(1));
        assert_eq!(summary.max_losing_streak,Some(0));
        assert_eq!(summary.max_realized_r_drawdown,Some(0.0));
    }
}

#[cfg(test)]
mod analytics_coverage_truth_tests {
    use super::*;
    #[test]
    fn known_profit_bad_decision_without_initial_risk_is_counted_but_not_invented_r(){
        let db=Connection::open_in_memory().unwrap();
        crate::db::migrate(&db).unwrap();
        db.execute_batch("
            INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','Synthetic','now');
            INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value)
                VALUES('i','w','ES',0.25,50);
            INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at)
                VALUES('s','w','i','2026-11-23','DEMO','now','CLOSED','now','now');
            INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type,intended_direction)
                VALUES ('d1','s','2026-11-23T08:00:00Z','TRADE','LONG'),
                       ('d2','s','2026-11-23T09:00:00Z','TRADE','LONG'),
                       ('d3','s','2026-11-23T10:00:00Z','TRADE','LONG');
            INSERT INTO trades(trade_id,decision_id,session_id,direction,status,decision_quality)
                VALUES('t1','d1','s','LONG','CLOSED','A'),
                      ('t2','d2','s','LONG','CLOSED','C'),
                      ('t3','d3','s','LONG','CLOSED','INVALID');
            INSERT INTO execution_fills(execution_id,trade_id,occurred_at,action,side,price,quantity,commission,fees)
                VALUES('f11','t1','2026-11-23T08:01:00Z','ENTRY','BUY',7000,1,1,0),
                      ('f12','t1','2026-11-23T08:02:00Z','EXIT','SELL',7001,1,1,0),
                      ('f21','t2','2026-11-23T09:01:00Z','ENTRY','BUY',7000,1,1,0),
                      ('f22','t2','2026-11-23T09:02:00Z','EXIT','SELL',7001,1,1,0),
                      ('f31','t3','2026-11-23T10:01:00Z','ENTRY','BUY',7000,1,NULL,0),
                      ('f32','t3','2026-11-23T10:02:00Z','EXIT','SELL',7001,1,1,0);
            INSERT INTO risk_snapshots(risk_snapshot_id,trade_id,occurred_at,snapshot_type,risk_dollars)
                VALUES('r1','t1','2026-11-23T08:01:00Z','INITIAL',100);").unwrap();
        // Explicit historical currency snapshot: P&L is in original USD,
        // never inferred from a mutable current instrument registry.
        db.execute("UPDATE sessions SET instrument_currency_snapshot='USD' WHERE session_id='s'",[]).unwrap();
        let summary=get_analytics_summary(&db,JournalFilterInput::default()).unwrap();
        assert_eq!(summary.trade_count,3);
        assert_eq!(summary.closed_trade_count,3);
        assert_eq!(summary.eligible_net_pnl_count,2);
        assert_eq!(summary.eligible_r_count,1);
        assert_eq!(summary.net_pnl,Some(96.0));
        assert_eq!(summary.pnl_currency.as_deref(),Some("USD"));
        assert_eq!(summary.pnl_currency_status,"SINGLE_CURRENCY");
        assert_eq!(summary.net_r,Some(0.48));
        // Two of three CLOSED Trades have unknown initial risk/cost. Their
        // sequence cannot be skipped as if the filtered sample were complete.
        assert_eq!(summary.max_winning_streak,None);
        assert_eq!(summary.max_losing_streak,None);
        assert_eq!(summary.max_realized_r_drawdown,None);
        assert_eq!(summary.bad_decision_win_count,1,
          "C trade with known net profit belongs in process-quality warning even with unknown risk");
        assert!(summary.small_sample);
        assert_eq!(crate::db::integrity_check(&db).unwrap(),"ok");
    }
}

#[cfg(test)]
mod decision_only_analytics_tests {
    use super::*;

    #[test]
    fn counts_nonexecuted_decision_events_without_any_trade_or_fill_table() {
        let db=Connection::open_in_memory().unwrap();
        db.execute_batch("
            CREATE TABLE instruments(instrument_id TEXT PRIMARY KEY,symbol TEXT);
            CREATE TABLE sessions(session_id TEXT PRIMARY KEY,instrument_id TEXT,session_date TEXT,instrument_symbol_snapshot TEXT);
            CREATE TABLE candidate_decisions(decision_id TEXT PRIMARY KEY,session_id TEXT,decision_type TEXT,reason_code TEXT,reason_note TEXT);
            INSERT INTO instruments VALUES('i-es','ES'),('i-gc','GC');
            INSERT INTO sessions VALUES('s1','i-es','2026-11-09','ES'),('s2','i-gc','2026-11-10','GC'),('s3','i-es','2026-11-02','ES');
            INSERT INTO candidate_decisions VALUES
                ('d1','s1','NO_TRADE','MISSING_CONFIRMATION',NULL),
                ('d2','s1','MISSED','', 'Could not execute in time'),
                ('d3','s1','TRADE',NULL,NULL),
                ('d4','s2','MISSED','ENTRY_DELAY',NULL),
                ('d5','s3','MISSED','PRIOR_WEEK',NULL);
        ").unwrap();
        let all=list_decision_only_analytics(&db,JournalFilterInput{
            date_from:Some("2026-11-09".into()),
            date_to:Some("2026-11-15".into()),
            ..JournalFilterInput::default()
        }).unwrap();
        assert_eq!(all.len(),2);
        let es=all.iter().find(|x|x.instrument_symbol=="ES").unwrap();
        assert_eq!((es.no_trade_count,es.missed_count,es.reason_missing_count),(1,1,0));
        let gc=all.iter().find(|x|x.instrument_symbol=="GC").unwrap();
        assert_eq!((gc.no_trade_count,gc.missed_count),(0,1));

        let es_only=list_decision_only_analytics(&db,JournalFilterInput{
            instrument_symbol:Some("ES".into()),..JournalFilterInput::default()
        }).unwrap();
        assert_eq!(es_only.len(),2); // Two separate ES dates, not conflated into one.
        assert_eq!(es_only.iter().map(|x|x.missed_count).sum::<i64>(),2);
    }

    #[test]
    fn groups_original_decision_codes_without_inventing_text_categories() {
        let db=Connection::open_in_memory().unwrap();
        db.execute_batch("
            CREATE TABLE instruments(instrument_id TEXT PRIMARY KEY,symbol TEXT);
            CREATE TABLE sessions(session_id TEXT PRIMARY KEY,instrument_id TEXT,session_date TEXT,instrument_symbol_snapshot TEXT);
            CREATE TABLE candidate_decisions(decision_id TEXT PRIMARY KEY,session_id TEXT,decision_type TEXT,reason_code TEXT,reason_note TEXT);
            INSERT INTO instruments VALUES('i-es','ES'),('i-gc','GC');
            INSERT INTO sessions VALUES('s1','i-es','2026-11-09','ES'),('s2','i-gc','2026-11-09','GC'),('s3','i-es','2026-11-02','ES');
            INSERT INTO candidate_decisions VALUES
                ('d1','s1','NO_TRADE','MISSING_CONFIRMATION',NULL),
                ('d2','s1','NO_TRADE','MISSING_CONFIRMATION',NULL),
                ('d3','s1','MISSED','', 'Discretionary note retained in source only'),
                ('d4','s1','MISSED',NULL,NULL),
                ('d5','s2','MISSED','NO_TIME',NULL),
                ('d6','s1','TRADE','MISSING_CONFIRMATION',NULL),
                ('d7','s3','NO_TRADE','PRIOR_WEEK',NULL);
        ").unwrap();
        let rows=list_decision_reason_analytics(&db,JournalFilterInput{
            date_from:Some("2026-11-09".into()),date_to:Some("2026-11-15".into()),
            instrument_symbol:Some("ES".into()),..JournalFilterInput::default()
        }).unwrap();
        assert_eq!(rows.len(),3);
        assert!(rows.iter().any(|x|x.decision_type=="NO_TRADE"&&x.reason_code=="MISSING_CONFIRMATION"&&x.decision_count==2));
        assert!(rows.iter().any(|x|x.decision_type=="MISSED"&&x.reason_code=="[FREE_TEXT_ONLY]"&&x.decision_count==1));
        assert!(rows.iter().any(|x|x.decision_type=="MISSED"&&x.reason_code=="[NO_REASON]"&&x.decision_count==1));
        assert!(rows.iter().all(|x|x.instrument_symbol=="ES"&&x.session_date=="2026-11-09"));
        assert!(rows.iter().all(|x|!x.reason_code.contains("Discretionary note")));
    }

    #[test]
    fn missing_reason_is_observed_missing_data_not_invented_context() {
        let db=Connection::open_in_memory().unwrap();
        db.execute_batch("
            CREATE TABLE instruments(instrument_id TEXT PRIMARY KEY,symbol TEXT);
            CREATE TABLE sessions(session_id TEXT PRIMARY KEY,instrument_id TEXT,session_date TEXT,instrument_symbol_snapshot TEXT);
            CREATE TABLE candidate_decisions(decision_id TEXT PRIMARY KEY,session_id TEXT,decision_type TEXT,reason_code TEXT,reason_note TEXT);
            INSERT INTO instruments VALUES('i','ES');
            INSERT INTO sessions VALUES('s','i','2026-11-09','ES');
            INSERT INTO candidate_decisions VALUES('d1','s','MISSED',' ',NULL),('d2','s','NO_TRADE',NULL,'No setup');
        ").unwrap();
        let rows=list_decision_only_analytics(&db,JournalFilterInput::default()).unwrap();
        assert_eq!(rows.len(),1);
        assert_eq!((rows[0].no_trade_count,rows[0].missed_count,rows[0].reason_missing_count),(1,1,1));
    }
}

#[cfg(test)]
mod partial_position_cost_disclosure_tests {
    use super::*;

    #[test]
    fn partially_open_ledger_deducts_all_costs_already_incurred_not_prorated_costs() {
        // Two ES contracts entered and one exited. This is the exact semantics
        // disclosed in the UI; do not silently describe it as pro-rata realized net.
        let events = vec![
            ("ENTRY".to_string(), 7400.0, 2.0, 4.0, 1.0),
            ("EXIT".to_string(), 7404.0, 1.0, 2.0, 0.5),
        ];
        let ledger = execution_ledger(&events, "LONG", 50.0).unwrap();
        assert_eq!(ledger.open_qty, 1.0);
        assert_eq!(ledger.exit_qty, 1.0);
        assert_eq!(ledger.gross_realized, Some(200.0));
        assert!((ledger.costs-7.5).abs()<1e-9);
        assert!((ledger.gross_realized.unwrap()-ledger.costs-192.5).abs()<1e-9);
    }

    #[test]
    fn closed_position_ledger_deducts_all_confirmed_costs() {
        let events=vec![
            ("ENTRY".to_string(), 7400.0, 1.0, 2.0, 0.5),
            ("EXIT".to_string(), 7404.0, 1.0, 2.0, 0.5),
        ];
        let ledger=execution_ledger(&events,"LONG",50.0).unwrap();
        assert_eq!(ledger.open_qty,0.0);
        assert_eq!(ledger.gross_realized,Some(200.0));
        assert!((ledger.gross_realized.unwrap()-ledger.costs-195.0).abs()<1e-9);
    }
}

#[cfg(test)]
mod journal_level_provenance_snapshot_tests {
    use super::*;

    #[test]
    fn revision_scoped_sources_do_not_follow_future_zone_edits() {
        let conn=Connection::open_in_memory().unwrap();
        conn.execute_batch("
            CREATE TABLE level_source_types(source_type_id TEXT PRIMARY KEY,label TEXT);
            CREATE TABLE candidate_sources(
                candidate_source_id TEXT PRIMARY KEY,
                candidate_revision_id TEXT NOT NULL,source_type_id TEXT NOT NULL,is_primary INTEGER NOT NULL
            );
            INSERT INTO level_source_types VALUES
                ('prior-high','Prior high'),('later-vwap','VWAP added later');
            INSERT INTO candidate_sources VALUES
                ('original-candidate-source','revision-at-decision','prior-high',1),
                ('later-candidate-source','revision-added-later','later-vwap',1);
        ").unwrap();

        let frozen=trade_level_sources(&conn,&Some("revision-at-decision".to_string())).unwrap();
        assert_eq!(frozen,vec![("prior-high".to_string(),"Prior high".to_string())]);
        assert!(!frozen.iter().any(|(id,_)|id=="later-vwap"));

        let newer=trade_level_sources(&conn,&Some("revision-added-later".to_string())).unwrap();
        assert_eq!(newer[0].0,"later-vwap");
        // Old/imported decisions with missing revision provenance must never
        // acquire newly edited Zone sources just because they share a candidate.
        assert!(trade_level_sources(&conn,&None).unwrap().is_empty());
    }
}

#[cfg(test)]
mod decision_time_evidence_filter_tests {
    use super::*;

    #[test]
    fn evidence_filter_separates_known_at_decision_from_post_decision_and_preserves_legacy_any_time() {
        let conn=Connection::open_in_memory().unwrap();
        conn.execute_batch("
            CREATE TABLE evidence_observations (
                evidence_type_id TEXT, present INTEGER, trade_id TEXT,
                candidate_id TEXT, occurred_at TEXT
            );
            INSERT INTO evidence_observations VALUES
                ('DELTA',1,NULL,'zone-one','2026-11-12T09:59:59+00:00'),
                ('ABSORPTION',1,NULL,'zone-one','2026-11-12T10:00:01+00:00'),
                ('LATE',1,'trade-one',NULL,'2026-11-12T10:01:00+00:00'),
                ('CONTRARY',1,NULL,'zone-one','2026-11-12T11:00:00+11:00'),
                ('BAD_DATE',1,NULL,'zone-one','unknown'),
                ('ABSENT',0,NULL,'zone-one','2026-11-12T09:00:00Z');
        ").unwrap();
        let zone=Some("zone-one".to_string());
        let decision="2026-11-12T10:00:00Z";
        assert!(trade_has_evidence(&conn,"trade-one",&zone,"DELTA",Some(decision),true).unwrap());
        assert!(!trade_has_evidence(&conn,"trade-one",&zone,"ABSORPTION",Some(decision),true).unwrap());
        assert!(trade_has_evidence(&conn,"trade-one",&zone,"ABSORPTION",Some(decision),false).unwrap());
        assert!(!trade_has_evidence(&conn,"trade-one",&zone,"LATE",Some(decision),true).unwrap());
        assert!(trade_has_evidence(&conn,"trade-one",&zone,"LATE",Some(decision),false).unwrap());
        assert!(trade_has_evidence(&conn,"trade-one",&zone,"CONTRARY",Some(decision),true).unwrap());
        assert!(!trade_has_evidence(&conn,"trade-one",&zone,"BAD_DATE",Some(decision),true).unwrap());
        assert!(!trade_has_evidence(&conn,"trade-one",&zone,"ABSENT",Some(decision),false).unwrap());
        assert!(!trade_has_evidence(&conn,"trade-one",&zone,"DELTA",None,true).unwrap());
    }
}

#[cfg(test)]
mod read_only_trade_risk_history_tests {
    use super::*;

    #[test]
    fn returns_original_risk_snapshots_in_timestamp_order_without_modifying_them() {
        let conn=Connection::open_in_memory().unwrap();
        conn.execute_batch("
            CREATE TABLE risk_snapshots(
              risk_snapshot_id TEXT,trade_id TEXT,occurred_at TEXT,snapshot_type TEXT,
              stop_price REAL,quantity REAL,risk_dollars REAL,change_reason TEXT,
              was_rule_compliant INTEGER,provenance TEXT
            );
            INSERT INTO risk_snapshots VALUES
              ('later','trade-a','2026-11-12T10:01:00Z','MODIFIED',7401.0,1.0,50.0,'Trail',1,'NATIVE'),
              ('initial','trade-a','2026-11-12T10:00:00Z','INITIAL',7398.0,2.0,200.0,NULL,NULL,'NATIVE'),
              ('other','trade-b','2026-11-12T10:00:00Z','INITIAL',7000.0,1.0,100.0,NULL,NULL,'NATIVE');
        ").unwrap();
        let items=trade_risk_history(&conn,"trade-a").unwrap();
        assert_eq!(items.len(),2);
        assert_eq!(items[0].risk_snapshot_id,"initial");
        assert_eq!(items[1].risk_snapshot_id,"later");
        assert_eq!(items[0].was_rule_compliant,None);
        assert_eq!(items[1].was_rule_compliant,Some(true));
        assert_eq!(items[1].change_reason.as_deref(),Some("Trail"));
        let persisted:i64=conn.query_row("SELECT COUNT(*) FROM risk_snapshots",[],|r|r.get(0)).unwrap();
        assert_eq!(persisted,3);
    }
}

#[cfg(test)]
mod pending_trade_decision_recovery_tests {
    use super::*;

    #[test]
    fn only_saved_trade_decisions_without_trades_are_returned_even_in_same_zone() {
        let conn=Connection::open_in_memory().unwrap();
        conn.execute_batch("
            CREATE TABLE candidate_decisions (
              decision_id TEXT,candidate_id TEXT,session_id TEXT,occurred_at TEXT,
              decision_type TEXT,intended_direction TEXT,reason_code TEXT,reason_note TEXT,
              decision_quality TEXT,plan_alignment TEXT,plan_mismatch_reason TEXT,
              based_on_plan_revision_id TEXT,based_on_candidate_revision_id TEXT
            );
            CREATE TABLE trades (trade_id TEXT,decision_id TEXT);
            INSERT INTO candidate_decisions VALUES
              ('d-executed','zone-1','session-a','2026-11-12T09:00:00Z','TRADE','LONG',NULL,NULL,NULL,NULL,NULL,NULL,'rev-1'),
              ('d-pending','zone-1','session-a','2026-11-12T09:05:00Z','TRADE','LONG',NULL,NULL,NULL,NULL,NULL,NULL,'rev-1'),
              ('d-pending-2','zone-1','session-a','2026-11-12T09:07:00Z','TRADE','SHORT',NULL,NULL,NULL,NULL,NULL,NULL,'rev-2'),
              ('d-no-trade','zone-1','session-a','2026-11-12T09:08:00Z','NO_TRADE',NULL,'RULE',NULL,NULL,NULL,NULL,NULL,'rev-2'),
              ('d-other-session','zone-1','session-b','2026-11-12T09:09:00Z','TRADE','LONG',NULL,NULL,NULL,NULL,NULL,NULL,'rev-3');
            INSERT INTO trades VALUES ('trade-a','d-executed');
        ").unwrap();
        let result=list_unexecuted_trade_decisions(&conn,"session-a").unwrap();
        assert_eq!(result.len(),2);
        assert_eq!(result[0].decision_id,"d-pending-2");
        assert_eq!(result[1].decision_id,"d-pending");
        assert_eq!(result[0].candidate_id.as_deref(),Some("zone-1"));
        assert_eq!(result[1].based_on_candidate_revision_id.as_deref(),Some("rev-1"));
        assert!(list_unexecuted_trade_decisions(&conn,"unknown-session").unwrap().is_empty());
        // Read-only recovery must not insert an execution.
        let trades:i64=conn.query_row("SELECT COUNT(*) FROM trades",[],|r|r.get(0)).unwrap();
        assert_eq!(trades,1);
    }
}

#[cfg(test)]
mod exact_decision_trade_recovery_tests {
    use super::*;

    #[test]
    fn identifies_only_a_trade_linked_to_the_exact_decision_and_session() {
        let conn=Connection::open_in_memory().unwrap();
        conn.execute_batch("
            CREATE TABLE candidate_decisions(decision_id TEXT,session_id TEXT);
            CREATE TABLE trades(trade_id TEXT,decision_id TEXT,session_id TEXT);
            INSERT INTO candidate_decisions VALUES
              ('executed','session-1'),('not-yet-executed','session-1'),
              ('same-zone-different-decision','session-1'),('other','session-2');
            INSERT INTO trades VALUES
              ('trade-1','executed','session-1'),('trade-2','other','session-2');
        ").unwrap();
        assert_eq!(trade_id_for_decision(&conn,"session-1","executed").unwrap().as_deref(),Some("trade-1"));
        assert!(trade_id_for_decision(&conn,"session-1","not-yet-executed").unwrap().is_none());
        assert!(trade_id_for_decision(&conn,"session-1","same-zone-different-decision").unwrap().is_none());
        assert!(trade_id_for_decision(&conn,"session-1","other").unwrap().is_none());
        assert_eq!(trade_id_for_decision(&conn,"session-2","other").unwrap().as_deref(),Some("trade-2"));
        let unchanged:i64=conn.query_row("SELECT COUNT(*) FROM trades",[],|r|r.get(0)).unwrap();
        assert_eq!(unchanged,2);
    }
}

// Cohesive Package B lifecycle acceptance against isolated migrated SQLite.
#[cfg(test)]
#[path = "package_b_lifecycle_tests.rs"]
mod package_b_lifecycle_tests;

#[cfg(test)]
mod decision_absolute_time_order_tests {
    use super::*;

    #[test]
    fn saved_and_unexecuted_trade_decisions_sort_by_utc_instant_not_iso_text() {
        let db=Connection::open_in_memory().unwrap();
        db.execute_batch("
            CREATE TABLE candidate_decisions(
                decision_id TEXT PRIMARY KEY,candidate_id TEXT,session_id TEXT,
                occurred_at TEXT,decision_type TEXT,intended_direction TEXT,
                reason_code TEXT,reason_note TEXT,decision_quality TEXT,
                plan_alignment TEXT,plan_mismatch_reason TEXT,
                based_on_plan_revision_id TEXT,based_on_candidate_revision_id TEXT
            );
            CREATE TABLE trades(trade_id TEXT PRIMARY KEY,decision_id TEXT);
            INSERT INTO candidate_decisions(decision_id,candidate_id,session_id,occurred_at,decision_type)
            VALUES ('earlier','zone','session','2026-11-22T10:00:00+11:00','TRADE'),
                   ('later','zone','session','2026-11-22T00:30:00+00:00','TRADE'),
                   ('legacy','zone','session','time-unverified','TRADE');
        ").unwrap();
        let saved=list_candidate_decisions(&db,"zone").unwrap();
        assert_eq!(saved.iter().map(|r|r.decision_id.as_str()).collect::<Vec<_>>(),
                   vec!["later","earlier","legacy"]);
        // Do not normalize/overwrite old raw timestamps while sorting.
        assert_eq!(saved[1].occurred_at,"2026-11-22T10:00:00+11:00");
        let unexecuted=list_unexecuted_trade_decisions(&db,"session").unwrap();
        assert_eq!(unexecuted.iter().map(|r|r.decision_id.as_str()).collect::<Vec<_>>(),
                   vec!["later","earlier","legacy"]);
        db.execute("INSERT INTO trades(trade_id,decision_id) VALUES('t','later')",[]).unwrap();
        let remaining=list_unexecuted_trade_decisions(&db,"session").unwrap();
        assert_eq!(remaining.iter().map(|r|r.decision_id.as_str()).collect::<Vec<_>>(),
                   vec!["earlier","legacy"]);
    }
}

#[cfg(test)]
mod observed_evidence_at_decision_tests {
    use super::*;
    #[test]
    fn event_time_and_ownership_exclude_later_unknown_and_other_zone_observations(){
        let conn=Connection::open_in_memory().unwrap();
        conn.execute_batch("
          CREATE TABLE evidence_types(evidence_type_id TEXT PRIMARY KEY,label TEXT NOT NULL);
          CREATE TABLE evidence_observations(
            evidence_id TEXT PRIMARY KEY,evidence_type_id TEXT,trade_id TEXT,candidate_id TEXT,
            occurred_at TEXT,role TEXT,present INTEGER
          );
          INSERT INTO evidence_types VALUES('dom','DOM'),('delta','Delta');
          INSERT INTO evidence_observations VALUES
           ('old','dom',NULL,'zone-a','2026-11-22T20:00:00+11:00','ENTRY_CONFIRMATION',1),
           ('old-duplicate','dom',NULL,'zone-a','2026-11-22T09:10:00Z','ENTRY_CONFIRMATION',1),
           ('after','delta',NULL,'zone-a','2026-11-22T09:30:01Z','SETUP_SUPPORT',1),
           ('unknown','delta',NULL,'zone-a','not-a-time','SETUP_SUPPORT',1),
           ('other','delta',NULL,'zone-b','2026-11-22T08:30:00Z','ENTRY_CONFIRMATION',1),
           ('absent','delta',NULL,'zone-a','2026-11-22T08:10:00Z','ENTRY_CONFIRMATION',0);
        ").unwrap();
        let (seen,post,unknown)=trade_evidence_temporal_snapshot(
           &conn,"trade-a",&Some("zone-a".into()),Some("2026-11-22T09:30:00Z")
        ).unwrap();
        assert_eq!(seen,vec!["ENTRY_CONFIRMATION: DOM"]);
        assert_eq!(post,1);
        assert_eq!(unknown,1);
        let (legacy,post,unknown)=trade_evidence_temporal_snapshot(
            &conn,"trade-a",&Some("zone-a".into()),None
        ).unwrap();
        assert!(legacy.is_empty());
        assert_eq!(post,0);
        assert_eq!(unknown,4);
    }
}
