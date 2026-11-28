mod attachments;
mod backup;
mod commands;
mod custom_fields;
mod custom_analytics;
mod custom_presentation;
mod db;
mod diagnostics;
mod error;
mod exports;
mod fill_corrections;
mod initial_risk_corrections;
mod source_type_corrections;
mod source_price_corrections;
mod import_readiness;
mod setup_playbook;
mod paths;
mod repository;
mod restore;
mod weekly_actions;
mod demo_transfer;
mod runtime;

#[derive(Clone, serde::Serialize)]
struct QuickShortcutReport {
    registered: bool,
    error: Option<String>,
    trigger_count: u64,
}

struct QuickShortcutState(std::sync::Mutex<QuickShortcutReport>);

// Keep an OS-owned exclusive lock for the entire app lifetime, scoped to
// the actual local-data root (so isolated DEMO and live roots remain separate).
// The lock file is deliberately never deleted; the OS releases the lock on exit.
struct JournalInstanceLock {
    _file: std::fs::File,
}
impl JournalInstanceLock {
    fn acquire(root: &std::path::Path) -> Result<Self, crate::error::AppError> {
        std::fs::create_dir_all(root)?;
        let file = std::fs::OpenOptions::new().read(true).write(true)
            .create(true).truncate(false).open(root.join("journal-instance.lock"))?;
        file.try_lock().map_err(|err| crate::error::AppError::Validation(format!(
            "Cannot acquire journal data lock; close other instances using this data folder: {err}"
        )))?;
        Ok(Self { _file: file })
    }
}


