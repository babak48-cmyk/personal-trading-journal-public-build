import { invoke } from '@tauri-apps/api/core';

export type CustomTypedValue = {event_id:string;value_type:string;text_value:string|null;number_value:number|null;boolean_value:boolean|null;date_value:string|null};
export type CustomTypedInput = {event_id:string;field_id:string;owner_stage:string;owner_id:string;text_value:string|null;number_value:number|null;boolean_value:boolean|null;date_value:string|null};
export type CustomSelection = {event_id:string;options:{option_id:string;label_at_selection:string;ordinal:number}[]};
export type CustomSelectionInput = {event_id:string;field_id:string;owner_stage:string;owner_id:string;option_ids:string[]};
export type CustomFieldDefinitionInput = {field_id:string;stage:string;field_type:string;label:string;help_text:string;required:boolean;display_order:number};
export type CustomFieldOptionInput = {option_id:string;field_id:string;label:string;display_order:number};
export type CustomFieldDefinition = {field_id:string;stage:string;field_type:string;label:string;help_text:string;required:boolean;active:boolean;display_order:number};
export type CustomFieldOption = {option_id:string;label:string;active:boolean;display_order:number};
export type DatabaseHealth = { schema_version: number; integrity: string; database_path: string };
export type BetaSelfTestResult = { passed:boolean; ran_at:string; schema_version:number; steps:string[]; temporary_path:string };
export type RuntimeReadiness = { schema_version:number; integrity:string; foreign_key_violations:number; database_path:string; database_size_bytes:number; data_path:string; attachments_path:string; backups_path:string; exports_path:string; data_writable:boolean; attachments_writable:boolean; backups_writable:boolean; exports_writable:boolean; attachment_file_count:number; backup_count:number; latest_backup_path?:string|null; latest_backup_age_hours?:number|null; warnings:string[]; ready_for_live_data:boolean };
export type SessionSummary = { session_id: string; session_date: string; instrument_symbol: string; instrument_display_name?:string|null; instrument_tick_size:number; instrument_point_value:number; instrument_currency:string; environment: 'REAL'|'DEMO'|'FORWARD_TEST'; status: string; opened_at: string };
export type CreateSessionInput = { session_date: string; instrument_symbol: string; environment: 'REAL'|'DEMO'|'FORWARD_TEST'; session_label?: string|null };
export type Instrument = { instrument_id:string; symbol:string; display_name?:string|null; tick_size:number; point_value:number; currency:string; market_type?:string|null; active:boolean; user_defined:boolean; display_order:number };
export type CreateInstrumentInput = { symbol:string; display_name?:string|null; tick_size:number; point_value:number; currency?:string|null; market_type?:string|null };
export type UpdateInstrumentInput = { instrument_id:string; symbol:string; display_name?:string|null; tick_size:number; point_value:number; currency:string; market_type?:string|null; active:boolean; display_order:number };
export type BackupInfo = { backup_version: number; created_at_utc: string; schema_version: number; database_sha256: string; attachment_count: number };
export type RestoreResult = { restored_from: string; safety_backup: string; integrity: string; restored_at_utc: string };
export type LevelSourceType = { source_type_id: string; code: string; label: string; source_group: string; active:boolean; user_defined:boolean; description?:string|null; display_order:number };
export type CreateLevelSourceInput = { label:string; source_group:string; description?:string|null };
export type UpdateLevelSourceInput = { source_type_id:string; label:string; source_group:string; description?:string|null; active:boolean; display_order:number };
export type EvidenceType = { evidence_type_id:string; code:string; label:string; family:string; research_status:string };
export type EvidenceObservationInput = { session_id:string; candidate_id?:string|null; evidence_type_id:string; role:'LEVEL_SOURCE'|'SETUP_SUPPORT'|'ENTRY_CONFIRMATION'|'CONTRADICTING_EVIDENCE'|'INVALIDATION'|'MANAGEMENT_SIGNAL'|'EXIT_SIGNAL'|'GENERAL_OBSERVATION'; direction?:'BUY'|'SELL'|'NEUTRAL'|null; price?:number|null; numeric_value?:number|null; strength?:number|null; note?:string|null };
export type EvidenceObservation = { evidence_id:string; occurred_at:string; candidate_id?:string|null; evidence_type_id:string; evidence_label:string; role:string; direction?:string|null; price?:number|null; numeric_value?:number|null; strength?:number|null; note?:string|null };
export type CandidateSourceInput = { source_type_id: string; is_primary?: boolean; source_price?: number|null; note?: string|null };
export type CandidateDraftInput = {
  label?: string|null; directional_intent: 'LONG'|'SHORT'|'CONDITIONAL'|'WATCH'|'UNKNOWN';
  trend_relationship?: 'WITH_TREND'|'COUNTERTREND'|'CONTINUATION_AFTER_CORRECTION'|'REVERSAL'|'NA'|'UNCLEAR'|null;
  price_mode: 'SINGLE'|'RANGE'|'UNSPECIFIED'; price_from?: number|null; price_to?: number|null; reference_price?: number|null;
  identified_when: 'BEFORE_TODAY'|'PRE_SESSION'|'DURING_SESSION'|'UNKNOWN'; required_conditions: string[]; invalidation_conditions: string[]; notes?: string|null; sources: CandidateSourceInput[];
};
export type ConfirmInitialPlanInput = {
  session_id: string; initial_bias: 'LONG'|'SHORT'|'NEUTRAL'|'MIXED'|'UNKNOWN'; market_posture?: string|null; main_scenario?: string|null; alternative_scenario?: string|null;
  expected_context: string[]; scenario_invalidation?: string|null; things_not_to_do: string[]; max_daily_risk?: number|null; max_daily_risk_unit?: 'USD'|'PERCENT'|'R'|null; max_trades?: number|null; pre_session_state?:string|null; pre_session_state_intensity?:number|null; candidates: CandidateDraftInput[];
};
export type CurrentCandidate = { candidate_id:string; label?:string|null; directional_intent:string; trend_relationship?:string|null; price_mode:string; price_from?:number|null; price_to?:number|null; reference_price?:number|null; required_conditions:string[]; invalidation_conditions:string[]; notes?:string|null; current_status:string; sources:string[]; source_type_ids:string[] };
export type CurrentPlan = { session_id:string; revision_id:string; revision_number:number; created_at:string; initial_bias:string; market_posture?:string|null; main_scenario?:string|null; alternative_scenario?:string|null; candidates:CurrentCandidate[] };
export type CreatePlanRevisionInput = { session_id:string; initial_bias?:string|null; market_posture?:string|null; main_scenario?:string|null; alternative_scenario?:string|null; why_changed:string; change_type:string; new_evidence_summary?:string|null };
export type ReviseCandidateInput = { candidate_id:string; directional_intent:string; trend_relationship?:string|null; price_mode:string; price_from?:number|null; price_to?:number|null; reference_price?:number|null; required_conditions:string[]; invalidation_conditions:string[]; notes?:string|null; change_type:string; change_reason:string; sources:CandidateSourceInput[] };
export type TimelineEvent = { occurred_at:string; event_type:string; title:string; detail?:string|null; revision_number?:number|null; candidate_id?:string|null };
export type AddLiveCandidateInput = { session_id:string; why_changed:string; new_evidence_summary?:string|null; candidate:CandidateDraftInput };
export type AddLiveCandidateResult = { plan_revision_id:string; candidate_id:string };
export type PlanConsistency = { active_candidate_count:number; cancelled_candidate_count:number; warning_codes:string[] };

