use crate::{db, error::AppError};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

const KEY: &str = "custom_field_presentation_v1";
#[derive(Clone, Serialize, Deserialize, PartialEq, Eq, Debug)]
#[serde(deny_unknown_fields)]
pub struct CustomFieldPresentation {
    pub visible: bool,
    pub placement: String,
}
pub type PresentationMap = BTreeMap<String, CustomFieldPresentation>;

pub fn get(conn: &Connection) -> Result<String, AppError> {
    Ok(db::setting(conn, KEY)?.unwrap_or_else(|| "{}".to_owned()))
}
pub fn save(conn: &Connection, json: &str) -> Result<(), AppError> {
    let data: PresentationMap = serde_json::from_str(json)
        .map_err(|_| AppError::Validation("Invalid Custom Fields presentation settings".into()))?;
    if data.len() > 200 {
        return Err(AppError::Validation("Too many Custom Fields presentation settings".into()));
    }
    // Validate against actual definitions. This is one existing app_settings row,
    // not a schema migration, value rewrite, or change to historical snapshots.
    for (id, setting) in &data {
        if id.is_empty() || id.len() > 128
            || !matches!(setting.placement.as_str(), "QUICK_AND_DETAILED" | "DETAILED_ONLY") {
            return Err(AppError::Validation("Invalid custom field presentation entry".into()));
        }
        let existing: Option<i64> = conn.query_row(
            "SELECT is_required FROM custom_field_definitions WHERE field_id=?1",
            [id], |row| row.get(0),
        ).optional()?;
        let required = existing.ok_or_else(|| AppError::Validation(
            "Custom Fields presentation references an unknown field".into()
        ))? != 0;
        if required && (!setting.visible || setting.placement != "QUICK_AND_DETAILED") {
            return Err(AppError::Validation(
                "Required Custom Fields must be visible in Quick and Detailed".into()
            ));
        }
    }
    let serialized = serde_json::to_string(&data)
        .map_err(|_| AppError::Validation("Cannot encode Custom Fields settings".into()))?;
    conn.execute(
        "INSERT INTO app_settings(key,value) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![KEY,serialized],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{backup, paths::AppPaths, restore};
    fn database() -> Connection {
        let db=Connection::open_in_memory().unwrap();
        db.execute_batch("CREATE TABLE app_settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE custom_field_definitions(field_id TEXT PRIMARY KEY,is_required INTEGER NOT NULL);").unwrap();
        db.execute("INSERT INTO custom_field_definitions VALUES('opt',0)",[]).unwrap();
        db.execute("INSERT INTO custom_field_definitions VALUES('req',1)",[]).unwrap();
        db
    }
    #[test]
    fn settings_roundtrip_is_independent_and_protects_required() {
        let db=database();
        let s=r#"{"opt":{"visible":false,"placement":"DETAILED_ONLY"},"req":{"visible":true,"placement":"QUICK_AND_DETAILED"}}"#;
        save(&db,s).unwrap();
        assert_eq!(get(&db).unwrap(),s);
        assert!(save(&db,r#"{"req":{"visible":false,"placement":"DETAILED_ONLY"}}"#).is_err());
        assert!(save(&db,r#"{"missing":{"visible":true,"placement":"QUICK_AND_DETAILED"}}"#).is_err());
        assert!(save(&db,r#"{"opt":{"visible":"no","placement":"DETAILED_ONLY"}}"#).is_err());
        assert!(save(&db,r#"{"opt":{"visible":true,"placement":"UNKNOWN"}}"#).is_err());
        assert_eq!(get(&db).unwrap(),s); // rejected changes cannot alter settings
    }
    #[test]
    fn isolated_real_backup_and_restore_preserve_custom_settings_and_history() {
        let root=std::env::temp_dir().join(format!("ptj-custom-presentation-{}",uuid::Uuid::new_v4()));
        let paths=AppPaths{data:root.join("data"),attachments:root.join("attachments"),
            backups:root.join("backups"),exports:root.join("exports"),logs:root.join("logs"),root:root.clone()};
        let result=(|| -> Result<(),AppError> {
            for dir in [&paths.data,&paths.attachments,&paths.backups,&paths.exports,&paths.logs] {
                std::fs::create_dir_all(dir)?;
            }
            let conn=db::open_database(&paths.database())?;
            conn.execute("INSERT INTO custom_field_definitions(field_id,stage,field_type,label,help_text,is_required,is_active,display_order) VALUES('test-opt','session','TEXT','Test','',0,1,0)",[])?;
            let saved=r#"{"test-opt":{"visible":false,"placement":"DETAILED_ONLY"}}"#;
            save(&conn,saved)?;
            drop(conn);
            let archive=backup::create_backup(&paths)?;
            backup::create_backup(&paths)?; // backup must not invalidate previous archive
            let result=restore::validate_backup(&archive)?;
            assert_eq!(result.backup_version,1);
            let staging=restore::restore_to_staging(&paths,&archive)?;
            let staged_db=if staging.is_dir(){staging.join("database.sqlite")}else{staging.clone()};
            // Restore staging layout is backed by the same persisted database.
            let restored=Connection::open(&staged_db)?;
            assert_eq!(get(&restored)?,saved);
            let label:String=restored.query_row("SELECT label FROM custom_field_definitions WHERE field_id='test-opt'",[],|row|row.get(0))?;
            assert_eq!(label,"Test");
            Ok(())
        })();
        let _=std::fs::remove_dir_all(&root); // disposable only, never app user path
        result.unwrap();
    }
}
