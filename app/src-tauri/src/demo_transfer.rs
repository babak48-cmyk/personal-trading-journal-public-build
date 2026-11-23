//! Explicit one-way Package B DEMO backup transfer into an EMPTY, distinct
//! Package C DEMO profile. Never touches the original Package B app directory.
use std::path::Path;
use rusqlite::{Connection,OptionalExtension};
use serde::Serialize;
use crate::{backup,db,error::AppError,paths::AppPaths,restore};

#[derive(Debug,Serialize)]
pub struct DemoTransferPreview {
    pub source_schema_version:u32,
    pub target_schema_version:u32,
    pub database_sha256:String,
    pub sessions:i64,
    pub trades:i64,
    pub zones:i64,
    pub decisions:i64,
    pub plan_revisions:i64,
    pub evidence_events:i64,
    pub risk_snapshots:i64,
    pub fills:i64,
    pub reviews:i64,
    pub correction_events:i64,
    pub attachments:usize,
    pub original_backup_untouched:bool,
}

fn count(conn:&Connection,table:&str)->Result<i64,AppError>{
    // Only static table names owned by this module. Never compose from UI.
    let sql=match table{
        "sessions"=>"SELECT COUNT(*) FROM sessions",
        "trades"=>"SELECT COUNT(*) FROM trades",
        "candidates"=>"SELECT COUNT(*) FROM candidates",
        "candidate_decisions"=>"SELECT COUNT(*) FROM candidate_decisions",
        "session_plan_revisions"=>"SELECT COUNT(*) FROM session_plan_revisions",
        "evidence_observations"=>"SELECT COUNT(*) FROM evidence_observations",
        "risk_snapshots"=>"SELECT COUNT(*) FROM risk_snapshots",
        "execution_fills"=>"SELECT COUNT(*) FROM execution_fills",
        "trade_reviews"=>"SELECT COUNT(*) FROM trade_reviews",
        "fill_correction_events"=>"SELECT COUNT(*) FROM fill_correction_events",
        "weekly_learning_action_events"=>"SELECT COUNT(*) FROM weekly_learning_action_events",
        _=>return Err(AppError::Validation("invalid transfer inventory table".into())),
    };
    Ok(conn.query_row(sql,[],|r|r.get(0))?)
}
fn ensure_empty_target(paths:&AppPaths)->Result<(),AppError>{
    let conn=db::open_database(&paths.database())?;
    if count(&conn,"sessions")?>0||count(&conn,"trades")?>0||
       count(&conn,"execution_fills")?>0||count(&conn,"trade_reviews")?>0||
       count(&conn,"fill_correction_events")?>0||
       count(&conn,"weekly_learning_action_events")?>0 {
       return Err(AppError::Validation(
         "Package C destination has journal data. Transfer only to an empty, separate DEMO profile; no overwrite permitted.".into()));
    }
    if paths.attachments.exists()&&
       std::fs::read_dir(&paths.attachments)?.next().is_some(){
       return Err(AppError::Validation("Package C destination already has attachments; transfer refused".into()));
    }
    Ok(())
}
fn require_test_sessions(conn:&Connection)->Result<(),AppError>{
    let non_test:i64=conn.query_row(
       "SELECT COUNT(*) FROM sessions WHERE UPPER(environment) IN ('REAL','LIVE')",
       [],|r|r.get(0))?;
    if non_test>0{
        return Err(AppError::Validation("Source contains REAL sessions. Only isolated DEMO/FORWARD_TEST records may be transferred".into()));
    }
    Ok(())
}
pub fn preview(paths:&AppPaths,archive:&Path)->Result<DemoTransferPreview,AppError>{
    ensure_empty_target(paths)?;
    let info=restore::validate_backup(archive)?;
    if !(10..=db::CURRENT_SCHEMA_VERSION).contains(&info.schema_version){
        return Err(AppError::Validation("Unsupported prior DEMO backup schema version".into()));
    }
    let staged=restore::restore_to_staging(paths,archive)?;
    let c=db::open_database(&staged.join("database.sqlite"))?;
    let staged_schema=db::schema_version(&c)?;
    if staged_schema!=db::CURRENT_SCHEMA_VERSION{
        return Err(AppError::Validation("Staged test archive schema is not supported by this Package C build".into()));
    }
    require_test_sessions(&c)?;
    if db::integrity_check(&c)?!="ok"||db::foreign_key_violation_count(&c)?>0{
        return Err(AppError::Validation("Migrated staged journal failed integrity verification".into()));
    }
    crate::fill_corrections::verify_all_correction_chains(&c)?;
    crate::initial_risk_corrections::verify_all_initial_risk_correction_chains(&c)?;
    crate::source_type_corrections::verify_all_source_correction_chains(&c)?;
    Ok(DemoTransferPreview{
        source_schema_version:info.schema_version,
        target_schema_version:staged_schema,
        database_sha256:info.database_sha256,
        sessions:count(&c,"sessions")?,trades:count(&c,"trades")?,
        zones:count(&c,"candidates")?,decisions:count(&c,"candidate_decisions")?,
        plan_revisions:count(&c,"session_plan_revisions")?,
        evidence_events:count(&c,"evidence_observations")?,
        risk_snapshots:count(&c,"risk_snapshots")?,
        fills:count(&c,"execution_fills")?,reviews:count(&c,"trade_reviews")?,
        correction_events:count(&c,"fill_correction_events")?,
        attachments:info.attachment_count,
        original_backup_untouched:true,
    })
}

