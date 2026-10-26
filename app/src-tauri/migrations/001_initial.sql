PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspaces (
  workspace_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS instruments (
  instrument_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  symbol TEXT NOT NULL,
  display_name TEXT,
  tick_size REAL NOT NULL CHECK(tick_size > 0),
  point_value REAL NOT NULL CHECK(point_value > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  UNIQUE(workspace_id, symbol)
);

CREATE TABLE IF NOT EXISTS strategies (
  strategy_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  name TEXT NOT NULL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);

CREATE TABLE IF NOT EXISTS strategy_versions (
  strategy_version_id TEXT PRIMARY KEY,
  strategy_id TEXT NOT NULL REFERENCES strategies(strategy_id),
  version_label TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('DRAFT','TESTING','ACTIVE','RETIRED')),
  effective_from TEXT,
  effective_to TEXT,
  notes TEXT,
  UNIQUE(strategy_id, version_label)
);

CREATE TABLE IF NOT EXISTS settings_profiles (
  settings_profile_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);

CREATE TABLE IF NOT EXISTS settings_profile_versions (
  settings_profile_version_id TEXT PRIMARY KEY,
  settings_profile_id TEXT NOT NULL REFERENCES settings_profiles(settings_profile_id),
  version_label TEXT NOT NULL,
  payload_json TEXT,
  effective_from TEXT,
  effective_to TEXT,
  UNIQUE(settings_profile_id, version_label)
);

CREATE TABLE IF NOT EXISTS setups (
  setup_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  name TEXT NOT NULL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  user_defined INTEGER NOT NULL DEFAULT 1 CHECK(user_defined IN (0,1)),
  UNIQUE(workspace_id, name)
);

CREATE TABLE IF NOT EXISTS setup_versions (
  setup_version_id TEXT PRIMARY KEY,
  setup_id TEXT NOT NULL REFERENCES setups(setup_id),
  version_label TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('DRAFT','TESTING','ACTIVE','RETIRED')),
  effective_from TEXT,
  effective_to TEXT,
  location_requirements_json TEXT,
  context_requirements_json TEXT,
  trigger_definition TEXT,
  confirmation_requirements_json TEXT,
  invalidation_definition TEXT,
  entry_logic TEXT,
  management_logic TEXT,
  notes TEXT,
  UNIQUE(setup_id, version_label)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  instrument_id TEXT NOT NULL REFERENCES instruments(instrument_id),
  strategy_version_id TEXT REFERENCES strategy_versions(strategy_version_id),
  settings_profile_version_id TEXT REFERENCES settings_profile_versions(settings_profile_version_id),
  session_date TEXT NOT NULL,
  environment TEXT NOT NULL CHECK(environment IN ('REAL','DEMO','FORWARD_TEST')),
  session_label TEXT,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('DRAFT','PLANNING','ACTIVE','CLOSED','ARCHIVED')),
  max_daily_risk REAL,
  max_daily_risk_unit TEXT CHECK(max_daily_risk_unit IN ('USD','PERCENT','R') OR max_daily_risk_unit IS NULL),
  max_trades INTEGER CHECK(max_trades IS NULL OR max_trades > 0),
  planned_start_time TEXT,
  planned_end_time TEXT,
  timezone_id TEXT NOT NULL DEFAULT 'Australia/Sydney',
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session_plan_revisions (
  revision_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id),
  revision_number INTEGER NOT NULL CHECK(revision_number > 0),
  revision_type TEXT NOT NULL CHECK(revision_type IN ('INITIAL','UPDATE','LEGACY_IMPORTED_SNAPSHOT')),
  created_at TEXT NOT NULL,
  previous_revision_id TEXT REFERENCES session_plan_revisions(revision_id),
  initial_bias TEXT CHECK(initial_bias IN ('LONG','SHORT','NEUTRAL','MIXED','UNKNOWN')),
  market_posture TEXT,
  main_scenario TEXT,
  alternative_scenario TEXT,
  expected_context_json TEXT,
  scenario_invalidation TEXT,
  things_not_to_do_json TEXT,
  what_changed_json TEXT,
  why_changed TEXT,
  new_evidence_summary TEXT,
  voice_transcript TEXT,
  created_by TEXT NOT NULL DEFAULT 'USER' CHECK(created_by IN ('USER','IMPORT','AI_ASSISTED')),
  provenance TEXT NOT NULL DEFAULT 'NATIVE',
  UNIQUE(session_id, revision_number)
);

