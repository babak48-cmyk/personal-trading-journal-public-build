mod attachments;
mod backup;
mod commands;
mod custom_fields;
mod db;
mod diagnostics;
mod error;
mod exports;
mod paths;
mod repository;
mod restore;
mod runtime;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::Manager;

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
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
            if let Err(error) = app.global_shortcut().register(shortcut) {
                eprintln!("QW-1A Ctrl+Alt+J shortcut unavailable: {error}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::database_health,
            commands::list_custom_field_definitions,
            commands::list_custom_field_options,
            commands::create_custom_field_definition,
            commands::edit_custom_field_definition,
            commands::create_custom_field_option,
            commands::edit_custom_field_option,
            commands::record_custom_field_selection,
            commands::current_custom_field_selection,
            commands::record_custom_field_typed_value,
            commands::current_custom_field_typed_value,
            commands::runtime_readiness,
            commands::run_beta_self_test,
            commands::get_field_requirement_overrides,
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
            commands::create_backup,
            commands::validate_backup,
            commands::restore_backup_to_staging,
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
            commands::list_candidate_evidence,
            commands::check_plan_consistency,
            commands::create_candidate_decision,
            commands::list_candidate_decisions,
            commands::create_trade_with_entry,
            commands::add_trade_fill,
            commands::move_trade_stop,
            commands::get_trade_detail,
            commands::list_session_trades,
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
            commands::open_export_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running Personal Trading Journal");
}
