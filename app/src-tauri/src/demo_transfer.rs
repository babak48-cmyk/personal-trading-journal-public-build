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
pub fn preview(paths:&AppPaths,archive:&Path)->Result<DemoTransferPreview,AppError>{
    ensure_empty_target(paths)?;
    let info=restore::validate_backup(archive)?;
    if !(10..=db::CURRENT_SCHEMA_VERSION).contains(&info.schema_version){
        return Err(AppError::Validation("Unsupported prior DEMO backup schema version".into()));
    }
    let staged=restore::restore_to_staging(paths,archive)?;
    let c=db::open_database(&staged.join("database.sqlite"))?;
    let live_count:i64=c.query_row("SELECT COUNT(*) FROM sessions WHERE UPPER(environment)='LIVE'",[],|r|r.get(0))?;
    if live_count>0 {
        return Err(AppError::Validation("Source contains LIVE sessions. Only isolated test data transfer is permitted".into()));
    }
    if db::integrity_check(&c)?!="ok"||db::foreign_key_violation_count(&c)?>0{
        return Err(AppError::Validation("Migrated staged journal failed integrity verification".into()));
    }
    crate::fill_corrections::verify_all_correction_chains(&c)?;
    Ok(DemoTransferPreview{
        source_schema_version:info.schema_version,
        target_schema_version:db::schema_version(&c)?,
        database_sha256:info.database_sha256,
        sessions:count(&c,"sessions")?,trades:count(&c,"trades")?,
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
       count(&c,"execution_fills")?!=confirmed.fills||
       count(&c,"trade_reviews")?!=confirmed.reviews||
       count(&c,"fill_correction_events")?!=confirmed.correction_events {
         return Err(AppError::Validation("Destination record counts could not be reconciled after import; inspect safety backup before retrying".into()));
    }
    crate::fill_corrections::verify_all_correction_chains(&c)?;
    Ok(receipt)
}