export type CandidateDecisionInput = {
  session_id:string; candidate_id?:string|null; decision_type:'TRADE'|'NO_TRADE'|'MISSED'; intended_direction?:'LONG'|'SHORT'|null;
  reason_code?:string|null; reason_note?:string|null; decision_quality?:'A'|'B'|'C'|'INVALID'|'UNCLEAR'|null; decision_quality_note?:string|null; plan_mismatch_reason?:string|null;
};
export type CandidateDecision = { decision_id:string; candidate_id?:string|null; occurred_at:string; decision_type:string; intended_direction?:string|null; reason_code?:string|null; reason_note?:string|null; decision_quality?:string|null; plan_alignment?:string|null; plan_mismatch_reason?:string|null; based_on_plan_revision_id?:string|null; based_on_candidate_revision_id?:string|null };

export type CreateTradeExecutionInput = {
  decision_id:string; entry_price:number; stop_price:number; quantity:number; order_type?:'MARKET'|'LIMIT'|'STOP'|'OTHER'|null;
  planned_target_price?:number|null; commission?:number|null; fees?:number|null;
};
export type AddTradeFillInput = {
  trade_id:string; action:'ENTRY'|'EXIT'; price:number; quantity:number; order_type?:'MARKET'|'LIMIT'|'STOP'|'OTHER'|null;
  commission?:number|null; fees?:number|null; note?:string|null;
};
export type MoveStopInput = { trade_id:string; stop_price:number; reason?:string|null; was_rule_compliant?:boolean|null };
export type TradeMetrics = {
  trade_id:string; session_id:string; candidate_id?:string|null; direction:string; status:string; average_entry?:number|null;
  total_entry_quantity:number; total_exit_quantity:number; open_quantity:number; latest_stop_price?:number|null; initial_risk_dollars?:number|null;
  gross_realized_pnl?:number|null; net_realized_pnl?:number|null; realized_r?:number|null; fill_count:number;
};
export type ExecutionFill = { execution_id:string; occurred_at?:string|null; action:string; side:string; price:number; quantity:number; order_type?:string|null; commission?:number|null; fees?:number|null; note?:string|null };
export type TradeDetail = { metrics:TradeMetrics; fills:ExecutionFill[] };

