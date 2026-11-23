use std::path::Path;
use rusqlite::{Connection, OptionalExtension};
use crate::error::AppError;

pub const CURRENT_SCHEMA_VERSION: u32 = 15;
const MIGRATION_001: &str = include_str!("../migrations/001_initial.sql");
const MIGRATION_002: &str = include_str!("../migrations/002_decision_workflow.sql");
const MIGRATION_003: &str = include_str!("../migrations/003_execution_core.sql");
const MIGRATION_004: &str = include_str!("../migrations/004_post_trade_review.sql");
const MIGRATION_005: &str = include_str!("../migrations/005_session_review_rules.sql");
const MIGRATION_006: &str = include_str!("../migrations/006_attachments_indexes.sql");
const MIGRATION_007: &str = include_str!("../migrations/007_level_source_manager.sql");
const MIGRATION_008: &str = include_str!("../migrations/008_instrument_manager.sql");
const MIGRATION_009: &str = include_str!("../migrations/009_custom_field_foundation.sql");
const MIGRATION_010: &str = include_str!("../migrations/010_audited_fill_corrections.sql");
const MIGRATION_011: &str = include_str!("../migrations/011_setup_playbook.sql");
const MIGRATION_012: &str = include_str!("../migrations/012_weekly_learning_action_events.sql");
const MIGRATION_013: &str = include_str!("../migrations/013_initial_risk_corrections.sql");
const MIGRATION_014: &str = include_str!("../migrations/014_candidate_source_type_corrections.sql");
const MIGRATION_015: &str = include_str!("../migrations/015_candidate_source_price_corrections.sql");

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
    let version: u32 = conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?;
    if version < 10 {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_010).map_err(|_| AppError::Migration(10))?;
        tx.execute("UPDATE schema_meta SET schema_version=10 WHERE id=1", [])?;
        tx.commit()?;
    }
    let version: u32 = conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?;
    if version < 11 {
        let tx=conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_011).map_err(|_|AppError::Migration(11))?;
        tx.execute("UPDATE schema_meta SET schema_version=11 WHERE id=1", [])?;
        tx.commit()?;
    }
    let version: u32 = conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?;
    if version < 12 {
        let tx=conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_012).map_err(|_|AppError::Migration(12))?;
        tx.execute("UPDATE schema_meta SET schema_version=12 WHERE id=1", [])?;
        tx.commit()?;
    }
    let version: u32 = conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?;
    if version < 13 {
        let tx=conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_013).map_err(|_|AppError::Migration(13))?;
        tx.execute("UPDATE schema_meta SET schema_version=13 WHERE id=1", [])?;
        tx.commit()?;
    }
    let version: u32 = conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?;
    if version < 14 {
        let tx=conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_014).map_err(|_|AppError::Migration(14))?;
        tx.execute("UPDATE schema_meta SET schema_version=14 WHERE id=1", [])?;
        tx.commit()?;
    }
    let version: u32 = conn.query_row("SELECT schema_version FROM schema_meta WHERE id=1", [], |r| r.get(0))?;
    if version < 15 {
        let tx=conn.unchecked_transaction()?;
        tx.execute_batch(MIGRATION_015).map_err(|_|AppError::Migration(15))?;
        tx.execute("UPDATE schema_meta SET schema_version=15 WHERE id=1", [])?;
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
        assert_eq!(schema_version(&conn).unwrap(),14);
        assert_eq!(conn.query_row("SELECT session_date FROM sessions WHERE session_id='s-test'",[],|r|r.get::<_,String>(0)).unwrap(),"2026-10-15");
        assert_eq!(conn.query_row("SELECT direction FROM trades WHERE trade_id='t-test'",[],|r|r.get::<_,String>(0)).unwrap(),"LONG");
        assert_eq!(conn.query_row("SELECT price,commission FROM execution_fills WHERE execution_id='fill-test'",[],|r|Ok((r.get::<_,f64>(0)?,r.get::<_,f64>(1)?))).unwrap(),before_fill);
        assert_eq!(conn.query_row("SELECT count(*) FROM sessions",[],|r|r.get::<_,i64>(0)).unwrap(),before_sessions);
        assert_eq!(conn.query_row("SELECT count(*) FROM trades",[],|r|r.get::<_,i64>(0)).unwrap(),before_trades);
        assert_eq!(integrity_check(&conn).unwrap(),"ok");
        assert_eq!(foreign_key_violation_count(&conn).unwrap(),0);
        migrate(&conn).unwrap();
        assert_eq!(schema_version(&conn).unwrap(),14);
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
        assert_eq!(schema_version(&conn).unwrap(), CURRENT_SCHEMA_VERSION);
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


#[cfg(test)]
mod audited_correction_migration_gate_tests {
    use super::*;
    #[test]
    fn failed_v9_to_v10_install_keeps_existing_trade_and_schema_unchanged() {
        let conn=Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON; CREATE TABLE schema_meta(id INTEGER PRIMARY KEY CHECK(id=1), schema_version INTEGER NOT NULL); INSERT INTO schema_meta VALUES(1,0);").unwrap();
        for (idx,sql) in [MIGRATION_001,MIGRATION_002,MIGRATION_003,MIGRATION_004,MIGRATION_005,MIGRATION_006,MIGRATION_007,MIGRATION_008,MIGRATION_009].iter().enumerate() {
            let tx=conn.unchecked_transaction().unwrap();
            tx.execute_batch(sql).unwrap();
            tx.execute("UPDATE schema_meta SET schema_version=?1 WHERE id=1",[(idx+1) as i64]).unwrap();
            tx.commit().unwrap();
        }
        assert_eq!(schema_version(&conn).unwrap(),9);
        conn.execute_batch("
          INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','Original','2026-11-15');
          INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value) VALUES('i','w','ES',0.25,50);
          INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at)
            VALUES('s','w','i','2026-11-15','DEMO','now','ACTIVE','now','now');
          INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type,intended_direction)
            VALUES('d','s','now','TRADE','LONG');
          INSERT INTO trades(trade_id,decision_id,session_id,direction,status)
            VALUES('t','d','s','LONG','OPEN');
          INSERT INTO execution_fills(execution_id,trade_id,action,side,price,quantity)
            VALUES('f','t','ENTRY','BUY',5000,1);
        ").unwrap();
        let failure=(||->Result<(),rusqlite::Error>{
            let tx=conn.unchecked_transaction()?;
            tx.execute_batch(MIGRATION_010)?;
            // Simulate an exception after table creation but before schema bump.
            tx.execute("INSERT INTO deliberately_missing_table VALUES(1)",[])?;
            tx.execute("UPDATE schema_meta SET schema_version=10 WHERE id=1",[])?;
            tx.commit()
        })();
        assert!(failure.is_err());
        assert_eq!(schema_version(&conn).unwrap(),9);
        let old_price:f64=conn.query_row("SELECT price FROM execution_fills WHERE execution_id='f'",[],|r|r.get(0)).unwrap();
        assert_eq!(old_price,5000.0);
        let new_tables:i64=conn.query_row(
            "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='fill_correction_events'",
            [],|r|r.get(0)).unwrap();
        assert_eq!(new_tables,0);
        migrate(&conn).unwrap();
        assert_eq!(schema_version(&conn).unwrap(),14);
        assert_eq!(conn.query_row("SELECT price FROM execution_fills WHERE execution_id='f'",[],|r|r.get::<_,f64>(0)).unwrap(),5000.0);
        assert_eq!(integrity_check(&conn).unwrap(),"ok");
        assert_eq!(foreign_key_violation_count(&conn).unwrap(),0);
    }
}


