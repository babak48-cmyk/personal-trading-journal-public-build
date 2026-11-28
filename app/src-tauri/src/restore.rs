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
    validate_open_archive(&mut zip)
}

fn validate_open_archive(zip: &mut ZipArchive<File>) -> Result<BackupInfo, AppError> {
    let info_bytes = read_entry(zip, "backup_info.json")?;
    let info: BackupInfo = serde_json::from_slice(&info_bytes)?;
    if info.backup_version != 1 { return Err(AppError::Validation("unsupported backup version".into())); }
    let db_bytes = read_entry(zip, "database.sqlite")?;
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
        // Only the documented version-1 payload is allowed. In particular,
        // SQLite WAL/SHM/journal sidecars must never be extracted alongside
        // the hash-verified database before opening it.
        let is_core = path == Path::new("database.sqlite") || path == Path::new("backup_info.json");
        let is_attachment = path.starts_with("attachments")
            && (path != Path::new("attachments") || item.is_dir());
        if !(is_core && !item.is_dir() || is_attachment) {
            return Err(AppError::Validation("unexpected path in backup archive".into()));
        }
        // Windows destination names are case-insensitive.
        if !seen.insert(path.to_string_lossy().to_lowercase()) {
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

// Only a directory newly created by this operation is removed on failure.
pub(crate) struct StagingCleanup(pub(crate) Option<PathBuf>);
impl Drop for StagingCleanup {
    fn drop(&mut self) {
        if let Some(path) = self.0.take() { let _ = fs::remove_dir_all(path); }
    }
}

pub fn restore_to_staging(paths: &AppPaths, backup_path: &Path) -> Result<PathBuf, AppError> {
    // Validate and extract from one open archive, not two independent opens.
    let file = File::open(backup_path)?;
    let mut zip = ZipArchive::new(file)?;
    let info = validate_open_archive(&mut zip)?;
    if info.schema_version > db::CURRENT_SCHEMA_VERSION {
        return Err(AppError::Validation("Backup schema is newer than this application supports".into()));
    }
    // Each operation owns its staging directory. Never erase a previous preview,
    // an interrupted recovery, or a source archive placed in a legacy staging folder.
    let staging = paths.root.join(format!("restore-staging-{}", uuid::Uuid::new_v4()));
    fs::create_dir(&staging)?;
    let mut guard = StagingCleanup(Some(staging.clone()));

    for i in 0..zip.len() {
        let mut entry = zip.by_index(i)?;
        let Some(enclosed) = entry.enclosed_name().map(|p| p.to_owned()) else {
            return Err(AppError::Validation("unsafe path in backup".into()));
        };
        if enclosed == Path::new("backup_info.json") { continue; }
        let output = staging.join(enclosed);
        if entry.is_dir() { fs::create_dir_all(&output)?; continue; }
        if let Some(parent) = output.parent() { fs::create_dir_all(parent)?; }
        let mut out = fs::OpenOptions::new().write(true).create_new(true).open(&output)?;
        std::io::copy(&mut entry, &mut out)?;
        out.flush()?;
    }

    let restored_db = staging.join("database.sqlite");
    if sha256_bytes(&fs::read(&restored_db)?) != info.database_sha256 {
        return Err(AppError::Validation("Extracted database differs from validated archive".into()));
    }
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
    drop(conn);
    guard.0 = None;
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

// Compare complete regular-file inventories and hashes, not merely counts.
// Keep rollback snapshots if verification cannot establish restored identity.
fn attachment_inventory(root: &Path) -> Result<std::collections::BTreeMap<PathBuf,String>,AppError> {
    let mut result=std::collections::BTreeMap::new();
    if !root.exists() { return Ok(result); }
    for entry in walkdir::WalkDir::new(root) {
        let entry=entry.map_err(|e| AppError::Validation(format!("Attachment verification failed: {e}")))?;
        if entry.file_type().is_dir() { continue; }
        if !entry.file_type().is_file() {
            return Err(AppError::Validation("Unsupported attachment file type".into()));
        }
        let rel=entry.path().strip_prefix(root)
            .map_err(|e| AppError::Validation(e.to_string()))?.to_owned();
        result.insert(rel,sha256_bytes(&fs::read(entry.path())?));
    }
    Ok(result)
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
    let _staging_cleanup = StagingCleanup(Some(staging.clone()));
    let staged_db = staging.join("database.sqlite");
    let staged_attachments = staging.join("attachments");

    // 2) Create a verified safety backup of the current live state.
    let safety_backup = crate::backup::create_backup(paths)?;

    // 3) Prepare rollback copies. A UUID prevents a second attempt in the
    // same second from reusing an earlier recovery folder.
    let rollback_root = paths.root.join(format!("restore-rollback-{}", uuid::Uuid::new_v4()));
    fs::create_dir(&rollback_root)?;
    let live_db = paths.database();
    let original_db_existed = live_db.exists();
    let original_attachments_existed = paths.attachments.exists();
    if original_db_existed { fs::copy(&live_db, rollback_root.join("journal.db"))?; }
    if original_attachments_existed { copy_dir_recursive(&paths.attachments, &rollback_root.join("attachments"))?; }
    let original_inventory=attachment_inventory(&paths.attachments)?;
    if attachment_inventory(&rollback_root.join("attachments"))? != original_inventory {
        return Err(AppError::Validation("Rollback attachment snapshot verification failed; live data not replaced".into()));
    }
    let original_db_hash=if original_db_existed { Some(sha256_bytes(&fs::read(&live_db)?)) } else { None };
    if let Some(expected)=&original_db_hash {
        if &sha256_bytes(&fs::read(rollback_root.join("journal.db"))?) != expected {
            return Err(AppError::Validation("Rollback database snapshot verification failed; live data not replaced".into()));
        }
    }
    let staged_inventory=attachment_inventory(&staged_attachments)?;

    let apply_result: Result<String, AppError> = (|| {
        // Replace database file only after staged integrity has passed.
        if let Some(parent) = live_db.parent() { fs::create_dir_all(parent)?; }
        fs::copy(&staged_db, &live_db)?;

        // Replace attachments as a whole so deleted files do not linger from a newer live state.
        if paths.attachments.exists() { fs::remove_dir_all(&paths.attachments)?; }
        fs::create_dir_all(&paths.attachments)?;
        copy_dir_recursive(&staged_attachments, &paths.attachments)?;
        if attachment_inventory(&paths.attachments)? != staged_inventory {
            return Err(AppError::Validation("Restored attachment bytes differ from staged archive".into()));
        }

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
            Ok(RestoreResult {
                restored_from: backup_path.to_string_lossy().to_string(),
                safety_backup: safety_backup.to_string_lossy().to_string(),
                integrity,
                restored_at_utc: Utc::now().to_rfc3339(),
            })
        }
        Err(err) => {
            // A failed replace must restore both the original bytes AND the
            // original existence/absence of the attachment directory.
            // Report rollback failures explicitly and preserve its snapshots.
            let rollback_result = (|| -> Result<(), AppError> {
                let rollback_db = rollback_root.join("journal.db");
                if original_db_existed {
                    fs::copy(&rollback_db, &live_db)?;
                } else if live_db.exists() {
                    fs::remove_file(&live_db)?;
                }
                if paths.attachments.exists() {
                    fs::remove_dir_all(&paths.attachments)?;
                }
                if original_attachments_existed {
                    fs::create_dir_all(&paths.attachments)?;
                    copy_dir_recursive(&rollback_root.join("attachments"), &paths.attachments)?;
                }
                if paths.attachments.exists()!=original_attachments_existed ||
                   attachment_inventory(&paths.attachments)?!=original_inventory {
                    return Err(AppError::Validation("Rollback attachment verification failed".into()));
                }
                if let Some(expected)=&original_db_hash {
                    if &sha256_bytes(&fs::read(&live_db)?)!=expected {
                        return Err(AppError::Validation("Rollback database byte verification failed".into()));
                    }
                    let c=rusqlite::Connection::open_with_flags(&live_db,OpenFlags::SQLITE_OPEN_READ_ONLY)?;
                    if db::integrity_check(&c)?!="ok" || db::foreign_key_violation_count(&c)?>0 {
                        return Err(AppError::Validation("Rollback database integrity verification failed".into()));
                    }
                } else if live_db.exists() {
                    return Err(AppError::Validation("Rollback did not restore original database absence".into()));
                }
                Ok(())
            })();
            match rollback_result {
                Ok(()) => Err(AppError::Validation(format!(
                    "restore failed; destination rollback completed: {err}"
                ))),
                Err(rollback_err) => Err(AppError::Validation(format!(
                    "restore failed: {err}; destination rollback FAILED: {rollback_err}; recovery snapshot retained at {}",
                    rollback_root.display()
                ))),
            }
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
    fn failed_restore_preserves_original_absence_of_attachment_folder(){
        let base=std::env::temp_dir().join(format!("ptj-rollback-absent-{}",uuid::Uuid::new_v4()));
        fn paths(root:PathBuf)->AppPaths{
            let p=AppPaths{data:root.join("data"),attachments:root.join("attachments"),
                backups:root.join("backups"),exports:root.join("exports"),
                logs:root.join("logs"),root};
            for dir in [&p.root,&p.data,&p.backups,&p.exports,&p.logs]{
                fs::create_dir_all(dir).unwrap();
            }
            p
        }
        let source=paths(base.join("source"));
        let destination=paths(base.join("destination"));
        let src_db=db::open_database(&source.database()).unwrap();
        src_db.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);").unwrap();
        drop(src_db);
        fs::create_dir_all(&source.attachments).unwrap();
        fs::write(source.attachments.join("synthetic.png"),b"source screenshot").unwrap();
        let archive=crate::backup::create_backup(&source).unwrap();
        let original_archive=fs::read(&archive).unwrap();
        let dest_db=db::open_database(&destination.database()).unwrap();
        dest_db.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);").unwrap();
        drop(dest_db);
        assert!(!destination.attachments.exists(),"target initially has NO attachments directory");
        let failed=replace_live_from_backup_with_postcheck(&destination,&archive,|_|{
            assert!(destination.attachments.join("synthetic.png").exists(),
                "test reaches postcopy after source attachment extraction");
            Err(AppError::Validation("injected rejection after attachment copy".into()))
        });
        let message=format!("{}",failed.unwrap_err());
        assert!(message.contains("rollback completed"),"recovery result must be truthful: {message}");
        assert!(!destination.attachments.exists(),
            "rollback must remove newly introduced attachments when target had no directory");
        let db_after=db::open_database(&destination.database()).unwrap();
        assert_eq!(db::integrity_check(&db_after).unwrap(),"ok");
        drop(db_after);
        assert_eq!(fs::read(&archive).unwrap(),original_archive,
            "restore must never change the original source backup");
        fs::remove_dir_all(base).unwrap();
    }
    #[test]
    fn validator_rejects_missing_attachment_and_accepts_present_attachment() {
        let root = std::env::temp_dir().join(format!("ptj-archive-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        let fixture=root.join("fixture.sqlite");
        let db_conn=db::open_database(&fixture).unwrap();
        db_conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);").unwrap();
        drop(db_conn);
        let valid_db=fs::read(&fixture).unwrap();
        for include_attachment in [false, true] {
            let path = root.join(if include_attachment { "present.zip" } else { "missing.zip" });
            let file = File::create(&path).unwrap();
            let mut zip = ZipWriter::new(file);
            let options = SimpleFileOptions::default();
            zip.start_file("database.sqlite", options).unwrap();
            zip.write_all(&valid_db).unwrap();
            if include_attachment {
                zip.start_file("attachments/test.png", options).unwrap();
                zip.write_all(b"synthetic-screenshot-test").unwrap();
            }
            let info = BackupInfo {
                backup_version: 1,
                created_at_utc: "2026-11-12T00:00:00Z".into(),
                schema_version: db::CURRENT_SCHEMA_VERSION,
                database_sha256: sha256_bytes(&valid_db),
                attachment_count: 1,
            };
            zip.start_file("backup_info.json", options).unwrap();
            zip.write_all(serde_json::to_string(&info).unwrap().as_bytes()).unwrap();
            zip.finish().unwrap();

            let checked = validate_backup(&path);
            assert_eq!(checked.is_ok(), include_attachment);
        }
        // A forged but internally consistent ZIP+SHA is not a valid SQLite backup.
        // A truthful SQLite file with a false declared schema is also rejected.
        for (name,payload,schema) in [
            ("fake-sqlite.zip",b"not a SQLite database".as_slice(),db::CURRENT_SCHEMA_VERSION),
            ("false-schema.zip",valid_db.as_slice(),db::CURRENT_SCHEMA_VERSION-1),
        ] {
            let file=File::create(root.join(name)).unwrap();
            let mut zip=ZipWriter::new(file);
            zip.start_file("database.sqlite",SimpleFileOptions::default()).unwrap();
            zip.write_all(payload).unwrap();
            let info=BackupInfo {
                backup_version:1,created_at_utc:"2026-11-12T00:00:00Z".into(),
                schema_version:schema,database_sha256:sha256_bytes(payload),attachment_count:0,
            };
            zip.start_file("backup_info.json",SimpleFileOptions::default()).unwrap();
            zip.write_all(serde_json::to_string(&info).unwrap().as_bytes()).unwrap();
            zip.finish().unwrap();
            assert!(validate_backup(&root.join(name)).is_err(),
                "a checksum-consistent corrupt SQLite or schema mismatch cannot report Backup valid");
        }
        // Unexpected sidecars and Windows case-colliding attachments cannot
        // be restored even when the manifest and main DB hash are truthful.
        for (name, entries) in [
            ("sidecar.zip", vec!["database.sqlite-wal"]),
            ("case-collision.zip", vec!["attachments/A.png", "attachments/a.png"]),
        ] {
            let archive=root.join(name);
            let mut zip=ZipWriter::new(File::create(&archive).unwrap());
            let options=SimpleFileOptions::default();
            zip.start_file("database.sqlite",options).unwrap();
            zip.write_all(&valid_db).unwrap();
            for entry in &entries {
                zip.start_file(*entry,options).unwrap();
                zip.write_all(b"unexpected payload").unwrap();
            }
            let info=BackupInfo {
                backup_version:1,created_at_utc:"2026-11-26T00:00:00Z".into(),
                schema_version:db::CURRENT_SCHEMA_VERSION,
                database_sha256:sha256_bytes(&valid_db),
                attachment_count:entries.iter().filter(|p| p.starts_with("attachments/")).count(),
            };
            zip.start_file("backup_info.json",options).unwrap();
            zip.write_all(serde_json::to_string(&info).unwrap().as_bytes()).unwrap();
            zip.finish().unwrap();
            assert!(validate_backup(&archive).is_err(), "{name} must be rejected");
        }
        fs::remove_dir_all(root).unwrap();
    }
}

#[cfg(test)]
mod staging_release_tests {
    use super::*;
    #[test]
    fn repeated_staging_never_removes_previous_stage_or_original_archive() {
        let root=std::env::temp_dir().join(format!("ptj-stage-isolation-{}",uuid::Uuid::new_v4()));
        let paths=AppPaths{data:root.join("data"),attachments:root.join("attachments"),
            backups:root.join("backups"),exports:root.join("exports"),logs:root.join("logs"),root};
        for dir in [&paths.data,&paths.attachments,&paths.backups,&paths.exports,&paths.logs] {
            fs::create_dir_all(dir).unwrap();
        }
        drop(db::open_database(&paths.database()).unwrap());
        let archive=crate::backup::create_backup(&paths).unwrap();
        let legacy=paths.root.join("restore-staging");
        fs::create_dir(&legacy).unwrap();
        let source=legacy.join("original.zip");
        fs::copy(&archive,&source).unwrap();
        let original=fs::read(&source).unwrap();
        let first=restore_to_staging(&paths,&source).unwrap();
        let second=restore_to_staging(&paths,&source).unwrap();
        assert_ne!(first,second);
        assert!(first.join("database.sqlite").is_file());
        assert!(second.join("database.sqlite").is_file());
        assert_eq!(fs::read(&source).unwrap(),original);
        drop(StagingCleanup(Some(second.clone())));
        assert!(!second.exists());
        assert!(first.exists());
        fs::remove_dir_all(&paths.root).unwrap();
    }
}