export type MistakeType = { mistake_type_id:string; code:string; label:string; mistake_group:string };
export type SaveTradeReviewInput = {
  trade_id:string; decision_quality?:'A'|'B'|'C'|'INVALID'|'UNCLEAR'|null;
  execution_quality?:'GOOD'|'ACCEPTABLE'|'NEEDS_IMPROVEMENT'|'UNCLEAR'|null;
  management_quality?:'GOOD'|'ACCEPTABLE'|'NEEDS_IMPROVEMENT'|'UNCLEAR'|null;
  exit_reason_code?:string|null; exit_reason_note?:string|null; emotion_affected?:boolean|null; psychology_state?:string|null;
  psychology_intensity?:number|null; psychology_stage?:'ENTRY'|'MANAGEMENT'|'EXIT'|'MULTIPLE'|null; mistake_type_ids:string[]; note?:string|null; finalize?:boolean|null;
};
export type TradeReview = {
  review_id:string; trade_id:string; status:'DRAFT'|'COMPLETED'; decision_quality?:string|null; execution_quality?:string|null; management_quality?:string|null;
  exit_reason_code?:string|null; exit_reason_note?:string|null; emotion_affected?:boolean|null; psychology_state?:string|null; psychology_intensity?:number|null;
  psychology_stage?:string|null; mistake_type_ids:string[]; note?:string|null; completed_at?:string|null;
};


export type RuleItem = { rule_id:string; rule_version_id:string; code:string; label:string; scope:'TRADE'|'SESSION'|'BOTH'; version_label:string };
export type SaveTradeRuleCheckInput = { trade_id:string; any_violation:boolean; violated_rule_version_ids:string[]; note?:string|null };
export type TradeRuleCheck = { trade_rule_check_id:string; trade_id:string; any_violation:boolean; violated_rule_version_ids:string[]; note?:string|null; checked_at:string };
export type SessionReviewSummary = { session_id:string; trade_count:number; closed_trade_count:number; open_trade_count:number; no_trade_count:number; missed_count:number; net_r?:number|null; rule_violation_count:number; mistake_count:number; good_decision_count:number; weak_decision_count:number };
export type SaveSessionReviewInput = { session_id:string; what_went_well?:string|null; what_went_poorly?:string|null; best_decision?:string|null; biggest_mistake?:string|null; market_learning?:string|null; next_improvement?:string|null; plan_quality?:'GOOD'|'ACCEPTABLE'|'NEEDS_IMPROVEMENT'|'NA'|null; setup_selection?:'GOOD'|'ACCEPTABLE'|'NEEDS_IMPROVEMENT'|'NA'|null; execution?:'GOOD'|'ACCEPTABLE'|'NEEDS_IMPROVEMENT'|'NA'|null; risk_management?:'GOOD'|'ACCEPTABLE'|'NEEDS_IMPROVEMENT'|'NA'|null; discipline?:'GOOD'|'ACCEPTABLE'|'NEEDS_IMPROVEMENT'|'NA'|null; trade_management?:'GOOD'|'ACCEPTABLE'|'NEEDS_IMPROVEMENT'|'NA'|null; overall_assessment?:'GOOD'|'ACCEPTABLE'|'NEEDS_IMPROVEMENT'|'NA'|null; notes?:string|null; finalize?:boolean|null };
export type SessionReview = SaveSessionReviewInput & { review_id:string; status:'DRAFT'|'COMPLETED'; completed_at?:string|null };


