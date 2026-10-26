use serde::Serialize;
use std::path::PathBuf;
use tauri::AppHandle;
use crate::{diagnostics, attachments, backup, db, error::AppError, exports, paths::AppPaths, repository::{self, AddCandidateStatusInput, AddLiveCandidateInput, AddLiveCandidateResult, AddTradeFillInput, CandidateDecisionDto, ConfirmInitialPlanInput, ConfirmPlanResult, CreateCandidateDecisionInput, CreatePlanRevisionInput, CreateSessionInput, UpdateDraftSessionInput, InstrumentDto, CreateInstrumentInput, UpdateInstrumentInput, ReorderInstrumentsInput, CreateTradeExecutionInput, CurrentPlanDto, EvidenceObservationDto, EvidenceObservationInput, EvidenceTypeDto, LevelSourceTypeDto, CreateLevelSourceInput, UpdateLevelSourceInput, ReorderLevelSourcesInput, MoveStopInput, PlanConsistencyDto, ReviseCandidateInput, SessionSummary, TimelineEventDto, TradeDetailDto, TradeMetricsDto, MistakeTypeDto, SaveTradeReviewInput, TradeReviewDto, RuleDto, SaveTradeRuleCheckInput, TradeRuleCheckDto, SessionReviewSummaryDto, SaveSessionReviewInput, SessionReviewDto, JournalFilterInput, JournalTradeRowDto, AnalyticsSummaryDto, MistakeSummaryDto}, restore, runtime};

/// Gate 3 read-only discovery. Never opens or migrates an existing journal for writing.
fn open_custom_fields_readonly(app:&AppHandle)->Result<rusqlite::Connection,AppError>{
    use rusqlite::OpenFlags;
    let paths=AppPaths::from_app(app)?;
    let conn=rusqlite::Connection::open_with_flags(paths.database(),OpenFlags::SQLITE_OPEN_READ_ONLY)?;
    if db::schema_version(&conn)?!=db::CURRENT_SCHEMA_VERSION {
        return Err(AppError::Validation("custom fields require an explicitly validated schema v9; no automatic migration was attempted".into()));
    }
    Ok(conn)
}
#[tauri::command]
pub fn list_custom_field_definitions(app:AppHandle)->Result<Vec<crate::custom_fields::ManagedField>,AppError>{
    let conn=open_custom_fields_readonly(&app)?;
    crate::custom_fields::list_custom_fields(&conn)
}
#[tauri::command]
pub fn list_custom_field_options(app:AppHandle,field_id:String)->Result<Vec<crate::custom_fields::ManagedOption>,AppError>{
    let conn=open_custom_fields_readonly(&app)?;
    crate::custom_fields::list_options(&conn,&field_id)
}

/// Write only an existing validated v9 database; never trigger migrations through this route.
fn open_custom_fields_write(app:&AppHandle)->Result<rusqlite::Connection,AppError>{
    use rusqlite::OpenFlags;
    let paths=AppPaths::from_app(app)?;
    let conn=rusqlite::Connection::open_with_flags(paths.database(),OpenFlags::SQLITE_OPEN_READ_WRITE)?;
    conn.execute_batch("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;")?;
    if db::schema_version(&conn)?!=db::CURRENT_SCHEMA_VERSION {
        return Err(AppError::Validation("Custom-field editing requires schema v9; run only with an approved DEMO database.".into()));
    }
    Ok(conn)
}
#[tauri::command]
pub fn create_custom_field_definition(app:AppHandle,input:crate::custom_fields::CustomFieldDefinitionInput)->Result<(),AppError>{
    let mut conn=open_custom_fields_write(&app)?;
    crate::custom_fields::create_custom_field(&mut conn,&input)
}
#[tauri::command]
pub fn edit_custom_field_definition(app:AppHandle,field_id:String,label:String,help_text:String,required:bool,active:bool,order:i64)->Result<(),AppError>{
    let mut conn=open_custom_fields_write(&app)?;
    crate::custom_fields::edit_custom_field(&mut conn,&field_id,&label,&help_text,required,active,order)
}
#[tauri::command]
pub fn create_custom_field_option(app:AppHandle,input:crate::custom_fields::OptionDefinitionInput)->Result<(),AppError>{
    let mut conn=open_custom_fields_write(&app)?;
    crate::custom_fields::create_option(&mut conn,&input)
}
#[tauri::command]
pub fn edit_custom_field_option(app:AppHandle,field_id:String,option_id:String,label:String,active:bool,order:i64)->Result<(),AppError>{
    let mut conn=open_custom_fields_write(&app)?;
    crate::custom_fields::edit_option(&mut conn,&field_id,&option_id,&label,active,order)
}