pub fn import_into_empty(paths:&AppPaths,archive:&Path,expected_sha:&str)
 ->Result<restore::RestoreResult,AppError>{
    if expected_sha.len()!=64 {
        return Err(AppError::Validation("Full 64-character preflight database hash required".into()));
    }
    let confirmed=preview(paths,archive)?;
    if confirmed.database_sha256!=expected_sha{
        return Err(AppError::Validation("Source backup changed after preview; import cancelled".into()));
    }
    // This only changes the separate Package C destination. Existing restore
    // creates its own safety backup, rollback folder, and rechecks staged DB.
    let receipt=restore::replace_live_from_backup(paths,archive)?;
    let c=db::open_database(&paths.database())?;
    if db::integrity_check(&c)?!="ok"||db::foreign_key_violation_count(&c)?>0||
       count(&c,"sessions")?!=confirmed.sessions||
       count(&c,"trades")?!=confirmed.trades||
       count(&c,"candidates")?!=confirmed.zones||
       count(&c,"candidate_decisions")?!=confirmed.decisions||
       count(&c,"session_plan_revisions")?!=confirmed.plan_revisions||
       count(&c,"evidence_observations")?!=confirmed.evidence_events||
       count(&c,"risk_snapshots")?!=confirmed.risk_snapshots||
       count(&c,"execution_fills")?!=confirmed.fills||
       count(&c,"trade_reviews")?!=confirmed.reviews||
       count(&c,"fill_correction_events")?!=confirmed.correction_events {
         return Err(AppError::Validation("Destination record counts could not be reconciled after import; inspect safety backup before retrying".into()));
    }
    crate::fill_corrections::verify_all_correction_chains(&c)?;
    crate::initial_risk_corrections::verify_all_initial_risk_correction_chains(&c)?;
    crate::source_type_corrections::verify_all_source_correction_chains(&c)?;
    Ok(receipt)
}