export type JournalFilter = { date_from?:string|null; date_to?:string|null; instrument_symbol?:string|null; direction?:string|null; decision_quality?:string|null; rule_status?:'FOLLOWED'|'VIOLATED'|'UNCHECKED'|null; level_source_type_id?:string|null; evidence_type_id?:string|null };
export type JournalTradeRow = { trade_id:string; session_id:string; session_date:string; instrument_symbol:string; direction:string; status:string; candidate_label?:string|null; decision_quality?:string|null; rule_status:string; level_sources:string[]; mistakes:string[]; realized_r?:number|null; net_realized_pnl?:number|null; open_quantity:number };
export type AnalyticsSummary = { trade_count:number; eligible_r_count:number; wins:number; losses:number; breakeven:number; win_rate?:number|null; average_r?:number|null; median_r?:number|null; net_r?:number|null; average_winner_r?:number|null; average_loser_r?:number|null; profit_factor_r?:number|null; expectancy_r?:number|null; net_pnl?:number|null; rule_violation_trades:number; bad_decision_win_count:number; small_sample:boolean };
export type MistakeSummary = { mistake_type_id:string; label:string; count:number };

export type Attachment = { attachment_id:string; owner_type:string; owner_id:string; stage:string; occurred_at?:string|null; original_filename?:string|null; media_type?:string|null; file_size?:number|null; sha256?:string|null; caption?:string|null; created_at:string };
export type ImportAttachmentInput = { owner_type:'SESSION'|'CANDIDATE'|'DECISION'|'TRADE'|'REVIEW'; owner_id:string; stage:'PRE_MARKET'|'PRE_ENTRY'|'ENTRY'|'DURING'|'POST_EXIT'|'FOLLOW_UP'|'ORDER_FLOW'|'OTHER'; source_path:string; caption?:string|null };
export type UpdateAttachmentInput = { attachment_id:string; stage:'PRE_MARKET'|'PRE_ENTRY'|'ENTRY'|'DURING'|'POST_EXIT'|'FOLLOW_UP'|'ORDER_FLOW'|'OTHER'; caption?:string|null };
export type ReplaceAttachmentFileInput = { attachment_id:string; source_path:string };
export type ExportResult = { path:string; row_count:number; created_at:string };

