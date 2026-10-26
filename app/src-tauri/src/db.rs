use std::path::Path;
use rusqlite::{Connection, OptionalExtension};
use crate::error::AppError;

pub const CURRENT_SCHEMA_VERSION: u32 = 9;
const MIGRATION_001: &str = include_str!("../migrations/001_initial.sql");
const MIGRATION_002: &str = include_str!("../migrations/002_decision_workflow.sql");
const MIGRATION_003: &str = include_str!("../migrations/003_execution_core.sql");
const MIGRATION_004: &str = include_str!("../migrations/004_post_trade_review.sql");
const MIGRATION_005: &str = include_str!("../migrations/005_session_review_rules.sql");
const MIGRATION_006: &str = include_str!("../migrations/006_attachments_indexes.sql");
const MIGRATION_007: &str = include_str!("../migrations/007_level_source_manager.sql");
const MIGRATION_008: &str = include_str!("../migrations/008_instrument_manager.sql");
const MIGRATION_009: &str = include_str!("../migrations/009_custom_field_foundation.sql");

pub fn open_database(path: &Path) -> Result<Connection, AppError> {
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 5000;")?;
    migrate(&conn)?;
    Ok(conn)
}

pub(crate) fn migrate(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_meta (id INTEGER PRIMARY KEY CHECK(id = 1), schema_version INTEGER NOT NULL);\n         INSERT OR IGNORE INTO schema_meta(id, schema_version) VALUES(1, 0);"
    )?;

    let version: u32 = conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?;
    if version < 1 {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_001).map_err(|_| AppError::Migration(1))?;
        tx.execute("UPDATE schema_meta SET schema_version=1 WHERE id=1", [])?;
        tx.commit()?;
    }
    let version: u32 = conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?;
    if version < 2 {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_002).map_err(|_| AppError::Migration(2))?;
        tx.execute("UPDATE schema_meta SET schema_version=2 WHERE id=1", [])?;
        tx.commit()?;
    }
    let version: u32 = conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?;
    if version < 3 {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_003).map_err(|_| AppError::Migration(3))?;
        tx.execute("UPDATE schema_meta SET schema_version=3 WHERE id=1", [])?;
        tx.commit()?;
    }
    let version: u32 = conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?;
    if version < 4 {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_004).map_err(|_| AppError::Migration(4))?;
        tx.execute("UPDATE schema_meta SET schema_version=4 WHERE id=1", [])?;
        tx.commit()?;
    }
    let version: u32 = conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?;
    if version < 5 {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_005).map_err(|_| AppError::Migration(5))?;
        tx.execute("UPDATE schema_meta SET schema_version=5 WHERE id=1", [])?;
        tx.commit()?;
    }
    let version: u32 = conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?;
    if version < 6 {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_006).map_err(|_| AppError::Migration(6))?;
        tx.execute("UPDATE schema_meta SET schema_version=6 WHERE id=1", [])?;
        tx.commit()?;
    }
    let version: u32 = conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?;
    if version < 7 {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_007).map_err(|_| AppError::Migration(7))?;
        tx.execute("UPDATE schema_meta SET schema_version=7 WHERE id=1", [])?;
        tx.commit()?;
    }
    let version: u32 = conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?;
    if version < 8 {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_008).map_err(|_| AppError::Migration(8))?;
        tx.execute("UPDATE schema_meta SET schema_version=8 WHERE id=1", [])?;
        tx.commit()?;
    }
    let version: u32 = conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?;
    if version < 9 {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_009).map_err(|_| AppError::Migration(9))?;
        tx.execute("UPDATE schema_meta SET schema_version=9 WHERE id=1", [])?;
        tx.commit()?;
    }
    Ok(())
}

pub fn schema_version(conn: &Connection) -> Result<u32, AppError> {
    Ok(conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?)
}

