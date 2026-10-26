use std::{fs, path::PathBuf};
use chrono::Utc;
use serde::Serialize;
use uuid::Uuid;
use crate::{attachments, backup, db, error::AppError, exports, paths::AppPaths, repository, restore};

#[derive(Debug, Serialize)]
pub struct BetaSelfTestResult {
    pub passed: bool,
    pub ran_at: String,
    pub schema_version: u32,
    pub steps: Vec<String>,
    pub temporary_path: String,
}

fn temporary_paths() -> Result<AppPaths, AppError> {
    let root = std::env::temp_dir().join(format!("personal-trading-journal-self-test-{}", Uuid::new_v4()));
    let paths = AppPaths {
        data: root.join("data"),
        attachments: root.join("attachments"),
        backups: root.join("backups"),
        exports: root.join("exports"),
        logs: root.join("logs"),
        root,
    };
    for path in [&paths.root, &paths.data, &paths.attachments, &paths.backups, &paths.exports, &paths.logs] {
        fs::create_dir_all(path)?;
    }
    Ok(paths)
}

fn write_test_png(path: &PathBuf) -> Result<(), AppError> {
    // Valid 1x1 transparent PNG. Used only inside an isolated temporary self-test folder.
    const PNG: &[u8] = &[
        0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,
        0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x06,0x00,0x00,0x00,0x1f,0x15,0xc4,
        0x89,0x00,0x00,0x00,0x0d,0x49,0x44,0x41,0x54,0x08,0xd7,0x63,0xf8,0xcf,0xc0,0xf0,
        0x1f,0x00,0x05,0x00,0x01,0xff,0x89,0x99,0x3d,0x1d,0x00,0x00,0x00,0x00,0x49,0x45,
        0x4e,0x44,0xae,0x42,0x60,0x82
    ];
    fs::write(path, PNG)?;
    Ok(())
}

