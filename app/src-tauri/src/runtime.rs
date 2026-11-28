use std::{fs::{self, OpenOptions}, io::Write, path::{Path, PathBuf}, time::SystemTime};
use chrono::Utc;
use serde::Serialize;
use walkdir::WalkDir;
use crate::{db, error::AppError, paths::AppPaths};

#[derive(Debug, Serialize)]
pub struct RuntimeReadiness {
    pub schema_version: u32,
    pub integrity: String,
    pub foreign_key_violations: u64,
    pub database_path: String,
    pub database_size_bytes: u64,
    pub data_path: String,
    pub attachments_path: String,
    pub backups_path: String,
    pub exports_path: String,
    pub data_writable: bool,
    pub attachments_writable: bool,
    pub backups_writable: bool,
    pub exports_writable: bool,
    pub attachment_file_count: usize,
    pub backup_count: usize,
    pub latest_backup_path: Option<String>,
    pub latest_backup_age_hours: Option<f64>,
    pub warnings: Vec<String>,
    pub ready_for_live_data: bool,
}

fn dir_writable(path: &Path) -> bool {
    if fs::create_dir_all(path).is_err() { return false; }
    let probe = path.join(format!(".write_probe_{}.tmp", Utc::now().timestamp_nanos_opt().unwrap_or_default()));
    let result = OpenOptions::new().create_new(true).write(true).open(&probe)
        .and_then(|mut f| f.write_all(b"ok"));
    let _ = fs::remove_file(&probe);
    result.is_ok()
}

fn file_count(path: &Path) -> usize {
    if !path.exists() { return 0; }
    WalkDir::new(path).into_iter().filter_map(Result::ok).filter(|e| e.file_type().is_file()).count()
}

fn backup_files(path: &Path) -> Vec<PathBuf> {
    let mut files: Vec<PathBuf> = match fs::read_dir(path) {
        Ok(rd) => rd.filter_map(Result::ok).map(|e| e.path())
            .filter(|p| p.extension().and_then(|x| x.to_str()).map(|x| x.eq_ignore_ascii_case("zip")).unwrap_or(false))
            .collect(),
        Err(_) => vec![],
    };
    files.sort_by_key(|p| fs::metadata(p).and_then(|m| m.modified()).ok());
    files
}

fn age_hours(path: &Path) -> Option<f64> {
    let modified = fs::metadata(path).ok()?.modified().ok()?;
    let now = SystemTime::now();
    let seconds = now.duration_since(modified).ok()?.as_secs_f64();
    Some(seconds / 3600.0)
}

pub fn readiness(paths: &AppPaths) -> Result<RuntimeReadiness, AppError> {
    let conn = db::open_database(&paths.database())?;
    let schema_version = db::schema_version(&conn)?;
    let integrity = db::integrity_check(&conn)?;
    let foreign_key_violations = db::foreign_key_violation_count(&conn)?;
    drop(conn);

    let database_size_bytes = fs::metadata(paths.database()).map(|m| m.len()).unwrap_or(0);
    let data_writable = dir_writable(&paths.data);
    let attachments_writable = dir_writable(&paths.attachments);
    let backups_writable = dir_writable(&paths.backups);
    let exports_writable = dir_writable(&paths.exports);
    let attachment_file_count = file_count(&paths.attachments);
    let backups = backup_files(&paths.backups);
    // A ZIP extension is not evidence of a usable recovery copy.
    // Check newest-first; retain older valid backups as fallback.
    let latest = backups.iter().rev()
        .find(|p| crate::restore::validate_backup(p).is_ok()).cloned();
    let latest_backup_age_hours = latest.as_ref().and_then(|p| age_hours(p));

    let mut warnings = Vec::new();
    if integrity != "ok" { warnings.push(format!("Database integrity check returned: {integrity}")); }
    if foreign_key_violations > 0 { warnings.push(format!("{foreign_key_violations} foreign-key violation(s) found")); }
    if schema_version != db::CURRENT_SCHEMA_VERSION { warnings.push(format!("Schema version {schema_version} does not match expected {}", db::CURRENT_SCHEMA_VERSION)); }
    if !data_writable { warnings.push("Data folder is not writable".into()); }
    if !attachments_writable { warnings.push("Attachments folder is not writable".into()); }
    if !backups_writable { warnings.push("Backup folder is not writable".into()); }
    if !exports_writable { warnings.push("Export folder is not writable".into()); }
    if latest.is_none() { warnings.push("No verified local backup exists yet".into()); }
    if backups.last().is_some() && backups.last() != latest.as_ref() {
        warnings.push("Newest backup failed validation; older verified backup may be available".into());
    }
    if let Some(age) = latest_backup_age_hours { if age > 72.0 { warnings.push(format!("Latest backup is {:.0} hours old", age)); } }

    let core_ok = integrity == "ok"
        && foreign_key_violations == 0
        && schema_version == db::CURRENT_SCHEMA_VERSION
        && data_writable && attachments_writable && backups_writable && exports_writable;
    let ready_for_live_data = core_ok && latest.is_some();

    Ok(RuntimeReadiness {
        schema_version,
        integrity,
        foreign_key_violations,
        database_path: paths.database().to_string_lossy().to_string(),
        database_size_bytes,
        data_path: paths.data.to_string_lossy().to_string(),
        attachments_path: paths.attachments.to_string_lossy().to_string(),
        backups_path: paths.backups.to_string_lossy().to_string(),
        exports_path: paths.exports.to_string_lossy().to_string(),
        data_writable,
        attachments_writable,
        backups_writable,
        exports_writable,
        attachment_file_count,
        backup_count: backups.len(),
        latest_backup_path: latest.as_ref().map(|p| p.to_string_lossy().to_string()),
        latest_backup_age_hours,
        warnings,
        ready_for_live_data,
    })
}

#[cfg(test)]
mod release_readiness_tests {
    use super::*;
    #[test]
    fn corrupt_zip_does_not_establish_recovery_readiness() {
        let root=std::env::temp_dir().join(format!("ptj-readiness-{}",uuid::Uuid::new_v4()));
        let paths=AppPaths{data:root.join("data"),attachments:root.join("attachments"),
            backups:root.join("backups"),exports:root.join("exports"),logs:root.join("logs"),root};
        for dir in [&paths.data,&paths.attachments,&paths.backups,&paths.exports,&paths.logs] {
            fs::create_dir_all(dir).unwrap();
        }
        fs::write(paths.backups.join("invalid.zip"), b"not a backup").unwrap();
        let first=readiness(&paths).unwrap();
        assert!(!first.ready_for_live_data);
        assert!(first.latest_backup_path.is_none());
        assert_eq!(first.backup_count,1);
        let good=crate::backup::create_backup(&paths).unwrap();
        let next=readiness(&paths).unwrap();
        assert!(next.ready_for_live_data);
        assert_eq!(next.latest_backup_path.as_deref(),good.to_str());
        assert_eq!(next.backup_count,2);
        fs::remove_dir_all(&paths.root).unwrap();
    }
}