pub fn integrity_check(conn: &Connection) -> Result<String, AppError> {
    Ok(conn.query_row("PRAGMA integrity_check", [], |r| r.get(0))?)
}

pub fn setting(conn: &Connection, key: &str) -> Result<Option<String>, AppError> {
    Ok(conn.query_row("SELECT value FROM app_settings WHERE key=?1", [key], |r| r.get(0)).optional()?)
}


pub fn foreign_key_violation_count(conn: &Connection) -> Result<u64, AppError> {
    let mut stmt = conn.prepare("PRAGMA foreign_key_check")?;
    let mut rows = stmt.query([])?;
    let mut count = 0u64;
    while rows.next()?.is_some() { count += 1; }
    Ok(count)
}

#[cfg(test)]
mod custom_field_schema_tests {
    use super::*;
    #[test]
    fn custom_field_schema_v8_to_v9_preserves_existing_session_and_trade_data() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON; CREATE TABLE schema_meta (id INTEGER PRIMARY KEY CHECK(id=1), schema_version INTEGER NOT NULL); INSERT INTO schema_meta(id,schema_version) VALUES(1,0);").unwrap();
        for (version, sql) in [
            MIGRATION_001, MIGRATION_002, MIGRATION_003, MIGRATION_004,
            MIGRATION_005, MIGRATION_006, MIGRATION_007, MIGRATION_008,
        ].iter().enumerate() {
            let tx = conn.unchecked_transaction().unwrap();
            tx.execute_batch(sql).unwrap();
            tx.execute("UPDATE schema_meta SET schema_version=?1 WHERE id=1", [version as i64 + 1]).unwrap();
            tx.commit().unwrap();
        }
        assert_eq!(schema_version(&conn).unwrap(),8);
        conn.execute("INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w-test','Fixture','2026-10-15')",[]).unwrap();
        conn.execute("INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value) VALUES('i-test','w-test','ES',0.25,50)",[]).unwrap();
        conn.execute("INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at) VALUES('s-test','w-test','i-test','2026-10-15','DEMO','2026-10-15','DRAFT','2026-10-15','2026-10-15')",[]).unwrap();
        conn.execute("INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type) VALUES('d-test','s-test','2026-10-15','TRADE')",[]).unwrap();
        conn.execute("INSERT INTO trades(trade_id,decision_id,session_id,direction,status) VALUES('t-test','d-test','s-test','LONG','OPEN')",[]).unwrap();
        conn.execute("INSERT INTO execution_fills(execution_id,trade_id,occurred_at,action,side,price,quantity,commission) VALUES('fill-test','t-test','2026-10-15','ENTRY','BUY',5800.25,1,2.5)",[]).unwrap();
        let before_fill:(f64,f64)=conn.query_row("SELECT price,commission FROM execution_fills WHERE execution_id='fill-test'",[],|r|Ok((r.get(0)?,r.get(1)?))).unwrap();
        let before_sessions:i64 = conn.query_row("SELECT count(*) FROM sessions",[],|r|r.get(0)).unwrap();
        let before_trades:i64 = conn.query_row("SELECT count(*) FROM trades",[],|r|r.get(0)).unwrap();
        migrate(&conn).unwrap();
        assert_eq!(schema_version(&conn).unwrap(),9);
        assert_eq!(conn.query_row("SELECT session_date FROM sessions WHERE session_id='s-test'",[],|r|r.get::<_,String>(0)).unwrap(),"2026-10-15");
        assert_eq!(conn.query_row("SELECT direction FROM trades WHERE trade_id='t-test'",[],|r|r.get::<_,String>(0)).unwrap(),"LONG");
        assert_eq!(conn.query_row("SELECT price,commission FROM execution_fills WHERE execution_id='fill-test'",[],|r|Ok((r.get::<_,f64>(0)?,r.get::<_,f64>(1)?))).unwrap(),before_fill);
        assert_eq!(conn.query_row("SELECT count(*) FROM sessions",[],|r|r.get::<_,i64>(0)).unwrap(),before_sessions);
        assert_eq!(conn.query_row("SELECT count(*) FROM trades",[],|r|r.get::<_,i64>(0)).unwrap(),before_trades);
        assert_eq!(integrity_check(&conn).unwrap(),"ok");
        assert_eq!(foreign_key_violation_count(&conn).unwrap(),0);
        migrate(&conn).unwrap();
        assert_eq!(schema_version(&conn).unwrap(),9);
    }
    #[test]
    fn custom_field_schema_v9_transaction_failure_rolls_back_on_disposable_v8() {
        let conn=Connection::open_in_memory().unwrap();
        conn.execute_batch("CREATE TABLE schema_meta(id INTEGER PRIMARY KEY, schema_version INTEGER NOT NULL); INSERT INTO schema_meta VALUES(1,8);").unwrap();
        let result = (|| -> Result<(),rusqlite::Error> {
            let tx=conn.unchecked_transaction()?;
            tx.execute_batch(MIGRATION_009)?;
            tx.execute_batch("INSERT INTO non_existent_gate3_table VALUES(1);")?;
            tx.execute("UPDATE schema_meta SET schema_version=9 WHERE id=1",[])?;
            tx.commit()?;
            Ok(())
        })();
        assert!(result.is_err());
        assert_eq!(schema_version(&conn).unwrap(),8);
        let count:i64=conn.query_row("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='custom_field_definitions'",[],|r|r.get(0)).unwrap();
        assert_eq!(count,0);
        assert_eq!(integrity_check(&conn).unwrap(),"ok");
    }
    #[test]
    fn custom_field_schema_v9_preserves_immutable_option_snapshots() {
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();
        assert_eq!(schema_version(&conn).unwrap(), 9);
        conn.execute("INSERT INTO custom_field_definitions(field_id,stage,field_type,label) VALUES('context','session-review','SINGLE_SELECT','Context')",[]).unwrap();
        conn.execute("INSERT INTO custom_field_options(option_id,field_id,label) VALUES('trend','context','Trending')",[]).unwrap();
        conn.execute("INSERT INTO custom_field_value_events(event_id,field_id,owner_stage,owner_id,value_type) VALUES('e1','context','session-review','demo-session','SINGLE_SELECT')",[]).unwrap();
        conn.execute("INSERT INTO custom_field_selection_snapshots(event_id,option_id,label_at_selection,ordinal) VALUES('e1','trend','Trending',0)",[]).unwrap();
        conn.execute("UPDATE custom_field_options SET label='Directional',is_active=0 WHERE option_id='trend'",[]).unwrap();
        let original:String=conn.query_row("SELECT label_at_selection FROM custom_field_selection_snapshots WHERE event_id='e1'",[],|r|r.get(0)).unwrap();
        assert_eq!(original,"Trending");
        assert!(conn.execute("UPDATE custom_field_selection_snapshots SET label_at_selection='Directional' WHERE event_id='e1'",[]).is_err());
        assert!(conn.execute("DELETE FROM custom_field_value_events WHERE event_id='e1'",[]).is_err());
        assert_eq!(foreign_key_violation_count(&conn).unwrap(),0);
    }
    #[test]
    fn custom_field_schema_v9_rejects_malformed_typed_values_and_remains_idempotent() {
        let conn=Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();
        migrate(&conn).unwrap();
        conn.execute("INSERT INTO custom_field_definitions(field_id,stage,field_type,label) VALUES('risk','post-trade-review','NUMBER','Risk')",[]).unwrap();
        assert!(conn.execute("INSERT INTO custom_field_value_events(event_id,field_id,owner_stage,owner_id,value_type,text_value) VALUES('bad','risk','post-trade-review','demo-trade','NUMBER','oops')",[]).is_err());
        assert_eq!(schema_version(&conn).unwrap(),CURRENT_SCHEMA_VERSION);
    }
}