#[tauri::command]
fn quick_shortcut_report(
    state: tauri::State<'_, QuickShortcutState>,
) -> Result<QuickShortcutReport, String> {
    state
        .0
        .lock()
        .map(|s| s.clone())
        .map_err(|_| "Quick shortcut status unavailable".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::Manager;

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(QuickShortcutState(std::sync::Mutex::new(QuickShortcutReport {
            registered: false,
            error: Some("Registration not yet attempted".to_string()),
            trigger_count: 0,
        })))
        .setup(|app| {
            // Acquire before the webview can issue any journal command.
            let root = app.path().app_local_data_dir()?;
            let instance_lock = JournalInstanceLock::acquire(&root)?;
            app.manage(instance_lock);
            use tauri_plugin_global_shortcut::{
                Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
            };

            // QW-1A: OS-owned shortcut, with no JS permissions or database access.
            let shortcut = Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::ALT),
                Code::KeyJ,
            );

            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |handle, triggered, event| {
                        if triggered != &shortcut || event.state() != ShortcutState::Pressed {
                            return;
                        }
                        if let Ok(mut status) = handle.state::<QuickShortcutState>().0.lock() {
                            status.trigger_count = status.trigger_count.saturating_add(1);
                        }
                        if let Some(window) = handle.get_webview_window("main") {
                            if window.is_focused().unwrap_or(false) {
                                // Minimize, do not destroy React state or hide the taskbar fallback.
                                let _ = window.minimize();
                            } else {
                                let _ = window.unminimize();
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(),
            )?;
            // Registration can fail if NinjaTrader/Windows owns this combination.
            // A failure leaves the ordinary taskbar workflow available.
            let result = app.global_shortcut().register(shortcut);
            let report = match result {
                Ok(()) => QuickShortcutReport {
                    registered: true,
                    error: None,
                    trigger_count: 0,
                },
                Err(error) => {
                    eprintln!("QW-1A Ctrl+Alt+J shortcut unavailable: {error}");
                    QuickShortcutReport {
                        registered: false,
                        error: Some(error.to_string()),
                        trigger_count: 0,
                    }
                }
            };
            if let Ok(mut current) = app.state::<QuickShortcutState>().0.lock() {
                *current = report;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            quick_shortcut_report,
            commands::database_health,
            commands::list_custom_field_definitions,
            commands::custom_field_cleanup_preflight,
            commands::cleanup_unused_custom_field,
            commands::list_custom_field_options,
            commands::create_custom_field_definition,
            commands::move_custom_field,
            commands::move_custom_field_option,
            commands::edit_custom_field_definition,
            commands::create_custom_field_option,
            commands::edit_custom_field_option,
            commands::record_custom_field_selection,
            commands::current_custom_field_selection,
            commands::list_custom_field_selection_history,
            commands::record_custom_field_typed_value,
            commands::current_custom_field_typed_value,
            commands::list_custom_field_typed_history,
            commands::analyze_custom_trade_field,
            commands::analyze_custom_decision_field,
            commands::runtime_readiness,
            commands::run_beta_self_test,
            commands::get_field_requirement_overrides,
            commands::get_custom_field_presentation,
            commands::save_custom_field_presentation,
            commands::get_field_visibility_preferences,
            commands::save_field_visibility_preferences,
            commands::get_field_placement_preferences,
            commands::save_field_placement_preferences,
            commands::get_field_order_preferences,
            commands::save_field_order_preferences,
            commands::get_field_text_preferences,
            commands::save_field_text_preferences,
            commands::save_field_requirement_overrides,
            commands::get_appearance_preferences,
            commands::save_appearance_preferences,
            commands::get_backup_destination,
            commands::set_backup_destination,
            commands::create_backup,
            commands::validate_backup,
            commands::restore_backup_to_staging,
            commands::is_package_c_demo,
            commands::preview_package_c_demo_import,
            commands::import_package_b_demo_backup,
            commands::replace_live_from_backup,
            commands::create_draft_session,
            commands::update_draft_session,
            commands::save_initial_plan_draft,
            commands::get_initial_plan_draft,
            commands::list_sessions,
            commands::list_instruments,
            commands::list_all_instruments,
            commands::create_instrument,
            commands::update_instrument,
            commands::reorder_instruments,
            commands::list_level_sources,
            commands::list_all_level_sources,
            commands::create_level_source,
            commands::update_level_source,
            commands::reorder_level_sources,
            commands::list_evidence_types,
            commands::confirm_initial_plan,
            commands::get_current_plan,
            commands::create_plan_revision,
            commands::revise_candidate,
            commands::add_candidate_status,
            commands::list_plan_timeline,
            commands::add_live_candidate,
            commands::add_evidence_observation,
            commands::add_evidence_observations_atomic,
            commands::list_candidate_evidence,
            commands::check_plan_consistency,
            commands::create_candidate_decision,
            commands::list_candidate_decisions,
            commands::create_trade_with_entry,
            commands::add_trade_fill,
            commands::move_trade_stop,
            commands::get_trade_detail,
            commands::assign_setup_to_zone,
            commands::list_setup_versions,
            commands::save_setup_version,
            commands::deactivate_setup,
            commands::link_setup_trade,
            commands::setup_playbook_performance,
            commands::inspect_ninjatrader_csv_headers,
            commands::list_trade_correction_history,
            commands::preview_fill_correction,
            commands::preview_initial_risk_correction,
            commands::record_initial_risk_correction,
            commands::list_initial_risk_corrections,
            commands::list_trade_historical_sources,
            commands::preview_source_type_correction,
            commands::record_source_type_correction,
            commands::list_trade_source_type_corrections,
            commands::preview_source_price_correction,
            commands::record_source_price_correction,
            commands::list_trade_source_price_corrections,
            commands::record_fill_correction,
            commands::get_trade_for_decision,
            commands::list_unexecuted_trade_decisions,
            commands::list_session_trades,
            commands::list_cross_session_pending_reviews,
            commands::list_mistake_types,
            commands::save_trade_review,
            commands::get_trade_review,
            commands::list_rules,
            commands::save_trade_rule_check,
            commands::get_trade_rule_check,
            commands::get_session_review_summary,
            commands::save_session_review,
            commands::get_session_review,
            commands::list_journal_trades,
            commands::list_decision_only_analytics,
            commands::list_decision_reason_analytics,
            commands::get_analytics_summary,
            commands::list_mistake_summary,
            commands::import_attachment,
            commands::list_attachments,
            commands::attachment_data_url,
            commands::update_attachment,
            commands::replace_attachment_file,
            commands::delete_attachment,
            commands::export_journal_html,
            commands::export_journal_csv,
            commands::export_journal_decisions_csv,
            commands::list_weekly_actions,
            commands::save_weekly_action,
            commands::open_export_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running Personal Trading Journal");
}

#[cfg(test)]
mod journal_instance_lock_tests {
    use super::*;
    #[test]
    fn same_root_is_exclusive_distinct_root_is_independent_and_exit_releases_lock() {
        let root=std::env::temp_dir().join(format!("ptj-instance-{}",uuid::Uuid::new_v4()));
        let first=JournalInstanceLock::acquire(&root.join("live")).unwrap();
        assert!(JournalInstanceLock::acquire(&root.join("live")).is_err());
        let demo=JournalInstanceLock::acquire(&root.join("demo")).unwrap();
        drop(first);
        let reopened=JournalInstanceLock::acquire(&root.join("live")).unwrap();
        drop(reopened);
        drop(demo);
        std::fs::remove_dir_all(root).unwrap();
    }
}