#[tauri::command]
pub fn record_custom_field_selection(app:AppHandle,input:crate::custom_fields::RecordSelectInput)->Result<(),AppError>{
    let mut conn=open_custom_fields_write(&app)?;
    crate::custom_fields::record_select(&mut conn,&input)
}
#[tauri::command]
pub fn current_custom_field_selection(app:AppHandle,owner_stage:String,owner_id:String,field_id:String)->Result<Option<crate::custom_fields::CurrentSelection>,AppError>{
    let conn=open_custom_fields_readonly(&app)?;
    crate::custom_fields::read_current_selection(&conn,&owner_stage,&owner_id,&field_id)
}
#[tauri::command]
pub fn record_custom_field_typed_value(app:AppHandle,input:crate::custom_fields::TypedValueInput)->Result<(),AppError>{
    let mut conn=open_custom_fields_write(&app)?;
    crate::custom_fields::record_typed_value(&mut conn,&input)
}
#[tauri::command]
pub fn current_custom_field_typed_value(app:AppHandle,owner_stage:String,owner_id:String,field_id:String)->Result<Option<crate::custom_fields::CurrentTypedValue>,AppError>{
    let conn=open_custom_fields_readonly(&app)?;
    crate::custom_fields::read_current_typed_value(&conn,&owner_stage,&owner_id,&field_id)
}
#[derive(Serialize)]
pub struct DatabaseHealth {
    schema_version: u32,
    integrity: String,
    database_path: String,
}

#[tauri::command]
pub fn database_health(app: AppHandle) -> Result<DatabaseHealth, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    Ok(DatabaseHealth { schema_version: db::schema_version(&conn)?, integrity: db::integrity_check(&conn)?, database_path: paths.database().to_string_lossy().to_string() })
}


#[tauri::command]
pub fn runtime_readiness(app: AppHandle) -> Result<runtime::RuntimeReadiness, AppError> {
    let paths = AppPaths::from_app(&app)?;
    runtime::readiness(&paths)
}

#[tauri::command]
pub fn run_beta_self_test() -> Result<diagnostics::BetaSelfTestResult, AppError> {
    diagnostics::run()
}

#[tauri::command]
pub fn get_field_requirement_overrides(app: AppHandle) -> Result<String, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    Ok(db::setting(&conn, "field_requirement_overrides_v1")?.unwrap_or_else(|| "{}".into()))
}

#[tauri::command]
pub fn get_field_visibility_preferences(app: AppHandle) -> Result<String, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    Ok(db::setting(&conn, "field_visibility_preferences_v1")?.unwrap_or_else(|| "{}".into()))
}

#[tauri::command]
pub fn save_field_visibility_preferences(app: AppHandle, json: String) -> Result<(), AppError> {
    let parsed: serde_json::Value = serde_json::from_str(&json)
        .map_err(|_| AppError::Validation("invalid field visibility settings".into()))?;
    let object = parsed.as_object().ok_or_else(|| AppError::Validation("field visibility settings must be an object".into()))?;
    if object.len() > 200 || object.iter().any(|(k,v)| k.len() > 128 || !v.is_boolean()) {
        return Err(AppError::Validation("field visibility settings must contain at most 200 boolean entries".into()));
    }
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    conn.execute(
        "INSERT INTO app_settings(key,value) VALUES('field_visibility_preferences_v1',?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        [json],
    )?;
    Ok(())
}

#[tauri::command]
pub fn get_field_placement_preferences(app: AppHandle) -> Result<String, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    Ok(db::setting(&conn, "field_placement_preferences_v1")?.unwrap_or_else(|| "{}".into()))
}

