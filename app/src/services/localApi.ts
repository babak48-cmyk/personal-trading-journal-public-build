import { invoke } from '@tauri-apps/api/core';

export type CustomTypedValue = {event_id:string;value_type:string;text_value:string|null;number_value:number|null;boolean_value:boolean|null;date_value:string|null};
export type CustomTypedInput = {event_id:string;field_id:string;owner_stage:string;owner_id:string;text_value:string|null;number_value:number|null;boolean_value:boolean|null;date_value:string|null};
export type CustomSelection = {event_id:string;options:{option_id:string;label_at_selection:string;ordinal:number}[]};
export type HistoricalCustomSelection = CustomSelection & {recorded_at:string};
export type CustomSelectionInput = {event_id:string;field_id:string;owner_stage:string;owner_id:string;option_ids:string[]};
export type CustomFieldCleanupPreflight = {field_id:string;label:string;stage:string;option_count:number;event_count:number;snapshot_count:number;eligible_unused_definition:boolean};
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
export type DemoTransferPreview = {
  source_schema_version:number;target_schema_version:number;database_sha256:string;
  sessions:number;trades:number;zones:number;decisions:number;plan_revisions:number;evidence_events:number;risk_snapshots:number;fills:number;reviews:number;correction_events:number;initial_risk_correction_events:number;source_type_correction_events:number;
  attachments:number;original_backup_untouched:boolean;
};

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
export type CurrentCandidate = { setup_version_id?:string|null; candidate_id:string; label?:string|null; directional_intent:string; trend_relationship?:string|null; price_mode:string; price_from?:number|null; price_to?:number|null; reference_price?:number|null; required_conditions:string[]; invalidation_conditions:string[]; notes?:string|null; current_status:string; sources:string[]; source_type_ids:string[] };
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
export type CrossSessionPendingReview = {trade_id:string;direction:string;review_status:'NONE'|'DRAFT';session:SessionSummary};
export type TradeMetrics = {
  trade_id:string; session_id:string; candidate_id?:string|null; direction:string; status:string; average_entry?:number|null;
  total_entry_quantity:number; total_exit_quantity:number; open_quantity:number; latest_stop_price?:number|null; initial_risk_dollars?:number|null;
  gross_realized_pnl?:number|null; net_realized_pnl?:number|null; realized_r?:number|null; fill_count:number;
};
export type ExecutionFill = { execution_id:string; occurred_at?:string|null; action:string; side:string; price:number; quantity:number; order_type?:string|null; commission?:number|null; fees?:number|null; note?:string|null };
export type RiskSnapshot = {
  risk_snapshot_id:string; occurred_at:string; snapshot_type:string;
  stop_price:number|null; quantity:number|null; risk_dollars:number|null;
  change_reason:string|null; was_rule_compliant:boolean|null; provenance:string|null;
};
export type SetupAtDecision = {version_id:string;name:string|null;version_number:number|null};
export type TradeDetail = { metrics:TradeMetrics; fills:ExecutionFill[]; risk_snapshots:RiskSnapshot[]; setup_at_decision:SetupAtDecision|null };
export type HistoricalSourceReadout = {
  candidate_source_id:string; candidate_revision_id:string;
  original_source_type_id:string; original_label:string;
  effective_source_type_id:string; effective_label:string;
  revision:number; corrected:boolean;
};
export type SourceTypeCorrectionRequest = {
  candidate_source_id:string; expected_effective_type_id:string;
  expected_revision:number; replacement_type_id:string; reason:string;
};
export type SourceTypeCorrectionEvent = {
  correction_id:string;candidate_source_id:string;revision:number;
  original_source_type_id:string;previous_source_type_id:string;
  replacement_source_type_id:string;expected_prior_correction_id:string|null;
  reason:string;recorded_at_utc:string;actor:string;
};
export type SourceTypeCorrectionPreview = {
  candidate_source_id:string;candidate_revision_id:string;
  original_source_type_id:string;current_effective_type_id:string;
  replacement_type_id:string;current_label:string;replacement_label:string;
  expected_revision:number;related_decision_count:number;
  related_trade_count:number;reason:string;monetary_result_unchanged:boolean;
  explicit_confirmation_required:boolean;
};
export type InitialRiskCorrectionRequest = {
  risk_snapshot_id:string; expected_effective:number|null; expected_revision:number;
  replacement:number; reason:string;
};
export type InitialRiskCorrectionEvent = {
  correction_id:string; risk_snapshot_id:string; revision:number;
  original_risk_dollars:number|null; previous_risk_dollars:number|null;
  replacement_risk_dollars:number; expected_prior_correction_id:string|null;
  reason:string; recorded_at_utc:string; actor:string;
};
export type InitialRiskCorrectionPreview = {
  risk_snapshot_id:string; trade_id:string; original:number|null;
  current_effective:number|null; replacement:number; expected_revision:number;
  before_net_r:number|null; after_net_r:number|null;
  net_realized_pnl:number|null; gross_realized_pnl:number|null;
  reason:string; explicit_confirmation_required:boolean;
};
export type FillCorrectionField = 'price'|'quantity'|'commission'|'fees';
export type FillCorrectionInput = {
  execution_id:string; field:FillCorrectionField; expected_effective:number|null;
  replacement:number|null; reason:string;
};
export type FillCorrectionImpact = {
  gross_realized_pnl:number|null; net_realized_pnl:number|null;
  realized_r:number|null; open_quantity:number; unknown_cost_fields:number;
};
export type FillCorrectionPreview = {
  execution_id:string; trade_id:string; field:FillCorrectionField;
  original:number|null; current_effective:number|null;
  proposed_effective:number|null; expected_revision:number; reason:string;
  before:FillCorrectionImpact; after:FillCorrectionImpact;
  explicit_confirmation_required:boolean;
};
export type CorrectionHistoryEvent = {
  execution_id:string; correction_id:string; revision:number; field:FillCorrectionField;
  previous:number|null; replacement:number|null; reason:string;
  recorded_at_utc:string; actor:string; expected_prior_correction_id:string|null;
};
export type FillCorrectionReceipt = {
  correction_id:string; execution_id:string; field:FillCorrectionField;
  revision:number; previous:number|null; replacement:number|null;
  recorded_at_utc:string;
};


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