pub fn run() -> Result<BetaSelfTestResult, AppError> {
    let paths = temporary_paths()?;
    let temp_display = paths.root.to_string_lossy().to_string();
    let result = (|| -> Result<BetaSelfTestResult, AppError> {
        let mut steps = Vec::new();
        let conn = db::open_database(&paths.database())?;
        let schema_version = db::schema_version(&conn)?;
        if schema_version != db::CURRENT_SCHEMA_VERSION {
            return Err(AppError::Validation(format!("self-test schema mismatch: {schema_version}")));
        }
        if db::integrity_check(&conn)? != "ok" {
            return Err(AppError::Validation("self-test SQLite integrity check failed".into()));
        }
        if db::foreign_key_violation_count(&conn)? != 0 {
            return Err(AppError::Validation("self-test foreign-key check failed".into()));
        }
        steps.push("Fresh SQLite database + migrations + integrity: PASS".into());

        let session = repository::create_draft_session(&conn, repository::CreateSessionInput {
            session_date: Utc::now().date_naive().to_string(),
            instrument_symbol: "ES".into(),
            environment: "DEMO".into(),
            session_label: Some("BETA_SELF_TEST".into()),
        })?;
        let sessions = repository::list_sessions(&conn, 10)?;
        if !sessions.iter().any(|s| s.session_id == session.session_id) {
            return Err(AppError::Validation("self-test session write/read failed".into()));
        }
        steps.push("Repository write/read persistence: PASS".into());
        // Exercise the real Plan/Zone persistence path on isolated DEMO data.
        let plan_input: repository::ConfirmInitialPlanInput = serde_json::from_value(serde_json::json!({
            "session_id": session.session_id,
            "initial_bias": "NEUTRAL",
            "market_posture": null,
            "main_scenario": "Self-test plan (not user data)",
            "alternative_scenario": null,
            "expected_context": [],
            "scenario_invalidation": null,
            "things_not_to_do": [],
            "max_daily_risk": null,
            "max_daily_risk_unit": null,
            "max_trades": 3,
            "pre_session_state": null,
            "pre_session_state_intensity": null,
            "candidates": [{
                "label": "Self-test zone",
                "directional_intent": "WATCH",
                "trend_relationship": null,
                "price_mode": "UNSPECIFIED",
                "price_from": null,
                "price_to": null,
                "reference_price": null,
                "identified_when": "PRE_SESSION",
                "required_conditions": [],
                "invalidation_conditions": [],
                "notes": null,
                "sources": []
            }]
        }))?;
        let mut conn = conn;
        let confirmed = repository::confirm_initial_plan(&mut conn, plan_input)?;
        let restored_plan = repository::get_current_plan(&conn, &session.session_id)?;
        if confirmed.candidate_ids.len() != 1 || restored_plan.candidates.len() != 1
            || restored_plan.revision_id != confirmed.revision_id {
            return Err(AppError::Validation("self-test plan/zone persistence mismatch".into()));
        }
        steps.push("Confirm Plan + Zone + current-plan retrieval: PASS".into());
        // A NO_TRADE decision is independent of trade execution and must retain
        // its confirmed-plan provenance in an isolated DEMO database.
        let decision = repository::create_candidate_decision(&conn, repository::CreateCandidateDecisionInput {
            session_id: session.session_id.clone(),
            candidate_id: Some(confirmed.candidate_ids[0].clone()),
            decision_type: "NO_TRADE".into(),
            intended_direction: None,
            reason_code: None,
            reason_note: Some("Conditions not confirmed in self-test".into()),
            decision_quality: None,
            decision_quality_note: None,
            plan_mismatch_reason: None,
        })?;
        let saved_decisions = repository::list_candidate_decisions(&conn, &confirmed.candidate_ids[0])?;
        if saved_decisions.len() != 1
            || saved_decisions[0].decision_id != decision.decision_id
            || saved_decisions[0].based_on_plan_revision_id.as_deref() != Some(confirmed.revision_id.as_str()) {
            return Err(AppError::Validation("self-test decision/history provenance mismatch".into()));
        }
        steps.push("NO_TRADE decision + persisted plan provenance: PASS".into());
        // Evidence is a timestamped observation, separate from the initial plan.
        let evidence_types = repository::list_evidence_types(&conn)?;
        let evidence_type = evidence_types.first().ok_or_else(|| AppError::Validation("self-test missing evidence type".into()))?;
        let evidence_id = repository::add_evidence_observation(&conn, repository::EvidenceObservationInput {
            session_id: session.session_id.clone(),
            candidate_id: Some(confirmed.candidate_ids[0].clone()),
            evidence_type_id: evidence_type.evidence_type_id.clone(),
            role: "GENERAL_OBSERVATION".into(),
            direction: None,
            price: None,
            numeric_value: None,
            strength: None,
            note: Some("Isolated self-test observation".into()),
        })?;
        let evidence_history = repository::list_candidate_evidence(&conn, &confirmed.candidate_ids[0])?;
        if evidence_history.len() != 1 || evidence_history[0].evidence_id != evidence_id {
            return Err(AppError::Validation("self-test evidence persistence mismatch".into()));
        }
        steps.push("Observed Evidence + candidate history: PASS".into());

        let missed = repository::create_candidate_decision(&conn, repository::CreateCandidateDecisionInput {
            session_id: session.session_id.clone(),
            candidate_id: Some(confirmed.candidate_ids[0].clone()),
            decision_type: "MISSED".into(),
            intended_direction: None,
            reason_code: None,
            reason_note: Some("Missed candidate in isolated self-test".into()),
            decision_quality: None,
            decision_quality_note: None,
            plan_mismatch_reason: None,
        })?;
        let trade_intent = repository::create_candidate_decision(&conn, repository::CreateCandidateDecisionInput {
            session_id: session.session_id.clone(),
            candidate_id: Some(confirmed.candidate_ids[0].clone()),
            decision_type: "TRADE".into(),
            intended_direction: Some("LONG".into()),
            reason_code: None,
            reason_note: None,
            decision_quality: None,
            decision_quality_note: None,
            plan_mismatch_reason: None,
        })?;
        let decision_history = repository::list_candidate_decisions(&conn, &confirmed.candidate_ids[0])?;
        if decision_history.len() != 3
            || !decision_history.iter().any(|d| d.decision_id == missed.decision_id)
            || !decision_history.iter().any(|d| d.decision_id == trade_intent.decision_id)
            || decision_history.iter().any(|d| d.based_on_plan_revision_id.as_deref() != Some(confirmed.revision_id.as_str())) {
            return Err(AppError::Validation("self-test trade/missed decision history mismatch".into()));
        }
        steps.push("MISSED + TRADE decisions and original-plan links: PASS".into());

        // Exercise actual trade execution and partial exits, with independently
        // hand-checked ES contract P&L and initial-risk R.
        let entry = repository::create_trade_with_entry(&mut conn, repository::CreateTradeExecutionInput {
            decision_id: trade_intent.decision_id.clone(),
            entry_price: 5000.0,
            stop_price: 4999.0,
            quantity: 2.0,
            order_type: Some("MARKET".into()),
            planned_target_price: Some(5002.0),
            commission: Some(2.0),
            fees: Some(0.0),
        })?;
        let trade_id = entry.metrics.trade_id.clone();
        if entry.metrics.status != "OPEN" || entry.fills.len() != 1
            || (entry.metrics.initial_risk_dollars.unwrap_or_default() - 100.0).abs() > 1e-6 {
            return Err(AppError::Validation("self-test initial execution or ES risk mismatch".into()));
        }
        let partial = repository::add_trade_fill(&mut conn, repository::AddTradeFillInput {
            trade_id: trade_id.clone(),
            action: "EXIT".into(),
            price: 5001.0,
            quantity: 1.0,
            order_type: Some("MARKET".into()),
            commission: Some(1.0),
            fees: Some(0.0),
            note: Some("Partial exit in DEMO".into()),
        })?;
        if partial.metrics.status == "CLOSED" || (partial.metrics.open_quantity - 1.0).abs() > 1e-6 {
            return Err(AppError::Validation("self-test partial exit state mismatch".into()));
        }
        let closed = repository::add_trade_fill(&mut conn, repository::AddTradeFillInput {
            trade_id: trade_id.clone(),
            action: "EXIT".into(),
            price: 5002.0,
            quantity: 1.0,
            order_type: Some("MARKET".into()),
            commission: Some(1.0),
            fees: Some(0.0),
            note: Some("Final DEMO exit".into()),
        })?;
        // ES point value $50: (1 + 2) * $50 = $150 gross,
        // minus $4 commissions = $146 net, divided by $100 initial risk = 1.46R.
        let metrics = &closed.metrics;
        if metrics.status != "CLOSED" || closed.fills.len() != 3
            || metrics.open_quantity.abs() > 1e-6
            || (metrics.gross_realized_pnl.unwrap_or_default() - 150.0).abs() > 1e-6
            || (metrics.net_realized_pnl.unwrap_or_default() - 146.0).abs() > 1e-6
            || (metrics.realized_r.unwrap_or_default() - 1.46).abs() > 1e-6 {
            return Err(AppError::Validation("self-test execution, costs or realized-R mismatch".into()));
        }
        let review = repository::save_trade_review(&mut conn, repository::SaveTradeReviewInput {
            trade_id: trade_id.clone(),
            decision_quality: Some("A".into()),
            execution_quality: Some("GOOD".into()),
            management_quality: Some("ACCEPTABLE".into()),
            exit_reason_code: None,
            exit_reason_note: None,
            emotion_affected: Some(false),
            psychology_state: None,
            psychology_intensity: None,
            psychology_stage: None,
            mistake_type_ids: vec![],
            note: Some("DEMO quality remains independent of positive P&L".into()),
            finalize: Some(true),
        })?;
        let persisted = repository::get_trade_review(&conn, &trade_id)?;
        if review.status != "COMPLETED"
            || persisted.as_ref().map(|r| r.review_id.as_str()) != Some(review.review_id.as_str())
            || persisted.as_ref().and_then(|r| r.decision_quality.as_deref()) != Some("A") {
            return Err(AppError::Validation("self-test completed review persistence mismatch".into()));
        }
        if repository::save_trade_review(&mut conn, repository::SaveTradeReviewInput {
            trade_id, decision_quality: Some("B".into()), execution_quality: None,
            management_quality: None, exit_reason_code: None, exit_reason_note: None,
            emotion_affected: Some(false), psychology_state: None,
            psychology_intensity: None, psychology_stage: None,
            mistake_type_ids: vec![], note: None, finalize: Some(true),
        }).is_ok() {
            return Err(AppError::Validation("self-test completed review was mutable".into()));
        }
        steps.push("ES actual entry + partial exits + cost-aware R + immutable completed review: PASS".into());





        let source_png = paths.root.join("self_test.png");
        write_test_png(&source_png)?;
        let attachment = attachments::import_attachment(&conn, &paths, attachments::ImportAttachmentInput {
            owner_type: "SESSION".into(), owner_id: session.session_id.clone(), stage: "PRE_MARKET".into(),
            source_path: source_png.to_string_lossy().to_string(), caption: Some("Automatic beta self-test".into()),
        })?;
        let data_url = attachments::attachment_data_url(&conn, &paths, &attachment.attachment_id)?;
        if !data_url.starts_with("data:image/png;base64,") {
            return Err(AppError::Validation("self-test attachment preview failed".into()));
        }
        steps.push("Attachment copy + hash + preview read: PASS".into());

        let html = exports::export_html(&conn, &paths, repository::JournalFilterInput::default())?;
        let csv = exports::export_csv(&conn, &paths, repository::JournalFilterInput::default())?;
        if !PathBuf::from(&html.path).is_file() || !PathBuf::from(&csv.path).is_file() {
            return Err(AppError::Validation("self-test export creation failed".into()));
        }
        steps.push("Readable HTML + CSV export creation: PASS".into());
        drop(conn);

        let backup_path = backup::create_backup(&paths)?;
        let info = restore::validate_backup(&backup_path)?;
        if info.schema_version != schema_version || info.attachment_count < 1 {
            return Err(AppError::Validation("self-test backup manifest validation failed".into()));
        }
        let staging = restore::restore_to_staging(&paths, &backup_path)?;
        let restored_db = staging.join("database.sqlite");
        let restored = db::open_database(&restored_db)?;
        if db::integrity_check(&restored)? != "ok" || db::foreign_key_violation_count(&restored)? != 0 {
            return Err(AppError::Validation("self-test restored database integrity failed".into()));
        }
        steps.push("Backup validate + staging restore + restored integrity: PASS".into());

        // Integrity checks alone cannot prove that journal history survived restore.
        let restored_plan = repository::get_current_plan(&restored, &session.session_id)?;
        let restored_decisions = repository::list_candidate_decisions(&restored, &confirmed.candidate_ids[0])?;
        let restored_evidence = repository::list_candidate_evidence(&restored, &confirmed.candidate_ids[0])?;
        let restored_trade = repository::get_trade_detail(&restored, &entry.metrics.trade_id)?;
        let restored_review = repository::get_trade_review(&restored, &entry.metrics.trade_id)?;
        if restored_plan.revision_id != confirmed.revision_id
            || restored_decisions.len() != 3
            || restored_evidence.len() != 1
            || restored_evidence[0].evidence_id != evidence_id
            || restored_trade.metrics.status != "CLOSED"
            || restored_trade.fills.len() != 3
            || (restored_trade.metrics.net_realized_pnl.unwrap_or_default() - 146.0).abs() > 1e-6
            || (restored_trade.metrics.realized_r.unwrap_or_default() - 1.46).abs() > 1e-6
            || restored_review.as_ref().map(|r| r.review_id.as_str()) != Some(review.review_id.as_str())
            || restored_review.as_ref().map(|r| r.status.as_str()) != Some("COMPLETED") {
            return Err(AppError::Validation("self-test restored journal lifecycle content mismatch".into()));
        }
        steps.push("Staged restore: plan, decisions, evidence, executions, R and completed review: PASS".into());

        drop(restored);

        Ok(BetaSelfTestResult {
            passed: true,
            ran_at: Utc::now().to_rfc3339(),
            schema_version,
            steps,
            temporary_path: temp_display.clone(),
        })
    })();

    // Self-test never writes to the live journal. Best-effort cleanup only.
    let _ = fs::remove_dir_all(&paths.root);
    result
}

#[cfg(test)]
mod tests {
    #[test]
    fn beta_diagnostic_runs_in_temporary_storage() {
        let result = super::run().unwrap();
        assert!(result.passed);
    }
}