#[tauri::command]
pub fn save_field_placement_preferences(app: AppHandle, json: String) -> Result<(), AppError> {
    let parsed: serde_json::Value = serde_json::from_str(&json)
        .map_err(|_| AppError::Validation("invalid field placement settings".into()))?;
    let object = parsed.as_object().ok_or_else(|| AppError::Validation("field placement settings must be an object".into()))?;
    if object.len() > 200 || object.iter().any(|(k,v)| k.len() > 128 || !matches!(v.as_str(), Some("QUICK_AND_DETAILED" | "DETAILED_ONLY"))) {
        return Err(AppError::Validation("field placement settings must contain at most 200 valid field placements".into()));
    }
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    conn.execute(
        "INSERT INTO app_settings(key,value) VALUES('field_placement_preferences_v1',?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        [json],
    )?;
    Ok(())
}

#[tauri::command]
pub fn get_field_order_preferences(app: AppHandle) -> Result<String, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    Ok(db::setting(&conn, "field_order_preferences_v1")?.unwrap_or_else(|| "{}".into()))
}

#[tauri::command]
pub fn save_field_order_preferences(app: AppHandle, json: String) -> Result<(), AppError> {
    let parsed: serde_json::Value = serde_json::from_str(&json)
        .map_err(|_| AppError::Validation("invalid field order settings".into()))?;
    let object = parsed.as_object()
        .ok_or_else(|| AppError::Validation("field order settings must be an object".into()))?;
    if object.len() > 200 || object.iter().any(|(k,v)| k.len() > 128 || v.as_u64().is_none_or(|rank| rank > 199)) {
        return Err(AppError::Validation("field order settings must contain at most 200 valid ranks".into()));
    }
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    conn.execute(
        "INSERT INTO app_settings(key,value) VALUES('field_order_preferences_v1',?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        [json],
    )?;
    Ok(())
}

#[tauri::command]
pub fn get_field_text_preferences(app: AppHandle) -> Result<String, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    Ok(db::setting(&conn, "field_text_preferences_v1")?.unwrap_or_else(|| "{}".into()))
}

#[tauri::command]
pub fn save_field_text_preferences(app: AppHandle, json: String) -> Result<(), AppError> {
    let parsed: serde_json::Value = serde_json::from_str(&json)
        .map_err(|_| AppError::Validation("invalid field text preferences".into()))?;
    let object = parsed.as_object()
        .ok_or_else(|| AppError::Validation("field text preferences must be an object".into()))?;
    if object.len() > 200 || object.iter().any(|(k,v)| {
        k.len() > 128 || v.as_object().is_none_or(|fields| {
            fields.len() > 2 || fields.iter().any(|(name,value)|
                !matches!(name.as_str(), "label" | "help") ||
                value.as_str().is_none_or(|text| text.len() > 240))
        })
    }) {
        return Err(AppError::Validation("field text preferences exceed allowed labels/help limits".into()));
    }
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    conn.execute(
        "INSERT INTO app_settings(key,value) VALUES('field_text_preferences_v1',?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        [json],
    )?;
    Ok(())
}

#[tauri::command]
pub fn save_field_requirement_overrides(app: AppHandle, json: String) -> Result<(), AppError> {
    let parsed: serde_json::Value = serde_json::from_str(&json)
        .map_err(|_| AppError::Validation("invalid field requirement settings".into()))?;
    if !parsed.is_object() {
        return Err(AppError::Validation("field requirement settings must be a JSON object".into()));
    }
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    conn.execute(
        "INSERT INTO app_settings(key,value) VALUES('field_requirement_overrides_v1',?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        [json],
    )?;
    Ok(())
}

#[tauri::command]
pub fn get_appearance_preferences(app: AppHandle) -> Result<String, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    Ok(db::setting(&conn, "appearance_preferences_v1")?.unwrap_or_else(|| "{}".into()))
}

#[tauri::command]
pub fn save_appearance_preferences(app: AppHandle, json: String) -> Result<(), AppError> {
    let parsed: serde_json::Value = serde_json::from_str(&json)
        .map_err(|_| AppError::Validation("invalid appearance settings".into()))?;
    let obj = parsed
        .as_object()
        .ok_or_else(|| AppError::Validation("appearance settings must be a JSON object".into()))?;

    let valid = |key: &str, allowed: &[&str]| -> Result<(), AppError> {
        if let Some(value) = obj.get(key) {
            let value = value
                .as_str()
                .ok_or_else(|| AppError::Validation(format!("appearance setting {key} must be a string")))?;
            if !allowed.contains(&value) {
                return Err(AppError::Validation(format!("invalid appearance setting {key}")));
            }
        }
        Ok(())
    };

    valid("theme", &["SYSTEM", "LIGHT", "DARK"])?;
    valid("fontSize", &["COMPACT", "DEFAULT", "LARGE"])?;
    valid("fontFamily", &["SYSTEM", "SEGOE", "SERIF"])?;
    valid("backgroundTone", &["NEUTRAL", "COOL", "WARM"])?;

    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    conn.execute(
        "INSERT INTO app_settings(key,value) VALUES('appearance_preferences_v1',?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        [json],
    )?;
    Ok(())
}

