CREATE TRIGGER IF NOT EXISTS trg_no_update_execution_fills
BEFORE UPDATE ON execution_fills BEGIN SELECT RAISE(ABORT, 'execution fills are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_no_delete_execution_fills
BEFORE DELETE ON execution_fills BEGIN SELECT RAISE(ABORT, 'execution fills are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_no_update_risk_snapshots
BEFORE UPDATE ON risk_snapshots BEGIN SELECT RAISE(ABORT, 'risk snapshots are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_no_delete_risk_snapshots
BEFORE DELETE ON risk_snapshots BEGIN SELECT RAISE(ABORT, 'risk snapshots are immutable'); END;

CREATE INDEX IF NOT EXISTS idx_risk_trade_time ON risk_snapshots(trade_id, occurred_at);
