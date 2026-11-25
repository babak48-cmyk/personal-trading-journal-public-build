use std::{fs::{self, File}, io::{Read, Write}, path::{Path, PathBuf}};
use serde::{Deserialize, Serialize};
use chrono::Utc;
use sha2::{Digest, Sha256};
use zip::ZipArchive;
use crate::{db, error::AppError, paths::AppPaths};
use rusqlite::OpenFlags;

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupInfo {
    pub backup_version: u32,
    pub created_at_utc: String,
    pub schema_version: u32,
    pub database_sha256: String,
    pub attachment_count: usize,
}

fn sha256_bytes(data: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(data);
    hex::encode(h.finalize())
}

fn read_entry(zip: &mut ZipArchive<File>, name: &str) -> Result<Vec<u8>, AppError> {
    let mut f = zip.by_name(name)?;
    let mut out = Vec::new();
    f.read_to_end(&mut out)?;
    Ok(out)
}

// Read-only SQLite verification in a separate, uniquely named TEMP file.
// Never open the user's live database or migrate the archived database to
// verify a backup. The complete archive bytes are already hash-checked.
struct TemporaryValidationDatabase(PathBuf);
impl Drop for TemporaryValidationDatabase {
    fn drop(&mut self) { let _ = fs::remove_file(&self.0); }
}
fn validate_archived_sqlite(db_bytes:&[u8], declared_schema:u32)->Result<(),AppError> {
    let temp=std::env::temp_dir().join(format!("ptj-backup-verify-{}.sqlite",uuid::Uuid::new_v4()));
    let mut out=fs::OpenOptions::new().write(true).create_new(true).open(&temp)?;
    let guard=TemporaryValidationDatabase(temp);
    out.write_all(db_bytes)?;
    out.flush()?;
    drop(out);
    let conn=rusqlite::Connection::open_with_flags(
        &guard.0, OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX)?;
    if db::integrity_check(&conn)?!="ok" {
        return Err(AppError::Validation("archived SQLite database failed integrity check".into()));
    }
    if db::foreign_key_violation_count(&conn)?>0 {
        return Err(AppError::Validation("archived SQLite database has foreign key violations".into()));
    }
    if db::schema_version(&conn)?!=declared_schema {
        return Err(AppError::Validation("backup manifest schema differs from archived SQLite schema".into()));
    }
    Ok(())
}

pub fn validate_backup(path: &Path) -> Result<BackupInfo, AppError> {
    let file = File::open(path)?;
    let mut zip = ZipArchive::new(file)?;
    let info_bytes = read_entry(&mut zip, "backup_info.json")?;
    let info: BackupInfo = serde_json::from_slice(&info_bytes)?;
    if info.backup_version != 1 { return Err(AppError::Validation("unsupported backup version".into())); }
    let db_bytes = read_entry(&mut zip, "database.sqlite")?;
    if sha256_bytes(&db_bytes) != info.database_sha256 {
        return Err(AppError::Validation("database checksum mismatch".into()));
    }
    // Read every attachment so ZIP CRC/read errors surface before a backup is trusted.
    // Existing backup_version=1 remains compatible; no migration or manifest format change.
    let mut seen = std::collections::HashSet::new();
    let mut actual_attachments = 0usize;
    for index in 0..zip.len() {
        let mut item = zip.by_index(index)?;
        let path = item.enclosed_name().ok_or_else(|| AppError::Validation(
            "unsafe path in backup archive".into()
        ))?.to_owned();
        if !seen.insert(path.clone()) {
            return Err(AppError::Validation("duplicate path in backup archive".into()));
        }
        if !item.is_dir() && path.starts_with("attachments") {
            let mut sink = std::io::sink();
            std::io::copy(&mut item, &mut sink)?;
            actual_attachments += 1;
        }
    }
    if actual_attachments != info.attachment_count {
        return Err(AppError::Validation(format!(
            "backup attachment count mismatch: expected {}, found {}",
            info.attachment_count, actual_attachments
        )));
    }
    validate_archived_sqlite(&db_bytes,info.schema_version)?;
    Ok(info)
}