export type JournalFilter = { date_from?:string|null; date_to?:string|null; instrument_symbol?:string|null; direction?:string|null; decision_quality?:string|null; rule_status?:'FOLLOWED'|'VIOLATED'|'UNCHECKED'|null; level_source_type_id?:string|null; evidence_type_id?:string|null; evidence_timing?:'ANY_RECORDED'|'AT_DECISION'|null };
export type JournalTradeRow = { trade_id:string; session_id:string; session_date:string; instrument_symbol:string; direction:string; status:string; candidate_label?:string|null; decision_quality?:string|null; rule_status:string; level_sources:string[]; level_source_snapshot_missing?:boolean; mistakes:string[]; realized_r?:number|null; net_realized_pnl?:number|null; open_quantity:number; audited_correction_count?:number; setup_version_id?:string|null; setup_version_name?:string|null; setup_version_number?:number|null; setup_attribution?:'AT_ENTRY'|'RETROSPECTIVE'|'NOT_RECORDED'; setup_defined_market_context?:string|null; evidence_observed_at_decision?:string[]; evidence_post_decision_count?:number; evidence_unknown_timing_count?:number };
export type DecisionOnlyAnalyticsRow = {session_date:string;instrument_symbol:string;no_trade_count:number;missed_count:number;reason_missing_count:number};
export type DecisionReasonAnalyticsRow = {session_date:string;instrument_symbol:string;decision_type:string;reason_code:string;decision_count:number};
export type AnalyticsSummary = { trade_count:number; eligible_r_count:number; wins:number; losses:number; breakeven:number; win_rate?:number|null; average_r?:number|null; median_r?:number|null; net_r?:number|null; average_winner_r?:number|null; average_loser_r?:number|null; profit_factor_r?:number|null; expectancy_r?:number|null; net_pnl?:number|null; rule_violation_trades:number; bad_decision_win_count:number; small_sample:boolean };
export type MistakeSummary = { mistake_type_id:string; label:string; count:number };
export type WeeklyActionEvent = {
  action_event_id:string;week_start:string;filter_snapshot_json:string;
  action_text:string;event_kind:'COMMITMENT'|'FOLLOW_UP';note:string|null;
  based_on_event_id:string|null;recorded_at_utc:string;actor:string;
};
export type SaveWeeklyActionInput = {
  week_start:string;filter_snapshot_json:string;
  action_text:string;event_kind:'COMMITMENT'|'FOLLOW_UP';
  note:string|null;based_on_event_id:string|null;
};