#[cfg(test)]
mod setup_playbook_v11_migration_tests {
    use super::*;
    #[test]
    fn canonical_v10_setup_ids_are_preserved_and_injected_migration_failure_rolls_back(){
        let c=Connection::open_in_memory().unwrap();
        c.execute_batch("PRAGMA foreign_keys=ON;
          CREATE TABLE schema_meta(id INTEGER PRIMARY KEY CHECK(id=1),schema_version INTEGER NOT NULL);
          INSERT INTO schema_meta(id,schema_version) VALUES(1,0);").unwrap();
        for (index,sql) in [MIGRATION_001,MIGRATION_002,MIGRATION_003,MIGRATION_004,MIGRATION_005,
            MIGRATION_006,MIGRATION_007,MIGRATION_008,MIGRATION_009,MIGRATION_010].iter().enumerate(){
            let tx=c.unchecked_transaction().unwrap();
            tx.execute_batch(sql).unwrap();
            tx.execute("UPDATE schema_meta SET schema_version=?1",[(index+1) as i64]).unwrap();
            tx.commit().unwrap();
        }
        c.execute_batch("
          INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','Original','now');
          INSERT INTO setups(setup_id,workspace_id,name,active,user_defined) VALUES('original-setup','w','Historical','1','1');
          INSERT INTO setup_versions(setup_version_id,setup_id,version_label,status)
             VALUES('original-version','original-setup','v1','ACTIVE');").unwrap();
        assert_eq!(schema_version(&c).unwrap(),10);
        let failed=(||->Result<(),rusqlite::Error>{
            let tx=c.unchecked_transaction()?;
            tx.execute_batch(MIGRATION_011)?;
            tx.execute("INSERT INTO intentionally_missing_table VALUES(1)",[])?;
            tx.execute("UPDATE schema_meta SET schema_version=11",[])?;
            tx.commit()
        })();
        assert!(failed.is_err());
        assert_eq!(schema_version(&c).unwrap(),10);
        let details:i64=c.query_row(
           "SELECT COUNT(*) FROM sqlite_master WHERE name='setup_playbook_details'",[],|r|r.get(0)).unwrap();
        assert_eq!(details,0);
        migrate(&c).unwrap();
        assert_eq!(schema_version(&c).unwrap(),14);
        let saved:String=c.query_row("SELECT setup_version_id FROM setup_versions WHERE setup_id='original-setup'",[],
            |r|r.get(0)).unwrap();
        assert_eq!(saved,"original-version");
        let version_count:i64=c.query_row("SELECT COUNT(*) FROM setup_versions",[],|r|r.get(0)).unwrap();
        assert_eq!(version_count,1);
        assert_eq!(integrity_check(&c).unwrap(),"ok");
        assert_eq!(foreign_key_violation_count(&c).unwrap(),0);
    }
}

#[cfg(test)]
mod weekly_action_schema_v12_tests {
    use super::*;
    fn v11_database()->Connection{
        let c=Connection::open_in_memory().unwrap();
        c.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        let migrations=[
            MIGRATION_001,MIGRATION_002,MIGRATION_003,MIGRATION_004,
            MIGRATION_005,MIGRATION_006,MIGRATION_007,MIGRATION_008,
            MIGRATION_009,MIGRATION_010,MIGRATION_011
        ];
        c.execute_batch(
          "CREATE TABLE schema_meta(id INTEGER PRIMARY KEY CHECK(id=1),schema_version INTEGER NOT NULL);
           INSERT INTO schema_meta VALUES(1,0);").unwrap();
        for (i,sql) in migrations.iter().enumerate(){
            let tx=c.unchecked_transaction().unwrap();
            tx.execute_batch(sql).unwrap();
            tx.execute("UPDATE schema_meta SET schema_version=?1 WHERE id=1",[(i+1) as i64]).unwrap();
            tx.commit().unwrap();
        }
        c.execute_batch(
          "INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','B DEMO','2026-11-22');
           INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value)
             VALUES('i','w','ES',0.25,50);
           INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at)
             VALUES('s','w','i','2026-11-22','DEMO','2026-11-22','ACTIVE','2026-11-22','2026-11-22');").unwrap();
        assert_eq!(schema_version(&c).unwrap(),11);
        c
    }
    #[test]
    fn v11_package_b_session_survives_v12_migration_idempotently(){
        let c=v11_database();
        migrate(&c).unwrap();
        assert_eq!(schema_version(&c).unwrap(),14);
        assert_eq!(c.query_row("SELECT session_date FROM sessions WHERE session_id='s'",[],|r|r.get::<_,String>(0)).unwrap(),"2026-11-22");
        assert_eq!(c.query_row("SELECT count(*) FROM weekly_learning_action_events",[],|r|r.get::<_,i64>(0)).unwrap(),0);
        migrate(&c).unwrap();
        assert_eq!(schema_version(&c).unwrap(),14);
        assert_eq!(integrity_check(&c).unwrap(),"ok");
        assert_eq!(foreign_key_violation_count(&c).unwrap(),0);
    }
    #[test]
    fn aborted_v12_install_rolls_back_whole_schema_and_leaves_old_session(){
        let c=v11_database();
        let fail=(||->Result<(),rusqlite::Error>{
            let tx=c.unchecked_transaction()?;
            tx.execute_batch(MIGRATION_012)?;
            tx.execute("INSERT INTO deliberately_nonexistent_test_table VALUES(1)",[])?;
            tx.execute("UPDATE schema_meta SET schema_version=12 WHERE id=1",[])?;
            tx.commit()?;
            Ok(())
        })();
        assert!(fail.is_err());
        assert_eq!(schema_version(&c).unwrap(),11);
        let table_count:i64=c.query_row("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='weekly_learning_action_events'",[],|r|r.get(0)).unwrap();
        assert_eq!(table_count,0);
        assert_eq!(c.query_row("SELECT COUNT(*) FROM sessions",[],|r|r.get::<_,i64>(0)).unwrap(),1);
        migrate(&c).unwrap();
        assert_eq!(schema_version(&c).unwrap(),14);
        assert_eq!(integrity_check(&c).unwrap(),"ok");
    }
}

#[cfg(test)]
mod initial_risk_schema_v13_tests {
    use super::*;
    fn legacy_v12_with_initial_risk()->Connection {
        let c=Connection::open_in_memory().unwrap();
        c.execute_batch(
          "PRAGMA foreign_keys=ON;
           CREATE TABLE schema_meta(id INTEGER PRIMARY KEY CHECK(id=1),schema_version INTEGER NOT NULL);
           INSERT INTO schema_meta VALUES(1,0);").unwrap();
        for (i,sql) in [MIGRATION_001,MIGRATION_002,MIGRATION_003,MIGRATION_004,
                        MIGRATION_005,MIGRATION_006,MIGRATION_007,MIGRATION_008,
                        MIGRATION_009,MIGRATION_010,MIGRATION_011,MIGRATION_012].iter().enumerate(){
            let tx=c.unchecked_transaction().unwrap();
            tx.execute_batch(sql).unwrap();
            tx.execute("UPDATE schema_meta SET schema_version=?1 WHERE id=1",[(i+1) as i64]).unwrap();
            tx.commit().unwrap();
        }
        c.execute_batch(
          "INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','B history','date');
           INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value)
             VALUES('i','w','GC',0.1,100);
           INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at)
             VALUES('s','w','i','2026-11-22','DEMO','date','CLOSED','date','date');
           INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type,intended_direction)
             VALUES('d','s','2026-11-22T10:00:00Z','TRADE','LONG');
           INSERT INTO trades(trade_id,decision_id,session_id,direction,status)
             VALUES('t','d','s','LONG','CLOSED');
           INSERT INTO risk_snapshots(risk_snapshot_id,trade_id,occurred_at,snapshot_type,stop_price,quantity,risk_dollars)
             VALUES('r','t','2026-11-22T10:01:00Z','INITIAL',4099.5,2,100);").unwrap();
        assert_eq!(schema_version(&c).unwrap(),12);
        c
    }
    #[test]
    fn v13_failed_migration_rolls_back_and_preserves_old_risk_history(){
        let c=legacy_v12_with_initial_risk();
        let failure=(||->Result<(),rusqlite::Error>{
            let tx=c.unchecked_transaction()?;
            tx.execute_batch(MIGRATION_013)?;
            tx.execute("INSERT INTO intentionally_missing_table VALUES(1)",[])?;
            tx.execute("UPDATE schema_meta SET schema_version=13 WHERE id=1",[])?;
            tx.commit()
        })();
        assert!(failure.is_err());
        assert_eq!(schema_version(&c).unwrap(),12);
        let count:i64=c.query_row(
          "SELECT COUNT(*) FROM sqlite_master WHERE type='table'
           AND name='initial_risk_correction_events'",[],|r|r.get(0)).unwrap();
        assert_eq!(count,0);
        let original:f64=c.query_row("SELECT risk_dollars FROM risk_snapshots WHERE risk_snapshot_id='r'",[],|r|r.get(0)).unwrap();
        assert_eq!(original,100.0);
        migrate(&c).unwrap();
        assert_eq!(schema_version(&c).unwrap(),14);
        migrate(&c).unwrap();
        assert_eq!(schema_version(&c).unwrap(),14);
        assert_eq!(c.query_row("SELECT risk_dollars FROM risk_snapshots WHERE risk_snapshot_id='r'",[],|r|r.get::<_,f64>(0)).unwrap(),100.0);
        assert_eq!(integrity_check(&c).unwrap(),"ok");
        assert_eq!(foreign_key_violation_count(&c).unwrap(),0);
    }
}

#[cfg(test)]
mod source_type_schema_v14_tests {
    use super::*;
    fn v13_with_source()->Connection {
        let c=Connection::open_in_memory().unwrap();
        c.execute_batch(
            "PRAGMA foreign_keys=ON;
             CREATE TABLE schema_meta(id INTEGER PRIMARY KEY CHECK(id=1),schema_version INTEGER NOT NULL);
             INSERT INTO schema_meta VALUES(1,0);").unwrap();
        let old=[
            MIGRATION_001,MIGRATION_002,MIGRATION_003,MIGRATION_004,
            MIGRATION_005,MIGRATION_006,MIGRATION_007,MIGRATION_008,
            MIGRATION_009,MIGRATION_010,MIGRATION_011,MIGRATION_012,MIGRATION_013
        ];
        for (i,migration) in old.iter().enumerate(){
            let tx=c.unchecked_transaction().unwrap();
            tx.execute_batch(migration).unwrap();
            tx.execute("UPDATE schema_meta SET schema_version=?1 WHERE id=1",
                [(i+1) as i64]).unwrap();
            tx.commit().unwrap();
        }
        c.execute_batch(
          "INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','B past data','now');
           INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value)
              VALUES('i','w','ES',0.25,50);
           INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at)
              VALUES('sess','w','i','2026-11-23','DEMO','now','CLOSED','now','now');
           INSERT INTO candidates(candidate_id,session_id,instrument_id,label,identified_when,created_at)
              VALUES('zone','sess','i','Past level','PRE_SESSION','now');
           INSERT INTO candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,price_mode,change_type)
              VALUES('rev','zone',1,'now','RANGE','CREATE');
           INSERT INTO level_source_types(source_type_id,workspace_id,code,label,source_group)
              VALUES('source','w','SRC','Original','STRUCTURE');
           INSERT INTO candidate_sources(candidate_source_id,candidate_id,candidate_revision_id,source_type_id)
              VALUES('cs','zone','rev','source');").unwrap();
        assert_eq!(schema_version(&c).unwrap(),13);
        c
    }
    #[test]
    fn source_v14_migration_rolls_back_atomically_preserving_v13_original_and_replays(){
        let c=v13_with_source();
        let failed=(||->Result<(),rusqlite::Error>{
            let tx=c.unchecked_transaction()?;
            tx.execute_batch(MIGRATION_014)?;
            tx.execute("INSERT INTO this_intentionally_absent_table VALUES (1)",[])?;
            tx.execute("UPDATE schema_meta SET schema_version=14",[])?;
            tx.commit()
        })();
        assert!(failed.is_err());
        assert_eq!(schema_version(&c).unwrap(),13);
        let created:i64=c.query_row(
          "SELECT COUNT(*) FROM sqlite_master
           WHERE type='table' AND name='candidate_source_type_correction_events'",
          [],|r|r.get(0)).unwrap();
        assert_eq!(created,0);
        assert_eq!(c.query_row("SELECT source_type_id FROM candidate_sources WHERE candidate_source_id='cs'",[],|r|r.get::<_,String>(0)).unwrap(),"source");
        migrate(&c).unwrap();
        assert_eq!(schema_version(&c).unwrap(),14);
        migrate(&c).unwrap();
        assert_eq!(schema_version(&c).unwrap(),14);
        assert_eq!(c.query_row("SELECT source_type_id FROM candidate_sources WHERE candidate_source_id='cs'",[],|r|r.get::<_,String>(0)).unwrap(),"source");
        assert_eq!(integrity_check(&c).unwrap(),"ok");
        assert_eq!(foreign_key_violation_count(&c).unwrap(),0);
    }
}
