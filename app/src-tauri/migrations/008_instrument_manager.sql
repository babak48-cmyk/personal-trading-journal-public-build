ALTER TABLE instruments ADD COLUMN market_type TEXT;
ALTER TABLE instruments ADD COLUMN display_order INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE instruments ADD COLUMN user_defined INTEGER NOT NULL DEFAULT 0 CHECK(user_defined IN (0,1));

UPDATE instruments
SET display_order = rowid
WHERE display_order = 1000;

ALTER TABLE sessions ADD COLUMN instrument_symbol_snapshot TEXT;
ALTER TABLE sessions ADD COLUMN instrument_display_name_snapshot TEXT;
ALTER TABLE sessions ADD COLUMN instrument_tick_size_snapshot REAL;
ALTER TABLE sessions ADD COLUMN instrument_point_value_snapshot REAL;
ALTER TABLE sessions ADD COLUMN instrument_currency_snapshot TEXT;

UPDATE sessions
SET instrument_symbol_snapshot = (SELECT i.symbol FROM instruments i WHERE i.instrument_id=sessions.instrument_id),
    instrument_display_name_snapshot = (SELECT i.display_name FROM instruments i WHERE i.instrument_id=sessions.instrument_id),
    instrument_tick_size_snapshot = (SELECT i.tick_size FROM instruments i WHERE i.instrument_id=sessions.instrument_id),
    instrument_point_value_snapshot = (SELECT i.point_value FROM instruments i WHERE i.instrument_id=sessions.instrument_id),
    instrument_currency_snapshot = (SELECT i.currency FROM instruments i WHERE i.instrument_id=sessions.instrument_id)
WHERE instrument_symbol_snapshot IS NULL;

CREATE INDEX IF NOT EXISTS idx_instruments_workspace_order
ON instruments(workspace_id, display_order, symbol);