#[tauri::command]
pub fn create_backup(app: AppHandle) -> Result<String, AppError> {
    let paths = AppPaths::from_app(&app)?;
    Ok(backup::create_backup(&paths)?.to_string_lossy().to_string())
}

#[tauri::command]
pub fn validate_backup(backup_path: String) -> Result<restore::BackupInfo, AppError> { restore::validate_backup(&PathBuf::from(backup_path)) }

#[tauri::command]
pub fn restore_backup_to_staging(app: AppHandle, backup_path: String) -> Result<String, AppError> {
    let paths = AppPaths::from_app(&app)?;
    Ok(restore::restore_to_staging(&paths, &PathBuf::from(backup_path))?.to_string_lossy().to_string())
}

#[tauri::command]
pub fn replace_live_from_backup(app: AppHandle, backup_path: String) -> Result<restore::RestoreResult, AppError> {
    let paths = AppPaths::from_app(&app)?;
    restore::replace_live_from_backup(&paths, &PathBuf::from(backup_path))
}

#[tauri::command]
pub fn create_draft_session(app: AppHandle, input: CreateSessionInput) -> Result<SessionSummary, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::create_draft_session(&conn, input)
}

#[tauri::command]
pub fn update_draft_session(app: AppHandle, input: UpdateDraftSessionInput) -> Result<SessionSummary, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::update_draft_session(&conn, input)
}

#[tauri::command]
pub fn save_initial_plan_draft(app: AppHandle, session_id: String, json: String) -> Result<(), AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::save_initial_plan_draft(&conn, &session_id, &json)
}

#[tauri::command]
pub fn get_initial_plan_draft(app: AppHandle, session_id: String) -> Result<Option<String>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::get_initial_plan_draft(&conn, &session_id)
}

#[tauri::command]
pub fn list_sessions(app: AppHandle, limit: Option<u32>) -> Result<Vec<SessionSummary>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::list_sessions(&conn, limit.unwrap_or(20).min(200))
}

#[tauri::command]
pub fn list_instruments(app: AppHandle) -> Result<Vec<InstrumentDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::list_instruments(&conn)
}

#[tauri::command]
pub fn list_all_instruments(app: AppHandle) -> Result<Vec<InstrumentDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::list_all_instruments(&conn)
}

#[tauri::command]
pub fn create_instrument(app: AppHandle, input: CreateInstrumentInput) -> Result<InstrumentDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::create_instrument(&conn, input)
}

#[tauri::command]
pub fn update_instrument(app: AppHandle, input: UpdateInstrumentInput) -> Result<InstrumentDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::update_instrument(&conn, input)
}

#[tauri::command]
pub fn reorder_instruments(app: AppHandle, input: ReorderInstrumentsInput) -> Result<Vec<InstrumentDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let mut conn = db::open_database(&paths.database())?;
    repository::reorder_instruments(&mut conn, input)
}

#[tauri::command]
pub fn list_level_sources(app: AppHandle) -> Result<Vec<LevelSourceTypeDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::list_level_sources(&conn)
}

#[tauri::command]
pub fn list_all_level_sources(app: AppHandle) -> Result<Vec<LevelSourceTypeDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::list_all_level_sources(&conn)
}

#[tauri::command]
pub fn create_level_source(app: AppHandle, input: CreateLevelSourceInput) -> Result<LevelSourceTypeDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::create_level_source(&conn, input)
}

#[tauri::command]
pub fn update_level_source(app: AppHandle, input: UpdateLevelSourceInput) -> Result<LevelSourceTypeDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::update_level_source(&conn, input)
}