pub fn restore_to_staging(paths: &AppPaths, backup_path: &Path) -> Result<PathBuf, AppError> {
    let _info = validate_backup(backup_path)?;
    let staging = paths.root.join("restore-staging");
    if staging.exists() { fs::remove_dir_all(&staging)?; }
    fs::create_dir_all(&staging)?;

    let file = File::open(backup_path)?;
    let mut zip = ZipArchive::new(file)?;
    for i in 0..zip.len() {
        let mut entry = zip.by_index(i)?;
        let Some(enclosed) = entry.enclosed_name().map(|p| p.to_owned()) else {
            return Err(AppError::Validation("unsafe path in backup".into()));
        };
        if enclosed == Path::new("backup_info.json") { continue; }
        let output = staging.join(enclosed);
        if entry.is_dir() { fs::create_dir_all(&output)?; continue; }
        if let Some(parent) = output.parent() { fs::create_dir_all(parent)?; }
        let mut out = File::create(&output)?;
        std::io::copy(&mut entry, &mut out)?;
        out.flush()?;
    }

    let restored_db = staging.join("database.sqlite");
    let conn = db::open_database(&restored_db)?;
    let integrity = db::integrity_check(&conn)?;
    if integrity != "ok" { return Err(AppError::Validation(format!("restored database integrity: {integrity}"))); }
    if db::foreign_key_violation_count(&conn)? > 0 {
        return Err(AppError::Validation("restored database foreign key violation".into()));
    }
    crate::fill_corrections::verify_all_correction_chains(&conn)?;
    crate::initial_risk_corrections::verify_all_initial_risk_correction_chains(&conn)?;
    crate::source_type_corrections::verify_all_source_correction_chains(&conn)?;
    crate::source_price_corrections::verify_all(&conn)?;
    Ok(staging)
}


#[derive(Debug, Serialize)]
pub struct RestoreResult {
    pub restored_from: String,
    pub safety_backup: String,
    pub integrity: String,
    pub restored_at_utc: String,
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), AppError> {
    if !src.exists() { return Ok(()); }
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let target = dst.join(entry.file_name());
        if ty.is_dir() { copy_dir_recursive(&entry.path(), &target)?; }
        else if ty.is_file() { fs::copy(entry.path(), target)?; }
    }
    Ok(())
}

pub fn replace_live_from_backup(paths: &AppPaths, backup_path: &Path) -> Result<RestoreResult, AppError> {
    replace_live_from_backup_with_postcheck(paths,backup_path,|_|Ok(()))
}

/// The postcheck runs *before* success is committed and before the rollback
/// snapshot is removed. Package C transfer can therefore reject a post-copy
/// inventory mismatch without leaving a half-accepted destination.
pub fn replace_live_from_backup_with_postcheck<F>(
    paths: &AppPaths, backup_path: &Path, postcheck:F
) -> Result<RestoreResult,AppError>
where F:FnOnce(&rusqlite::Connection)->Result<(),AppError> {
    // 1) Validate and unpack before touching live data.
    let staging = restore_to_staging(paths, backup_path)?;
    let staged_db = staging.join("database.sqlite");
    let staged_attachments = staging.join("attachments");

    // 2) Create a verified safety backup of the current live state.
    let safety_backup = crate::backup::create_backup(paths)?;

    // 3) Prepare rollback copies. These are local filesystem snapshots used only during the replace operation.
    let rollback_root = paths.root.join(format!("restore-rollback-{}", Utc::now().format("%Y%m%d_%H%M%S")));
    fs::create_dir_all(&rollback_root)?;
    let live_db = paths.database();
    if live_db.exists() { fs::copy(&live_db, rollback_root.join("journal.db"))?; }
    if paths.attachments.exists() { copy_dir_recursive(&paths.attachments, &rollback_root.join("attachments"))?; }

    let apply_result: Result<String, AppError> = (|| {
        // Replace database file only after staged integrity has passed.
        if let Some(parent) = live_db.parent() { fs::create_dir_all(parent)?; }
        fs::copy(&staged_db, &live_db)?;

        // Replace attachments as a whole so deleted files do not linger from a newer live state.
        if paths.attachments.exists() { fs::remove_dir_all(&paths.attachments)?; }
        fs::create_dir_all(&paths.attachments)?;
        copy_dir_recursive(&staged_attachments, &paths.attachments)?;

        // Re-open using normal application initialization/migration rules and verify integrity again.
        let conn = db::open_database(&live_db)?;
        let integrity = db::integrity_check(&conn)?;
        if integrity != "ok" { return Err(AppError::Validation(format!("live database integrity after restore: {integrity}"))); }
        if db::foreign_key_violation_count(&conn)?>0 {
            return Err(AppError::Validation("live database foreign keys failed after restore".into()));
        }
        // Validate again on the ACTUAL installed copy, not just on staging.
        // Errors here trigger the existing rollback, instead of returning a
        // misleading successful Restore result.
        crate::fill_corrections::verify_all_correction_chains(&conn)?;
        crate::initial_risk_corrections::verify_all_initial_risk_correction_chains(&conn)?;
        crate::source_type_corrections::verify_all_source_correction_chains(&conn)?;
        crate::source_price_corrections::verify_all(&conn)?;
        postcheck(&conn)?;
        Ok(integrity)
    })();

    match apply_result {
        Ok(integrity) => {
            let _ = fs::remove_dir_all(&rollback_root);
            let _ = fs::remove_dir_all(&staging);
            Ok(RestoreResult {
                restored_from: backup_path.to_string_lossy().to_string(),
                safety_backup: safety_backup.to_string_lossy().to_string(),
                integrity,
                restored_at_utc: Utc::now().to_rfc3339(),
            })
        }
        Err(err) => {
            // Best-effort rollback. Keep rollback folder if anything goes wrong so manual recovery remains possible.
            let rollback_db = rollback_root.join("journal.db");
            if rollback_db.exists() { let _ = fs::copy(&rollback_db, &live_db); }
            let rollback_att = rollback_root.join("attachments");
            if rollback_att.exists() {
                let _ = fs::remove_dir_all(&paths.attachments);
                let _ = fs::create_dir_all(&paths.attachments);
                let _ = copy_dir_recursive(&rollback_att, &paths.attachments);
            }
            Err(AppError::Validation(format!("restore failed and rollback was attempted: {err}")))
        }
    }
}