#[cfg(test)]
mod isolated_transfer_tests {
    use super::*;
    use std::{fs::{self,File},io::Write};
    use sha2::{Digest,Sha256};
    use zip::{ZipWriter,write::SimpleFileOptions};
    use uuid::Uuid;
    fn target_paths(root:&Path)->AppPaths{
        let paths=AppPaths{
          root:root.to_owned(),data:root.join("data"),
          attachments:root.join("attachments"),backups:root.join("backups"),
          exports:root.join("exports"),logs:root.join("logs"),
        };
        for dir in [&paths.root,&paths.data,&paths.attachments,&paths.backups,&paths.exports,&paths.logs]{
            fs::create_dir_all(dir).unwrap();
        }
        paths
    }
    #[test]
    fn demo_import_refuses_real_money_session_classification(){
        let c=Connection::open_in_memory().unwrap();
        c.execute_batch("CREATE TABLE sessions(environment TEXT NOT NULL);
          INSERT INTO sessions VALUES('DEMO'),('FORWARD_TEST');").unwrap();
        assert!(require_test_sessions(&c).is_ok());
        c.execute("INSERT INTO sessions VALUES('REAL')",[]).unwrap();
        assert!(require_test_sessions(&c).is_err());
    }
    #[test]
    fn copies_package_b_v11_test_history_into_empty_v12_demo_without_touching_source(){
        let base=std::env::temp_dir().join(format!("ptj-bc-copy-{}",Uuid::new_v4()));
        let source=base.join("old-b");
        let new_c=target_paths(&base.join("new-package-c"));
        fs::create_dir_all(&source).unwrap();
        let old_path=source.join("journal.db");
        let c=db::open_database(&old_path).unwrap();
        c.execute_batch(
          "INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','Synthetic B','2026-11-22');
           INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value)
             VALUES('i','w','ES',0.25,50);
           INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at)
             VALUES('s','w','i','2026-11-22','DEMO','2026-11-22','ACTIVE','2026-11-22','2026-11-22');
           INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type,intended_direction)
             VALUES ('d1','s','2026-11-22T08:00:00Z','TRADE','LONG'),
                    ('d2','s','2026-11-22T10:00:00Z','TRADE','LONG');
           INSERT INTO trades(trade_id,decision_id,session_id,direction,status)
             VALUES ('t1','d1','s','LONG','CLOSED'),('t2','d2','s','LONG','CLOSED');
           INSERT INTO execution_fills(execution_id,trade_id,occurred_at,action,side,price,quantity,commission,fees)
             VALUES ('f1','t1','2026-11-22T08:01:00Z','ENTRY','BUY',6961,2,4,0),
                    ('f2','t1','2026-11-22T08:02:00Z','EXIT','SELL',6963,1,2,0),
                    ('f3','t1','2026-11-22T08:03:00Z','EXIT','SELL',6965,1,2,0),
                    ('f4','t2','2026-11-22T10:01:00Z','ENTRY','BUY',6961,1,2,0),
                    ('f5','t2','2026-11-22T10:02:00Z','EXIT','SELL',6959,1,2,0);
           INSERT INTO risk_snapshots(risk_snapshot_id,trade_id,occurred_at,snapshot_type,stop_price,quantity,risk_dollars)
             VALUES('r1','t1','2026-11-22T08:01:00Z','INITIAL',6959,2,200),
                   ('r2','t2','2026-11-22T10:01:00Z','INITIAL',6959,1,100);
           INSERT INTO trade_reviews(review_id,trade_id,status,created_at,updated_at,completed_at,decision_quality)
             VALUES ('review1','t1','COMPLETED','2026-11-22','2026-11-22','2026-11-22','C'),
                    ('review2','t2','COMPLETED','2026-11-22','2026-11-22','2026-11-22','A');
           DROP TABLE weekly_learning_action_events;
           DROP TABLE initial_risk_correction_events;
           UPDATE schema_meta SET schema_version=11;
           PRAGMA wal_checkpoint(TRUNCATE);"
        ).unwrap();
        assert_eq!(db::schema_version(&c).unwrap(),11);
        assert_eq!(db::integrity_check(&c).unwrap(),"ok");
        drop(c);
        let old_bytes=fs::read(&old_path).unwrap();
        let old_hash=hex::encode(Sha256::digest(&old_bytes));
        let backup=source.join("B-TEST-history.zip");
        let mut zip=ZipWriter::new(File::create(&backup).unwrap());
        let options=SimpleFileOptions::default();
        zip.start_file("database.sqlite",options).unwrap();zip.write_all(&old_bytes).unwrap();
        zip.start_file("attachments/example.txt",options).unwrap();zip.write_all(b"saved B attachment").unwrap();
        zip.start_file("backup_info.json",options).unwrap();
        zip.write_all(serde_json::json!({
          "backup_version":1,"created_at_utc":"2026-11-22T12:00:00Z",
          "schema_version":11,"database_sha256":old_hash,"attachment_count":1
        }).to_string().as_bytes()).unwrap();
        zip.finish().unwrap();
        let backup_bytes=fs::read(&backup).unwrap();
        let observed=preview(&new_c,&backup).unwrap();
        assert_eq!(observed.source_schema_version,11);
        assert_eq!(observed.target_schema_version,13);
        assert_eq!((observed.sessions,observed.trades,observed.fills,observed.reviews,observed.attachments),(1,2,5,2,1));
        assert_eq!(observed.decisions,2);
        assert_eq!(observed.risk_snapshots,2);
        assert_eq!(observed.zones,0);
        assert_eq!(observed.plan_revisions,0);
        assert_eq!(observed.evidence_events,0);
        let receipt=import_into_empty(&new_c,&backup,&observed.database_sha256).unwrap();
        assert_eq!(receipt.integrity,"ok");
        assert_eq!(fs::read(&backup).unwrap(),backup_bytes,"old source ZIP must stay byte-identical");
        assert_eq!(fs::read(&old_path).unwrap(),old_bytes,"old Package B SQLite must stay byte-identical");
        let restored=db::open_database(&new_c.database()).unwrap();
        assert_eq!(db::schema_version(&restored).unwrap(),13);
        let first=crate::repository::get_trade_detail(&restored,"t1").unwrap();
        let second=crate::repository::get_trade_detail(&restored,"t2").unwrap();
        assert!((first.metrics.realized_r.unwrap()-1.46).abs()<0.00001);
        assert!((second.metrics.realized_r.unwrap()+1.04).abs()<0.00001);
        let reviews:Vec<String>={
          let mut q=restored.prepare("SELECT decision_quality FROM trade_reviews ORDER BY trade_id").unwrap();
          q.query_map([],|r|r.get(0)).unwrap().map(Result::unwrap).collect()
        };
        assert_eq!(reviews,vec!["C","A"]);
        assert_eq!(fs::read(new_c.attachments.join("example.txt")).unwrap(),b"saved B attachment");
        assert!(import_into_empty(&new_c,&backup,&observed.database_sha256).is_err(),
               "a destination with B history cannot be silently overwritten");
        drop(restored);
        fs::remove_dir_all(base).unwrap();
    }
}