CREATE TRIGGER IF NOT EXISTS trg_no_update_session_plan_revisions
BEFORE UPDATE ON session_plan_revisions BEGIN SELECT RAISE(ABORT, 'session plan revisions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_no_delete_session_plan_revisions
BEFORE DELETE ON session_plan_revisions BEGIN SELECT RAISE(ABORT, 'session plan revisions are immutable'); END;

CREATE TABLE IF NOT EXISTS candidates (
  candidate_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id),
  instrument_id TEXT NOT NULL REFERENCES instruments(instrument_id),
  label TEXT,
  identified_when TEXT NOT NULL CHECK(identified_when IN ('BEFORE_TODAY','PRE_SESSION','DURING_SESSION','UNKNOWN')),
  created_at TEXT NOT NULL,
  created_from_plan_revision_id TEXT REFERENCES session_plan_revisions(revision_id),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS candidate_revisions (
  candidate_revision_id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(candidate_id),
  revision_number INTEGER NOT NULL CHECK(revision_number > 0),
  created_at TEXT NOT NULL,
  previous_revision_id TEXT REFERENCES candidate_revisions(candidate_revision_id),
  directional_intent TEXT CHECK(directional_intent IN ('LONG','SHORT','CONDITIONAL','WATCH','UNKNOWN')),
  trend_relationship TEXT CHECK(trend_relationship IN ('WITH_TREND','COUNTERTREND','CONTINUATION_AFTER_CORRECTION','REVERSAL','NA','UNCLEAR') OR trend_relationship IS NULL),
  price_mode TEXT NOT NULL DEFAULT 'RANGE' CHECK(price_mode IN ('SINGLE','RANGE','UNSPECIFIED')),
  price_from REAL,
  price_to REAL,
  reference_price REAL,
  setup_version_id TEXT REFERENCES setup_versions(setup_version_id),
  required_conditions_json TEXT,
  invalidation_conditions_json TEXT,
  notes TEXT,
  change_type TEXT NOT NULL,
  change_reason TEXT,
  provenance TEXT NOT NULL DEFAULT 'NATIVE',
  UNIQUE(candidate_id, revision_number)
);

CREATE TRIGGER IF NOT EXISTS trg_no_update_candidate_revisions
BEFORE UPDATE ON candidate_revisions BEGIN SELECT RAISE(ABORT, 'candidate revisions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_no_delete_candidate_revisions
BEFORE DELETE ON candidate_revisions BEGIN SELECT RAISE(ABORT, 'candidate revisions are immutable'); END;

CREATE TABLE IF NOT EXISTS candidate_status_events (
  status_event_id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(candidate_id),
  occurred_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PLANNED','WATCHING','REACHED','VALID','INVALIDATED','CANCELLED','EXPIRED')),
  reason TEXT,
  provenance TEXT NOT NULL DEFAULT 'NATIVE'
);

CREATE TABLE IF NOT EXISTS level_source_types (
  source_type_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  source_group TEXT NOT NULL CHECK(source_group IN ('PRICE_AUCTION','STRUCTURE','VOLUME','ORDER_BOOK','HEATMAP','MANUAL','OTHER')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  user_defined INTEGER NOT NULL DEFAULT 0 CHECK(user_defined IN (0,1)),
  description TEXT,
  UNIQUE(workspace_id, code)
);

CREATE TABLE IF NOT EXISTS candidate_sources (
  candidate_source_id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidates(candidate_id),
  candidate_revision_id TEXT REFERENCES candidate_revisions(candidate_revision_id),
  source_type_id TEXT NOT NULL REFERENCES level_source_types(source_type_id),
  source_price REAL,
  direction TEXT,
  numeric_value REAL,
  occurred_at TEXT,
  note TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0,1)),
  provenance TEXT NOT NULL DEFAULT 'NATIVE'
);

CREATE TABLE IF NOT EXISTS evidence_types (
  evidence_type_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  family TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  research_status TEXT NOT NULL DEFAULT 'EXPERIMENTAL' CHECK(research_status IN ('EXPERIMENTAL','CANDIDATE','CORE','RETIRED')),
  user_defined INTEGER NOT NULL DEFAULT 0 CHECK(user_defined IN (0,1)),
  UNIQUE(workspace_id, code)
);

CREATE TABLE IF NOT EXISTS candidate_decisions (
  decision_id TEXT PRIMARY KEY,
  candidate_id TEXT REFERENCES candidates(candidate_id),
  session_id TEXT NOT NULL REFERENCES sessions(session_id),
  occurred_at TEXT NOT NULL,
  decision_type TEXT NOT NULL CHECK(decision_type IN ('TRADE','NO_TRADE','MISSED','LEGACY_UNCLASSIFIED')),
  reason_code TEXT,
  reason_note TEXT,
  invalidation_seen INTEGER CHECK(invalidation_seen IN (0,1) OR invalidation_seen IS NULL),
  risk_unacceptable INTEGER CHECK(risk_unacceptable IN (0,1) OR risk_unacceptable IS NULL),
  context_wrong INTEGER CHECK(context_wrong IN (0,1) OR context_wrong IS NULL),
  decision_quality TEXT CHECK(decision_quality IN ('A','B','C','INVALID','UNCLEAR') OR decision_quality IS NULL),
  decision_quality_note TEXT,
  based_on_plan_revision_id TEXT REFERENCES session_plan_revisions(revision_id),
  based_on_candidate_revision_id TEXT REFERENCES candidate_revisions(candidate_revision_id),
  provenance TEXT NOT NULL DEFAULT 'NATIVE'
);

CREATE TRIGGER IF NOT EXISTS trg_no_update_candidate_decisions
BEFORE UPDATE ON candidate_decisions BEGIN SELECT RAISE(ABORT, 'candidate decisions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_no_delete_candidate_decisions
BEFORE DELETE ON candidate_decisions BEGIN SELECT RAISE(ABORT, 'candidate decisions are immutable'); END;

CREATE TABLE IF NOT EXISTS trades (
  trade_id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL UNIQUE REFERENCES candidate_decisions(decision_id),
  session_id TEXT NOT NULL REFERENCES sessions(session_id),
  candidate_id TEXT REFERENCES candidates(candidate_id),
  setup_version_id TEXT REFERENCES setup_versions(setup_version_id),
  direction TEXT NOT NULL CHECK(direction IN ('LONG','SHORT')),
  planned_entry_price REAL,
  planned_stop_price REAL,
  planned_target_price REAL,
  entry_reason_summary TEXT,
  exit_reason_summary TEXT,
  management_note TEXT,
  decision_quality TEXT CHECK(decision_quality IN ('A','B','C','INVALID','UNCLEAR') OR decision_quality IS NULL),
  execution_quality TEXT,
  management_quality TEXT,
  status TEXT NOT NULL CHECK(status IN ('PLANNED','OPEN','PARTIALLY_CLOSED','CLOSED','CANCELLED','UNKNOWN')),
  provenance TEXT NOT NULL DEFAULT 'NATIVE'
);

CREATE TABLE IF NOT EXISTS execution_fills (
  execution_id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL REFERENCES trades(trade_id),
  occurred_at TEXT,
  action TEXT NOT NULL CHECK(action IN ('ENTRY','EXIT')),
  side TEXT NOT NULL CHECK(side IN ('BUY','SELL')),
  price REAL NOT NULL,
  quantity REAL NOT NULL CHECK(quantity > 0),
  order_type TEXT CHECK(order_type IN ('MARKET','LIMIT','STOP','OTHER') OR order_type IS NULL),
  commission REAL,
  fees REAL,
  source TEXT NOT NULL DEFAULT 'MANUAL' CHECK(source IN ('MANUAL','NINJATRADER_IMPORT','LEGACY_IMPORT','OTHER')),
  external_execution_id TEXT,
  note TEXT,
  UNIQUE(source, external_execution_id)
);

CREATE TABLE IF NOT EXISTS risk_snapshots (
  risk_snapshot_id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL REFERENCES trades(trade_id),
  occurred_at TEXT NOT NULL,
  snapshot_type TEXT NOT NULL CHECK(snapshot_type IN ('PLANNED','INITIAL','MODIFIED','FINAL')),
  stop_price REAL,
  quantity REAL,
  risk_dollars REAL,
  risk_percent REAL,
  risk_r REAL,
  change_reason TEXT,
  was_rule_compliant INTEGER CHECK(was_rule_compliant IN (0,1) OR was_rule_compliant IS NULL),
  provenance TEXT NOT NULL DEFAULT 'NATIVE'
);

CREATE TABLE IF NOT EXISTS evidence_observations (
  evidence_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id),
  candidate_id TEXT REFERENCES candidates(candidate_id),
  trade_id TEXT REFERENCES trades(trade_id),
  evidence_type_id TEXT NOT NULL REFERENCES evidence_types(evidence_type_id),
  role TEXT NOT NULL CHECK(role IN ('LEVEL_SOURCE','SETUP_SUPPORT','ENTRY_CONFIRMATION','CONTRADICTING_EVIDENCE','INVALIDATION','MANAGEMENT_SIGNAL','EXIT_SIGNAL','GENERAL_OBSERVATION')),
  occurred_at TEXT,
  direction TEXT,
  price REAL,
  numeric_value REAL,
  strength REAL,
  present INTEGER NOT NULL DEFAULT 1 CHECK(present IN (0,1)),
  note TEXT,
  provenance TEXT NOT NULL DEFAULT 'NATIVE'
);

CREATE TABLE IF NOT EXISTS attachments (
  attachment_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  owner_type TEXT NOT NULL CHECK(owner_type IN ('SESSION','CANDIDATE','DECISION','TRADE','REVIEW')),
  owner_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN ('PRE_MARKET','PRE_ENTRY','ENTRY','DURING','POST_EXIT','FOLLOW_UP','ORDER_FLOW','OTHER')),
  occurred_at TEXT,
  storage_key TEXT NOT NULL,
  original_filename TEXT,
  media_type TEXT,
  file_size INTEGER,
  sha256 TEXT,
  caption TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session_reviews (
  review_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE REFERENCES sessions(session_id),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','COMPLETED')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  what_went_well TEXT,
  what_went_poorly TEXT,
  best_decision TEXT,
  biggest_mistake TEXT,
  market_learning TEXT,
  next_improvement TEXT,
  plan_quality TEXT,
  setup_selection TEXT,
  execution TEXT,
  risk_management TEXT,
  discipline TEXT,
  trade_management TEXT,
  overall_assessment TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS migration_runs (
  migration_run_id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  source_version TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  source_hash TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS legacy_record_map (
  map_id TEXT PRIMARY KEY,
  migration_run_id TEXT NOT NULL REFERENCES migration_runs(migration_run_id),
  source_store TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'EXACT',
  UNIQUE(migration_run_id, source_store, source_record_id, target_entity, target_id)
);

CREATE TABLE IF NOT EXISTS migration_issues (
  issue_id TEXT PRIMARY KEY,
  migration_run_id TEXT NOT NULL REFERENCES migration_runs(migration_run_id),
  source_store TEXT,
  source_record_id TEXT,
  issue_code TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('INFO','WARNING','ERROR')),
  detail TEXT,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_instrument_date ON sessions(instrument_id, session_date);
CREATE INDEX IF NOT EXISTS idx_candidates_session ON candidates(session_id);
CREATE INDEX IF NOT EXISTS idx_candidate_revisions_candidate ON candidate_revisions(candidate_id, revision_number);
CREATE INDEX IF NOT EXISTS idx_candidate_status_candidate_time ON candidate_status_events(candidate_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_candidate_sources_candidate ON candidate_sources(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_sources_type ON candidate_sources(source_type_id);
CREATE INDEX IF NOT EXISTS idx_decisions_candidate_time ON candidate_decisions(candidate_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_decisions_type ON candidate_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_trades_session ON trades(session_id);
CREATE INDEX IF NOT EXISTS idx_trades_candidate ON trades(candidate_id);
CREATE INDEX IF NOT EXISTS idx_execution_trade_time ON execution_fills(trade_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_evidence_candidate ON evidence_observations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_evidence_trade ON evidence_observations(trade_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type_role ON evidence_observations(evidence_type_id, role);