#[tauri::command]
pub fn reorder_level_sources(app: AppHandle, input: ReorderLevelSourcesInput) -> Result<Vec<LevelSourceTypeDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let mut conn = db::open_database(&paths.database())?;
    repository::reorder_level_sources(&mut conn, input)
}

#[tauri::command]
pub fn confirm_initial_plan(app: AppHandle, input: ConfirmInitialPlanInput) -> Result<ConfirmPlanResult, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let mut conn = db::open_database(&paths.database())?;
    repository::confirm_initial_plan(&mut conn, input)
}

#[tauri::command]
pub fn get_current_plan(app: AppHandle, session_id: String) -> Result<CurrentPlanDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::get_current_plan(&conn, &session_id)
}

#[tauri::command]
pub fn create_plan_revision(app: AppHandle, input: CreatePlanRevisionInput) -> Result<String, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let mut conn = db::open_database(&paths.database())?;
    repository::create_plan_revision(&mut conn, input)
}

#[tauri::command]
pub fn revise_candidate(app: AppHandle, input: ReviseCandidateInput) -> Result<String, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let mut conn = db::open_database(&paths.database())?;
    repository::revise_candidate(&mut conn, input)
}

#[tauri::command]
pub fn add_candidate_status(app: AppHandle, input: AddCandidateStatusInput) -> Result<(), AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::add_candidate_status(&conn, input)
}

#[tauri::command]
pub fn list_plan_timeline(app: AppHandle, session_id: String) -> Result<Vec<TimelineEventDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::list_plan_timeline(&conn, &session_id)
}

#[tauri::command]
pub fn list_evidence_types(app: AppHandle) -> Result<Vec<EvidenceTypeDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::list_evidence_types(&conn)
}

#[tauri::command]
pub fn add_live_candidate(app: AppHandle, input: AddLiveCandidateInput) -> Result<AddLiveCandidateResult, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let mut conn = db::open_database(&paths.database())?;
    repository::add_live_candidate(&mut conn, input)
}

#[tauri::command]
pub fn add_evidence_observation(app: AppHandle, input: EvidenceObservationInput) -> Result<String, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::add_evidence_observation(&conn, input)
}

#[tauri::command]
pub fn list_candidate_evidence(app: AppHandle, candidate_id: String) -> Result<Vec<EvidenceObservationDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::list_candidate_evidence(&conn, &candidate_id)
}

#[tauri::command]
pub fn check_plan_consistency(app: AppHandle, session_id: String) -> Result<PlanConsistencyDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::check_plan_consistency(&conn, &session_id)
}


#[tauri::command]
pub fn create_candidate_decision(app: AppHandle, input: CreateCandidateDecisionInput) -> Result<CandidateDecisionDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::create_candidate_decision(&conn, input)
}

#[tauri::command]
pub fn list_candidate_decisions(app: AppHandle, candidate_id: String) -> Result<Vec<CandidateDecisionDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::list_candidate_decisions(&conn, &candidate_id)
}

#[tauri::command]
pub fn create_trade_with_entry(app: AppHandle, input: CreateTradeExecutionInput) -> Result<TradeDetailDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let mut conn = db::open_database(&paths.database())?;
    repository::create_trade_with_entry(&mut conn, input)
}

#[tauri::command]
pub fn add_trade_fill(app: AppHandle, input: AddTradeFillInput) -> Result<TradeDetailDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let mut conn = db::open_database(&paths.database())?;
    repository::add_trade_fill(&mut conn, input)
}

#[tauri::command]
pub fn move_trade_stop(app: AppHandle, input: MoveStopInput) -> Result<TradeDetailDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let mut conn = db::open_database(&paths.database())?;
    repository::move_trade_stop(&mut conn, input)
}

#[tauri::command]
pub fn get_trade_detail(app: AppHandle, trade_id: String) -> Result<TradeDetailDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::get_trade_detail(&conn, &trade_id)
}

#[tauri::command]
pub fn list_session_trades(app: AppHandle, session_id: String) -> Result<Vec<TradeMetricsDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::list_session_trades(&conn, &session_id)
}


#[tauri::command]
pub fn list_mistake_types(app: AppHandle) -> Result<Vec<MistakeTypeDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::list_mistake_types(&conn)
}

#[tauri::command]
pub fn save_trade_review(app: AppHandle, input: SaveTradeReviewInput) -> Result<TradeReviewDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let mut conn = db::open_database(&paths.database())?;
    repository::save_trade_review(&mut conn, input)
}