#[cfg(test)]
mod backup_integrity_tests {
    use super::*;
    use zip::{write::SimpleFileOptions, ZipWriter};

    #[test]
    fn failing_final_postcopy_check_rolls_back_existing_target_and_preserves_original_archive(){
        let root=std::env::temp_dir().join(format!("ptj-post-restore-rollback-{}",uuid::Uuid::new_v4()));
        fn fixture(root:PathBuf)->AppPaths{
            let paths=AppPaths{
                data:root.join("data"),attachments:root.join("attachments"),
                backups:root.join("backups"),exports:root.join("exports"),logs:root.join("logs"),root
            };
            for dir in [&paths.root,&paths.data,&paths.attachments,&paths.backups,&paths.exports,&paths.logs]{
                fs::create_dir_all(dir).unwrap();
            }
            paths
        }
        let source=fixture(root.join("source"));
        let target=fixture(root.join("target"));
        let source_conn=db::open_database(&source.database()).unwrap();
        source_conn.execute_batch(
          "INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','Synthetic','now');
           INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value)
           VALUES('i','w','ES',0.25,50);
           INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at)
           VALUES('src-session','w','i','2026-11-23','DEMO','now','CLOSED','now','now');"
        ).unwrap();
        drop(source_conn);
        let archive=crate::backup::create_backup(&source).unwrap();
        let archive_before=fs::read(&archive).unwrap();
        let target_conn=db::open_database(&target.database()).unwrap();
        assert_eq!(target_conn.query_row("SELECT COUNT(*) FROM sessions",[],|r|r.get::<_,i64>(0)).unwrap(),0);
        drop(target_conn);
        let outcome=replace_live_from_backup_with_postcheck(&target,&archive,|installed|{
            let n:i64=installed.query_row("SELECT COUNT(*) FROM sessions",[],|r|r.get(0))?;
            assert_eq!(n,1,"postcheck must see the installed copy, not the original target");
            Err(AppError::Validation("injected post-copy verification failure".into()))
        });
        assert!(outcome.is_err(),"post-copy failure cannot become a SUCCESS receipt");
        let reopened=db::open_database(&target.database()).unwrap();
        assert_eq!(reopened.query_row("SELECT COUNT(*) FROM sessions",[],|r|r.get::<_,i64>(0)).unwrap(),0,
            "previous destination must survive a failed post-restore verification");
        assert_eq!(db::integrity_check(&reopened).unwrap(),"ok");
        drop(reopened);
        assert_eq!(fs::read(&archive).unwrap(),archive_before,"original backup must remain byte-identical");
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn validator_rejects_missing_attachment_and_accepts_present_attachment() {
        let root = std::env::temp_dir().join(format!("ptj-archive-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        for include_attachment in [false, true] {
            let path = root.join(if include_attachment { "present.zip" } else { "missing.zip" });
            let file = File::create(&path).unwrap();
            let mut zip = ZipWriter::new(file);
            let options = SimpleFileOptions::default();
            zip.start_file("database.sqlite", options).unwrap();
            zip.write_all(b"synthetic-database-test").unwrap();
            if include_attachment {
                zip.start_file("attachments/test.png", options).unwrap();
                zip.write_all(b"synthetic-screenshot-test").unwrap();
            }
            let info = BackupInfo {
                backup_version: 1,
                created_at_utc: "2026-11-12T00:00:00Z".into(),
                schema_version: 1,
                database_sha256: sha256_bytes(b"synthetic-database-test"),
                attachment_count: 1,
            };
            zip.start_file("backup_info.json", options).unwrap();
            zip.write_all(serde_json::to_string(&info).unwrap().as_bytes()).unwrap();
            zip.finish().unwrap();

            let checked = validate_backup(&path);
            assert_eq!(checked.is_ok(), include_attachment);
        }
        fs::remove_dir_all(root).unwrap();
    }
}
