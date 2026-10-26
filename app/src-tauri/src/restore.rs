use std::{fs::{self, File}, io::{Read, Write}, path::{Path, PathBuf}};
use serde::{Deserialize, Serialize};
use chrono::Utc;
use sha2::{Digest, Sha256};
use zip::ZipArchive;
use crate::{db, error::AppError, paths::AppPaths};

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
