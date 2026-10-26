use std::{fs::{self, File}, io::{Read, Write}, path::{Path, PathBuf}};
use chrono::Utc;
use sha2::{Digest, Sha256};
use walkdir::WalkDir;
use zip::{write::SimpleFileOptions, ZipWriter};
use crate::{db, error::AppError, paths::AppPaths};

fn sha256(path: &Path) -> Result<String, AppError> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 64 * 1024];
    loop {
        let n = file.read(&mut buf)?;
        if n == 0 { break; }
        hasher.update(&buf[..n]);
    }
    Ok(hex::encode(hasher.finalize()))
}

pub fn create_backup(paths: &AppPaths) -> Result<PathBuf, AppError> {
    let conn = db::open_database(&paths.database())?;
    let integrity = db::integrity_check(&conn)?;
    if integrity != "ok" { return Err(AppError::Validation(format!("database integrity: {integrity}"))); }
    // Force committed WAL pages into the main database before packaging the file.
    // The app uses a single local database; backups are serialized through this command.
    conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
    drop(conn);

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let output = paths.backups.join(format!("TradingJournal_Backup_{timestamp}.zip"));
    let file = File::create(&output)?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    let db_path = paths.database();
    let db_hash = sha256(&db_path)?;
    zip.start_file("database.sqlite", options)?;
    zip.write_all(&fs::read(&db_path)?)?;

    let mut attachment_count = 0usize;
    if paths.attachments.exists() {
        for entry in WalkDir::new(&paths.attachments).into_iter().filter_map(Result::ok).filter(|e| e.file_type().is_file()) {
            let rel = entry.path().strip_prefix(&paths.root).unwrap_or(entry.path());
            zip.start_file(rel.to_string_lossy().replace('\\', "/"), options)?;
            zip.write_all(&fs::read(entry.path())?)?;
            attachment_count += 1;
        }
    }

    let info = serde_json::json!({
        "backup_version": 1,
        "created_at_utc": Utc::now().to_rfc3339(),
        "schema_version": db::CURRENT_SCHEMA_VERSION,
        "database_sha256": db_hash,
        "attachment_count": attachment_count
    });
    zip.start_file("backup_info.json", options)?;
    zip.write_all(serde_json::to_string_pretty(&info).unwrap().as_bytes())?;
    zip.finish()?;
    Ok(output)
}