export const localApi = {
  createCustomFieldDefinition: (input:CustomFieldDefinitionInput) => invoke<void>('create_custom_field_definition',{input}),
  editCustomFieldDefinition: (fieldId:string,label:string,helpText:string,required:boolean,active:boolean,order:number) => invoke<void>('edit_custom_field_definition',{fieldId,label,helpText,required,active,order}),
  createCustomFieldOption: (input:CustomFieldOptionInput) => invoke<void>('create_custom_field_option',{input}),
  editCustomFieldOption: (fieldId:string,optionId:string,label:string,active:boolean,order:number) => invoke<void>('edit_custom_field_option',{fieldId,optionId,label,active,order}),
  recordCustomFieldTypedValue: (input:CustomTypedInput) => invoke<void>('record_custom_field_typed_value',{input}),
  currentCustomFieldTypedValue: (ownerStage:string,ownerId:string,fieldId:string) => invoke<CustomTypedValue|null>('current_custom_field_typed_value',{ownerStage,ownerId,fieldId}),
  recordCustomFieldSelection: (input:CustomSelectionInput) => invoke<void>('record_custom_field_selection',{input}),
  currentCustomFieldSelection: (ownerStage:string,ownerId:string,fieldId:string) => invoke<CustomSelection|null>('current_custom_field_selection',{ownerStage,ownerId,fieldId}),
  listCustomFieldDefinitions: () => invoke<CustomFieldDefinition[]>('list_custom_field_definitions'),
  listCustomFieldOptions: (fieldId:string) => invoke<CustomFieldOption[]>('list_custom_field_options',{fieldId}),

  health: () => invoke<DatabaseHealth>('database_health'),
  runtimeReadiness: () => invoke<RuntimeReadiness>('runtime_readiness'),
  getFieldRequirementOverrides: async () => JSON.parse(await invoke<string>('get_field_requirement_overrides')) as Record<string,boolean>,
  saveFieldRequirementOverrides: (overrides:Record<string,boolean>) => invoke<void>('save_field_requirement_overrides',{json:JSON.stringify(overrides)}),
  getFieldVisibilityPreferences: async () => JSON.parse(await invoke<string>('get_field_visibility_preferences')) as Record<string,boolean>,
  saveFieldVisibilityPreferences: (preferences:Record<string,boolean>) => invoke<void>('save_field_visibility_preferences',{json:JSON.stringify(preferences)}),
  getFieldPlacementPreferences: async () => JSON.parse(await invoke<string>('get_field_placement_preferences')) as Record<string,'QUICK_AND_DETAILED'|'DETAILED_ONLY'>,
  saveFieldPlacementPreferences: (preferences:Record<string,'QUICK_AND_DETAILED'|'DETAILED_ONLY'>) => invoke<void>('save_field_placement_preferences',{json:JSON.stringify(preferences)}),
  getFieldOrderPreferences: async () => JSON.parse(await invoke<string>('get_field_order_preferences')) as Record<string,number>,
  saveFieldOrderPreferences: (preferences:Record<string,number>) => invoke<void>('save_field_order_preferences',{json:JSON.stringify(preferences)}),
  getFieldTextPreferences: async () => JSON.parse(await invoke<string>('get_field_text_preferences')) as Record<string,{label?:string;help?:string}>,
  saveFieldTextPreferences: (preferences:Record<string,{label?:string;help?:string}>) => invoke<void>('save_field_text_preferences',{json:JSON.stringify(preferences)}),
  getAppearancePreferences: async () => JSON.parse(await invoke<string>('get_appearance_preferences')) as unknown,
  saveAppearancePreferences: (preferences:unknown) => invoke<void>('save_appearance_preferences',{json:JSON.stringify(preferences)}),
  runBetaSelfTest: () => invoke<BetaSelfTestResult>('run_beta_self_test'),
  createBackup: () => invoke<string>('create_backup'),
  validateBackup: (backupPath:string) => invoke<BackupInfo>('validate_backup',{backupPath}),
  restoreBackupToStaging: (backupPath:string) => invoke<string>('restore_backup_to_staging',{backupPath}),
  replaceLiveFromBackup: (backupPath:string) => invoke<RestoreResult>('replace_live_from_backup',{backupPath}),
  createDraftSession: (input:CreateSessionInput) => invoke<SessionSummary>('create_draft_session',{input}),
  saveInitialPlanDraft: (sessionId:string, data:unknown) => invoke<void>('save_initial_plan_draft',{sessionId,json:JSON.stringify(data)}),
  getInitialPlanDraft: (sessionId:string) => invoke<string|null>('get_initial_plan_draft',{sessionId}),
  updateDraftSession: (input:{session_id:string;session_date:string;instrument_symbol:string;environment:'REAL'|'DEMO'|'FORWARD_TEST'}) => invoke<SessionSummary>('update_draft_session',{input}),
  listSessions: (limit=20) => invoke<SessionSummary[]>('list_sessions',{limit}),
  listInstruments: () => invoke<Instrument[]>('list_instruments'),
  listAllInstruments: () => invoke<Instrument[]>('list_all_instruments'),
  createInstrument: (input:CreateInstrumentInput) => invoke<Instrument>('create_instrument',{input}),
  updateInstrument: (input:UpdateInstrumentInput) => invoke<Instrument>('update_instrument',{input}),
  reorderInstruments: (instrument_ids:string[]) => invoke<Instrument[]>('reorder_instruments',{input:{instrument_ids}}),
  listLevelSources: () => invoke<LevelSourceType[]>('list_level_sources'),
  listAllLevelSources: () => invoke<LevelSourceType[]>('list_all_level_sources'),
  createLevelSource: (input:CreateLevelSourceInput) => invoke<LevelSourceType>('create_level_source',{input}),
  updateLevelSource: (input:UpdateLevelSourceInput) => invoke<LevelSourceType>('update_level_source',{input}),
  reorderLevelSources: (source_type_ids:string[]) => invoke<LevelSourceType[]>('reorder_level_sources',{input:{source_type_ids}}),
  listEvidenceTypes: () => invoke<EvidenceType[]>('list_evidence_types'),
  confirmInitialPlan: (input:ConfirmInitialPlanInput) => invoke<{revision_id:string;candidate_ids:string[];session_status:string}>('confirm_initial_plan',{input}),
  getCurrentPlan: (sessionId:string) => invoke<CurrentPlan>('get_current_plan',{sessionId}),
  createPlanRevision: (input:CreatePlanRevisionInput) => invoke<string>('create_plan_revision',{input}),
  reviseCandidate: (input:ReviseCandidateInput) => invoke<string>('revise_candidate',{input}),
  addCandidateStatus: (candidate_id:string,status:string,reason?:string|null) => invoke<void>('add_candidate_status',{input:{candidate_id,status,reason:reason??null}}),
  listPlanTimeline: (sessionId:string) => invoke<TimelineEvent[]>('list_plan_timeline',{sessionId}),
  addLiveCandidate: (input:AddLiveCandidateInput) => invoke<AddLiveCandidateResult>('add_live_candidate',{input}),
  addEvidenceObservation: (input:EvidenceObservationInput) => invoke<string>('add_evidence_observation',{input}),
  listCandidateEvidence: (candidateId:string) => invoke<EvidenceObservation[]>('list_candidate_evidence',{candidateId}),
  checkPlanConsistency: (sessionId:string) => invoke<PlanConsistency>('check_plan_consistency',{sessionId}),
  createCandidateDecision: (input:CandidateDecisionInput) => invoke<CandidateDecision>('create_candidate_decision',{input}),
  listCandidateDecisions: (candidateId:string) => invoke<CandidateDecision[]>('list_candidate_decisions',{candidateId}),

  createTradeWithEntry: (input:CreateTradeExecutionInput) => invoke<TradeDetail>('create_trade_with_entry',{input}),
  addTradeFill: (input:AddTradeFillInput) => invoke<TradeDetail>('add_trade_fill',{input}),
  moveTradeStop: (input:MoveStopInput) => invoke<TradeDetail>('move_trade_stop',{input}),
  getTradeDetail: (tradeId:string) => invoke<TradeDetail>('get_trade_detail',{tradeId}),
  listSessionTrades: (sessionId:string) => invoke<TradeMetrics[]>('list_session_trades',{sessionId}),
  listMistakeTypes: () => invoke<MistakeType[]>('list_mistake_types'),
  saveTradeReview: (input:SaveTradeReviewInput) => invoke<TradeReview>('save_trade_review',{input}),
  getTradeReview: (tradeId:string) => invoke<TradeReview|null>('get_trade_review',{tradeId}),
  listRules: () => invoke<RuleItem[]>('list_rules'),
  saveTradeRuleCheck: (input:SaveTradeRuleCheckInput) => invoke<TradeRuleCheck>('save_trade_rule_check',{input}),
  getTradeRuleCheck: (tradeId:string) => invoke<TradeRuleCheck|null>('get_trade_rule_check',{tradeId}),
  getSessionReviewSummary: (sessionId:string) => invoke<SessionReviewSummary>('get_session_review_summary',{sessionId}),
  saveSessionReview: (input:SaveSessionReviewInput) => invoke<SessionReview>('save_session_review',{input}),
  getSessionReview: (sessionId:string) => invoke<SessionReview|null>('get_session_review',{sessionId}),
  listJournalTrades: (filter:JournalFilter={}) => invoke<JournalTradeRow[]>('list_journal_trades',{filter}),
  getAnalyticsSummary: (filter:JournalFilter={}) => invoke<AnalyticsSummary>('get_analytics_summary',{filter}),
  listMistakeSummary: (filter:JournalFilter={}) => invoke<MistakeSummary[]>('list_mistake_summary',{filter}),
  importAttachment: (input:ImportAttachmentInput) => invoke<Attachment>('import_attachment',{input}),
  listAttachments: (ownerType:string, ownerId:string) => invoke<Attachment[]>('list_attachments',{ownerType,ownerId}),
  attachmentDataUrl: (attachmentId:string) => invoke<string>('attachment_data_url',{attachmentId}),
  updateAttachment: (input:UpdateAttachmentInput) => invoke<Attachment>('update_attachment',{input}),
  replaceAttachmentFile: (input:ReplaceAttachmentFileInput) => invoke<Attachment>('replace_attachment_file',{input}),
  deleteAttachment: (attachmentId:string) => invoke<void>('delete_attachment',{attachmentId}),
  exportJournalHtml: (filter:JournalFilter={}) => invoke<ExportResult>('export_journal_html',{filter}),
  exportJournalCsv: (filter:JournalFilter={}) => invoke<ExportResult>('export_journal_csv',{filter}),
  openExportFolder: () => invoke<void>('open_export_folder'),
};