export type Attachment = { attachment_id:string; owner_type:string; owner_id:string; stage:string; occurred_at?:string|null; original_filename?:string|null; media_type?:string|null; file_size?:number|null; sha256?:string|null; caption?:string|null; created_at:string };
export type ImportAttachmentInput = { owner_type:'SESSION'|'CANDIDATE'|'DECISION'|'TRADE'|'REVIEW'; owner_id:string; stage:'PRE_MARKET'|'PRE_ENTRY'|'ENTRY'|'DURING'|'POST_EXIT'|'FOLLOW_UP'|'ORDER_FLOW'|'OTHER'; source_path:string; caption?:string|null };
export type UpdateAttachmentInput = { attachment_id:string; stage:'PRE_MARKET'|'PRE_ENTRY'|'ENTRY'|'DURING'|'POST_EXIT'|'FOLLOW_UP'|'ORDER_FLOW'|'OTHER'; caption?:string|null };
export type ReplaceAttachmentFileInput = { attachment_id:string; source_path:string };
export type ExportResult = { path:string; row_count:number; created_at:string };
export type SetupEvidencePriority = {
  evidence_label:string; priority_role:'REQUIRED'|'SUPPORTING'|'CONTRADICTORY'|'NOT_RELEVANT';
  explanation:string|null;
};
export type SaveSetupVersionInput = {
  setup_id:string|null;name:string;source_trade_id:string|null;
  market_context:string|null;zone_location:string|null;
  prerequisites:string|null;entry_triggers:string|null;
  supporting_evidence:string|null;contrary_evidence:string|null;
  thesis_invalidation:string|null;notes:string|null;
  evidence_priorities:SetupEvidencePriority[];approve:boolean;
};
export type SetupVersion = Omit<SaveSetupVersionInput,'approve'|'setup_id'> & {
  setup_id:string;version_id:string;version_number:number;is_active:boolean;is_approved:boolean;
  created_at:string;
};
export type SetupPerformance = {
  setup_id:string;version_id:string;setup_name:string;version_number:number;
  trade_count:number;eligible_r_count:number;net_r:number|null;
  win_count:number;unknown_r_count:number;
};
export type NinjaTraderCsvReadiness = {
  file_name:string; detected_delimiter:string; column_count:number;
  headers:string[]; ready_for_import:boolean; rows_imported:number;
  required_next_evidence:string[]; privacy_notice:string;
};


