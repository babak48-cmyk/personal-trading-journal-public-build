-- Package C: durable weekly decisions and follow-up without rewriting prior notes.
-- Append-only, scoped by exact Monday and explicit user-specified filter snapshot.
CREATE TABLE weekly_learning_action_events (
  action_event_id TEXT PRIMARY KEY,
  week_start TEXT NOT NULL CHECK(length(week_start)=10),
  filter_snapshot_json TEXT NOT NULL CHECK(length(filter_snapshot_json) BETWEEN 2 AND 4000),
  action_text TEXT NOT NULL CHECK(length(trim(action_text)) BETWEEN 1 AND 500),
  event_kind TEXT NOT NULL CHECK(event_kind IN ('COMMITMENT','FOLLOW_UP')),
  note TEXT CHECK(note IS NULL OR length(trim(note))<=1000),
  based_on_event_id TEXT REFERENCES weekly_learning_action_events(action_event_id),
  recorded_at_utc TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'LOCAL_USER' CHECK(actor='LOCAL_USER'),
  CHECK((event_kind='COMMITMENT' AND based_on_event_id IS NULL) OR
        (event_kind='FOLLOW_UP' AND based_on_event_id IS NOT NULL))
);
CREATE INDEX idx_weekly_learning_action_week ON weekly_learning_action_events(week_start,recorded_at_utc);
CREATE INDEX idx_weekly_learning_action_parent ON weekly_learning_action_events(based_on_event_id);
CREATE TRIGGER weekly_learning_action_no_update BEFORE UPDATE ON weekly_learning_action_events
BEGIN SELECT RAISE(ABORT,'weekly learning action events are immutable'); END;
CREATE TRIGGER weekly_learning_action_no_delete BEFORE DELETE ON weekly_learning_action_events
BEGIN SELECT RAISE(ABORT,'weekly learning action events are immutable'); END;
