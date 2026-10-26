use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};
use crate::error::AppError;

#[derive(Clone, Debug)]
pub struct AppPaths {
    pub root: PathBuf,
    pub data: PathBuf,
    pub attachments: PathBuf,
    pub backups: PathBuf,
    pub exports: PathBuf,
    pub logs: PathBuf,
}

impl AppPaths {
    pub fn from_app(app: &AppHandle) -> Result<Self, AppError> {
        let root = app.path().app_local_data_dir().map_err(|_| AppError::MissingAppData)?;
        let paths = Self {
            data: root.join("data"),
            attachments: root.join("attachments"),
            backups: root.join("backups"),
            exports: root.join("exports"),
            logs: root.join("logs"),
            root,
        };
        for path in [&paths.root, &paths.data, &paths.attachments, &paths.backups, &paths.exports, &paths.logs] {
            fs::create_dir_all(path)?;
        }
        Ok(paths)
    }

    pub fn database(&self) -> PathBuf { self.data.join("journal.db") }
}