export const localApi = {
  createCustomFieldDefinition: (input:CustomFieldDefinitionInput) => invoke<void>('create_custom_field_definition',{input}),
  editCustomFieldDefinition: (fieldId:string,label:string,helpText:string,required:boolean,active:boolean,order:number) => invoke<void>('edit_custom_field_definition',{fieldId,label,helpText,required,active,order}),
  moveCustomField: (fieldId:string,direction:-1|1) => invoke<void>('move_custom_field',{fieldId,direction}),
  moveCustomFieldOption: (fieldId:string,optionId:string,direction:-1|1) => invoke<void>('move_custom_field_option',{fieldId,optionId,direction}),
  createCustomFieldOption: (input:CustomFieldOptionInput) => invoke<void>('create_custom_field_option',{input}),
  editCustomFieldOption: (fieldId:string,optionId:string,label:string,active:boolean,order:number) => invoke<void>('edit_custom_field_option',{fieldId,optionId,label,active,order}),
  recordCustomFieldTypedValue: (input:CustomTypedInput) => invoke<void>('record_custom_field_typed_value',{input}),
  currentCustomFieldTypedValue: (ownerStage:string,ownerId:string,fieldId:string) => invoke<CustomTypedValue|null>('current_custom_field_typed_value',{ownerStage,ownerId,fieldId}),
  recordCustomFieldSelection: (input:CustomSelectionInput) => invoke<void>('record_custom_field_selection',{input}),
  currentCustomFieldSelection: (ownerStage:string,ownerId:string,fieldId:string) => invoke<CustomSelection|null>('current_custom_field_selection',{ownerStage,ownerId,fieldId}),
  listCustomFieldSelectionHistory: (ownerStage:string,ownerId:string,fieldId:string) => invoke<HistoricalCustomSelection[]>('list_custom_field_selection_history',{ownerStage,ownerId,fieldId}),
  listCustomFieldDefinitions: () => invoke<CustomFieldDefinition[]>('list_custom_field_definitions'),
  customFieldCleanupPreflight: (fieldId:string) => invoke<CustomFieldCleanupPreflight>('custom_field_cleanup_preflight',{fieldId}),
  cleanupUnusedCustomField: (fieldId:string,confirmation:string) => invoke<string>('cleanup_unused_custom_field',{fieldId,confirmation}),
  listCustomFieldOptions: (fieldId:string) => invoke<CustomFieldOption[]>('list_custom_field_options',{fieldId}),

  health: () => invoke<DatabaseHealth>('database_health'),
  runtimeReadiness: () => invoke<RuntimeReadiness>('runtime_readiness'),
  getFieldRequirementOverrides: async () => JSON.parse(await invoke<string>('get_field_requirement_overrides')) as Record<string,boolean>,
  saveFieldRequirementOverrides: (overrides:Record<string,boolean>) => invoke<void>('save_field_requirement_overrides',{json:JSON.stringify(overrides)}),
  getCustomFieldPresentation: async () => JSON.parse(await invoke<string>('get_custom_field_presentation')) as import('../customFieldPresentation').CustomFieldPresentationMap,
  saveCustomFieldPresentation: (preferences:import('../customFieldPresentation').CustomFieldPresentationMap) => invoke<void>('save_custom_field_presentation',{json:JSON.stringify(preferences)}),
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
  getBackupDestination: () => invoke<string|null>('get_backup_destination'),
  setBackupDestination: (destination:string|null) => invoke<void>('set_backup_destination',{destination}),
  createBackup: () => invoke<string>('create_backup'),
  validateBackup: (backupPath:string) => invoke<BackupInfo>('validate_backup',{backupPath}),
  isPackageCDemo: () => invoke<boolean>('is_package_c_demo'),
  previewPackageCDemoImport: (backupPath:string) => invoke<DemoTransferPreview>('preview_package_c_demo_import',{backupPath}),
  importPackageBDemoBackup: (backupPath:string,expectedDatabaseSha256:string) => invoke<RestoreResult>('import_package_b_demo_backup',{backupPath,expectedDatabaseSha256}),
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
  addEvidenceObservationsAtomic: (inputs:EvidenceObservationInput[]) => invoke<string[]>('add_evidence_observations_atomic',{inputs}),
  listCandidateEvidence: (candidateId:string) => invoke<EvidenceObservation[]>('list_candidate_evidence',{candidateId}),
  checkPlanConsistency: (sessionId:string) => invoke<PlanConsistency>('check_plan_consistency',{sessionId}),
  createCandidateDecision: (input:CandidateDecisionInput) => invoke<CandidateDecision>('create_candidate_decision',{input}),
  listCandidateDecisions: (candidateId:string) => invoke<CandidateDecision[]>('list_candidate_decisions',{candidateId}),
  listUnexecutedTradeDecisions: (sessionId:string) => invoke<CandidateDecision[]>('list_unexecuted_trade_decisions',{sessionId}),

  createTradeWithEntry: (input:CreateTradeExecutionInput) => invoke<TradeDetail>('create_trade_with_entry',{input}),
  addTradeFill: (input:AddTradeFillInput) => invoke<TradeDetail>('add_trade_fill',{input}),
  moveTradeStop: (input:MoveStopInput) => invoke<TradeDetail>('move_trade_stop',{input}),
  getTradeDetail: (tradeId:string) => invoke<TradeDetail>('get_trade_detail',{tradeId}),
  inspectNinjaTraderCsvHeaders: (path:string) => invoke<NinjaTraderCsvReadiness>('inspect_ninjatrader_csv_headers',{path}),
  listSetupVersions: () => invoke<SetupVersion[]>('list_setup_versions'),
  assignSetupToZone: (candidateId:string,versionId:string,reason:string) => invoke<string>('assign_setup_to_zone',{candidateId,versionId,reason}),
  saveSetupVersion: (input:SaveSetupVersionInput) => invoke<SetupVersion>('save_setup_version',{input}),
  deactivateSetup: (setupId:string) => invoke<void>('deactivate_setup',{setupId}),
  linkSetupTrade: (tradeId:string,versionId:string,linkNote:string|null) => invoke<void>('link_setup_trade',{tradeId,versionId,linkNote}),
  setupPlaybookPerformance: () => invoke<SetupPerformance[]>('setup_playbook_performance'),
  listTradeCorrectionHistory: (tradeId:string) => invoke<CorrectionHistoryEvent[]>('list_trade_correction_history',{tradeId}),
  listTradeHistoricalSources: (tradeId:string) => invoke<HistoricalSourceReadout[]>('list_trade_historical_sources',{tradeId}),
  previewSourceTypeCorrection: (input:SourceTypeCorrectionRequest) => invoke<SourceTypeCorrectionPreview>('preview_source_type_correction',{input}),
  recordSourceTypeCorrection: (input:SourceTypeCorrectionRequest) => invoke<SourceTypeCorrectionEvent>('record_source_type_correction',{input}),
  listTradeSourceTypeCorrections: (tradeId:string) => invoke<SourceTypeCorrectionEvent[]>('list_trade_source_type_corrections',{tradeId}),
  previewInitialRiskCorrection: (input:InitialRiskCorrectionRequest) => invoke<InitialRiskCorrectionPreview>('preview_initial_risk_correction',{input}),
  recordInitialRiskCorrection: (input:InitialRiskCorrectionRequest) => invoke<InitialRiskCorrectionEvent>('record_initial_risk_correction',{input}),
  listInitialRiskCorrections: (tradeId:string) => invoke<InitialRiskCorrectionEvent[]>('list_initial_risk_corrections',{tradeId}),
  previewFillCorrection: (input:FillCorrectionInput) => invoke<FillCorrectionPreview>('preview_fill_correction',{input}),
  recordFillCorrection: (input:FillCorrectionInput) => invoke<FillCorrectionReceipt>('record_fill_correction',{input}),
  getTradeForDecision: (sessionId:string,decisionId:string) => invoke<TradeDetail|null>('get_trade_for_decision',{sessionId,decisionId}),
  listSessionTrades: (sessionId:string) => invoke<TradeMetrics[]>('list_session_trades',{sessionId}),
  listCrossSessionPendingReviews: () => invoke<CrossSessionPendingReview[]>('list_cross_session_pending_reviews'),
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

  listWeeklyActions: (weekStart:string,filterSnapshotJson:string) => invoke<WeeklyActionEvent[]>('list_weekly_actions',{weekStart,filterSnapshotJson}),
  saveWeeklyAction: (input:SaveWeeklyActionInput) => invoke<WeeklyActionEvent>('save_weekly_action',{input}),
  listDecisionReasonAnalytics: (filter:JournalFilter={}) => invoke<DecisionReasonAnalyticsRow[]>('list_decision_reason_analytics',{filter}),  listDecisionOnlyAnalytics: (filter:JournalFilter={}) => invoke<DecisionOnlyAnalyticsRow[]>('list_decision_only_analytics',{filter}),
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