#[tauri::command]
pub fn get_trade_review(app: AppHandle, trade_id: String) -> Result<Option<TradeReviewDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::get_trade_review(&conn, &trade_id)
}


#[tauri::command]
pub fn list_rules(app: AppHandle) -> Result<Vec<RuleDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::list_rules(&conn)
}

#[tauri::command]
pub fn save_trade_rule_check(app: AppHandle, input: SaveTradeRuleCheckInput) -> Result<TradeRuleCheckDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let mut conn = db::open_database(&paths.database())?;
    repository::save_trade_rule_check(&mut conn, input)
}

#[tauri::command]
pub fn get_trade_rule_check(app: AppHandle, trade_id: String) -> Result<Option<TradeRuleCheckDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::get_trade_rule_check(&conn, &trade_id)
}

#[tauri::command]
pub fn get_session_review_summary(app: AppHandle, session_id: String) -> Result<SessionReviewSummaryDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::get_session_review_summary(&conn, &session_id)
}

#[tauri::command]
pub fn save_session_review(app: AppHandle, input: SaveSessionReviewInput) -> Result<SessionReviewDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let mut conn = db::open_database(&paths.database())?;
    repository::save_session_review(&mut conn, input)
}

#[tauri::command]
pub fn get_session_review(app: AppHandle, session_id: String) -> Result<Option<SessionReviewDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::get_session_review(&conn, &session_id)
}


#[tauri::command]
pub fn list_journal_trades(app: AppHandle, filter: JournalFilterInput) -> Result<Vec<JournalTradeRowDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::list_journal_trades(&conn, filter)
}

#[tauri::command]
pub fn get_analytics_summary(app: AppHandle, filter: JournalFilterInput) -> Result<AnalyticsSummaryDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::get_analytics_summary(&conn, filter)
}

#[tauri::command]
pub fn list_mistake_summary(app: AppHandle, filter: JournalFilterInput) -> Result<Vec<MistakeSummaryDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::list_mistake_summary(&conn, filter)
}


#[tauri::command]
pub fn import_attachment(app: AppHandle, input: attachments::ImportAttachmentInput) -> Result<attachments::AttachmentDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    repository::ensure_default_workspace(&conn)?;
    attachments::import_attachment(&conn, &paths, input)
}

#[tauri::command]
pub fn list_attachments(app: AppHandle, owner_type: String, owner_id: String) -> Result<Vec<attachments::AttachmentDto>, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    attachments::list_attachments(&conn, &owner_type, &owner_id)
}

#[tauri::command]
pub fn attachment_data_url(app: AppHandle, attachment_id: String) -> Result<String, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    attachments::attachment_data_url(&conn, &paths, &attachment_id)
}

#[tauri::command]
pub fn update_attachment(app: AppHandle, input: attachments::UpdateAttachmentInput) -> Result<attachments::AttachmentDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    attachments::update_attachment(&conn, input)
}

#[tauri::command]
pub fn replace_attachment_file(app: AppHandle, input: attachments::ReplaceAttachmentFileInput) -> Result<attachments::AttachmentDto, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    attachments::replace_attachment_file(&conn, &paths, input)
}

#[tauri::command]
pub fn delete_attachment(app: AppHandle, attachment_id: String) -> Result<(), AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    attachments::delete_attachment(&conn, &paths, &attachment_id)
}

#[tauri::command]
pub fn export_journal_html(app: AppHandle, filter: JournalFilterInput) -> Result<exports::ExportResult, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    exports::export_html(&conn, &paths, filter)
}

#[tauri::command]
pub fn export_journal_csv(app: AppHandle, filter: JournalFilterInput) -> Result<exports::ExportResult, AppError> {
    let paths = AppPaths::from_app(&app)?;
    let conn = db::open_database(&paths.database())?;
    exports::export_csv(&conn, &paths, filter)
}

#[tauri::command]
pub fn open_export_folder(app: AppHandle) -> Result<(), AppError> {
    // Only the application-owned export directory may be opened; no caller-supplied path.
    let paths = AppPaths::from_app(&app)?;
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer.exe")
            .arg(&paths.exports)
            .spawn()?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = paths;
        Err(AppError::Validation("Open export folder is supported on Windows only".into()))
    }
}
