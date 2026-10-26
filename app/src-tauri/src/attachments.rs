use std::{fs, io::Read, path::{Path, PathBuf}};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;
use crate::{error::AppError, paths::AppPaths};

#[derive(Debug, Deserialize)]
pub struct ImportAttachmentInput {
    pub owner_type: String,
    pub owner_id: String,
    pub stage: String,
    pub source_path: String,
    pub caption: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAttachmentInput {
    pub attachment_id: String,
    pub stage: String,
    pub caption: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReplaceAttachmentFileInput {
    pub attachment_id: String,
    pub source_path: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct AttachmentDto {
    pub attachment_id: String,
    pub owner_type: String,
    pub owner_id: String,
    pub stage: String,
    pub occurred_at: Option<String>,
    pub original_filename: Option<String>,
    pub media_type: Option<String>,
    pub file_size: Option<i64>,
    pub sha256: Option<String>,
    pub caption: Option<String>,
    pub created_at: String,
}

fn file_sha256(path: &Path) -> Result<String, AppError> {
    let mut file = fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 64 * 1024];
    loop {
        let n = file.read(&mut buf)?;
        if n == 0 { break; }
        hasher.update(&buf[..n]);
    }
    Ok(hex::encode(hasher.finalize()))
}

fn media_from_extension(ext: &str) -> Option<&'static str> {
    match ext.to_ascii_lowercase().as_str() {
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "webp" => Some("image/webp"),
        _ => None,
    }
}

fn validate_owner(conn: &Connection, owner_type: &str, owner_id: &str) -> Result<(), AppError> {
    let sql = match owner_type {
        "SESSION" => "SELECT COUNT(*) FROM sessions WHERE session_id=?1",
        "CANDIDATE" => "SELECT COUNT(*) FROM candidates WHERE candidate_id=?1",
        "DECISION" => "SELECT COUNT(*) FROM candidate_decisions WHERE decision_id=?1",
        "TRADE" => "SELECT COUNT(*) FROM trades WHERE trade_id=?1",
        "REVIEW" => "SELECT COUNT(*) FROM session_reviews WHERE review_id=?1 UNION ALL SELECT COUNT(*) FROM trade_reviews WHERE review_id=?1",
        _ => return Err(AppError::Validation("invalid attachment owner type".into())),
    };
    let count: i64 = if owner_type == "REVIEW" {
        let mut stmt = conn.prepare(sql)?;
        let vals = stmt.query_map([owner_id], |r| r.get::<_, i64>(0))?.collect::<Result<Vec<_>,_>>()?;
        vals.into_iter().sum()
    } else {
        conn.query_row(sql, [owner_id], |r| r.get(0))?
    };
    if count == 0 { return Err(AppError::Validation("attachment owner does not exist".into())); }
    Ok(())
}

fn normalize_stage(stage: &str) -> Result<String, AppError> {
    let normalized = stage.trim().to_ascii_uppercase().replace(' ', "_").replace('-', "_");
    if matches!(normalized.as_str(), "PRE_MARKET"|"PRE_ENTRY"|"ENTRY"|"DURING"|"POST_EXIT"|"FOLLOW_UP"|"ORDER_FLOW"|"OTHER") {
        Ok(normalized)
    } else {
        Err(AppError::Validation(format!("invalid attachment stage: {}", stage)))
    }
}

pub fn import_attachment(conn: &Connection, paths: &AppPaths, input: ImportAttachmentInput) -> Result<AttachmentDto, AppError> {
    validate_owner(conn, &input.owner_type, &input.owner_id)?;
    let stage = normalize_stage(&input.stage)?;
    let source = PathBuf::from(&input.source_path);
    if !source.is_file() { return Err(AppError::Validation("selected attachment file does not exist".into())); }
    let ext = source.extension().and_then(|x|x.to_str()).unwrap_or("").to_ascii_lowercase();
    let media = media_from_extension(&ext).ok_or_else(|| AppError::Validation("v1.1 screenshot import supports PNG, JPG/JPEG, and WEBP".into()))?;
    let meta = fs::metadata(&source)?;
    // Personal-journal guardrail: avoid accidentally copying enormous unrelated files.
    if meta.len() > 25 * 1024 * 1024 { return Err(AppError::Validation("attachment exceeds the 25 MB screenshot limit".into())); }

    let attachment_id = Uuid::new_v4().to_string();
    let owner_dir = paths.attachments.join(input.owner_type.to_ascii_lowercase()).join(&input.owner_id);
    fs::create_dir_all(&owner_dir)?;
    let target = owner_dir.join(format!("{}.{}", attachment_id, ext));
    fs::copy(&source, &target)?;
    let hash = file_sha256(&target)?;
    let now = Utc::now().to_rfc3339();
    let original_filename = source.file_name().and_then(|x|x.to_str()).map(str::to_string);
    let storage_key = target.strip_prefix(&paths.attachments).unwrap_or(&target).to_string_lossy().replace('\\', "/");
    conn.execute(
        "INSERT INTO attachments(attachment_id,workspace_id,owner_type,owner_id,stage,occurred_at,storage_key,original_filename,media_type,file_size,sha256,caption,created_at) VALUES(?1,'default-workspace',?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?5)",
        params![attachment_id,input.owner_type,input.owner_id,stage,now,storage_key,original_filename,media,meta.len() as i64,hash,input.caption]
    )?;
    get_attachment(conn, &attachment_id)?.ok_or_else(||AppError::Validation("attachment was not saved".into()))
}

pub fn get_attachment(conn: &Connection, attachment_id: &str) -> Result<Option<AttachmentDto>, AppError> {
    use rusqlite::OptionalExtension;
    conn.query_row(
        "SELECT attachment_id,owner_type,owner_id,stage,occurred_at,original_filename,media_type,file_size,sha256,caption,created_at FROM attachments WHERE attachment_id=?1",
        [attachment_id],
        |r| Ok(AttachmentDto{attachment_id:r.get(0)?,owner_type:r.get(1)?,owner_id:r.get(2)?,stage:r.get(3)?,occurred_at:r.get(4)?,original_filename:r.get(5)?,media_type:r.get(6)?,file_size:r.get(7)?,sha256:r.get(8)?,caption:r.get(9)?,created_at:r.get(10)?})
    ).optional().map_err(AppError::from)
}

pub fn list_attachments(conn: &Connection, owner_type: &str, owner_id: &str) -> Result<Vec<AttachmentDto>, AppError> {
    validate_owner(conn, owner_type, owner_id)?;
    let mut stmt=conn.prepare("SELECT attachment_id,owner_type,owner_id,stage,occurred_at,original_filename,media_type,file_size,sha256,caption,created_at FROM attachments WHERE owner_type=?1 AND owner_id=?2 ORDER BY created_at DESC")?;
    let rows = stmt.query_map(params![owner_type,owner_id],|r|Ok(AttachmentDto{attachment_id:r.get(0)?,owner_type:r.get(1)?,owner_id:r.get(2)?,stage:r.get(3)?,occurred_at:r.get(4)?,original_filename:r.get(5)?,media_type:r.get(6)?,file_size:r.get(7)?,sha256:r.get(8)?,caption:r.get(9)?,created_at:r.get(10)?}))?.collect::<Result<Vec<_>,_>>()?;
    Ok(rows)
}

pub fn update_attachment(conn: &Connection, input: UpdateAttachmentInput) -> Result<AttachmentDto, AppError> {
    let stage = normalize_stage(&input.stage)?;
    let changed = conn.execute(
        "UPDATE attachments SET stage=?1,caption=?2 WHERE attachment_id=?3",
        params![stage,input.caption,input.attachment_id],
    )?;
    if changed == 0 {
        return Err(AppError::Validation("attachment does not exist".into()));
    }
    get_attachment(conn, &input.attachment_id)?.ok_or_else(||AppError::Validation("attachment was not found after update".into()))
}

fn validated_source(source_path: &str) -> Result<(PathBuf,String,&'static str,fs::Metadata), AppError> {
    let source = PathBuf::from(source_path);
    if !source.is_file() {
        return Err(AppError::Validation("selected attachment file does not exist".into()));
    }
    let ext = source.extension().and_then(|x|x.to_str()).unwrap_or("").to_ascii_lowercase();
    let media = media_from_extension(&ext).ok_or_else(|| AppError::Validation("screenshot import supports PNG, JPG/JPEG, and WEBP".into()))?;
    let meta = fs::metadata(&source)?;
    if meta.len() > 25 * 1024 * 1024 {
        return Err(AppError::Validation("attachment exceeds the 25 MB screenshot limit".into()));
    }
    Ok((source,ext,media,meta))
}

pub fn replace_attachment_file(conn: &Connection, paths: &AppPaths, input: ReplaceAttachmentFileInput) -> Result<AttachmentDto, AppError> {
    let (owner_type,owner_id,old_storage_key):(String,String,String)=conn.query_row(
        "SELECT owner_type,owner_id,storage_key FROM attachments WHERE attachment_id=?1",
        [&input.attachment_id],
        |r|Ok((r.get(0)?,r.get(1)?,r.get(2)?)),
    ).map_err(|_| AppError::Validation("attachment does not exist".into()))?;
    validate_owner(conn, &owner_type, &owner_id)?;
    let (source,ext,media,meta)=validated_source(&input.source_path)?;
    let owner_dir = paths.attachments.join(owner_type.to_ascii_lowercase()).join(&owner_id);
    fs::create_dir_all(&owner_dir)?;
    let target = owner_dir.join(format!("{}.{}", input.attachment_id, ext));
    fs::copy(&source, &target)?;
    let hash = file_sha256(&target)?;
    let original_filename = source.file_name().and_then(|x|x.to_str()).map(str::to_string);
    let storage_key = target.strip_prefix(&paths.attachments).unwrap_or(&target).to_string_lossy().replace('\\', "/");
    let result = conn.execute(
        "UPDATE attachments SET storage_key=?1,original_filename=?2,media_type=?3,file_size=?4,sha256=?5 WHERE attachment_id=?6",
        params![storage_key,original_filename,media,meta.len() as i64,hash,input.attachment_id],
    );
    if let Err(e)=result {
        let _=fs::remove_file(&target);
        return Err(e.into());
    }
    if old_storage_key != storage_key {
        let old_rel=PathBuf::from(old_storage_key);
        if !old_rel.is_absolute() && !old_rel.components().any(|c|matches!(c,std::path::Component::ParentDir)) {
            let _=fs::remove_file(paths.attachments.join(old_rel));
        }
    }
    get_attachment(conn, &input.attachment_id)?.ok_or_else(||AppError::Validation("attachment was not found after replacement".into()))
}

pub fn delete_attachment(conn: &Connection, paths: &AppPaths, attachment_id: &str) -> Result<(), AppError> {
    let storage_key:String=conn.query_row(
        "SELECT storage_key FROM attachments WHERE attachment_id=?1",
        [attachment_id],
        |r|r.get(0),
    ).map_err(|_| AppError::Validation("attachment does not exist".into()))?;
    let rel=PathBuf::from(&storage_key);
    if rel.is_absolute() || rel.components().any(|c|matches!(c,std::path::Component::ParentDir)) {
        return Err(AppError::Validation("unsafe attachment path".into()));
    }
    conn.execute("DELETE FROM attachments WHERE attachment_id=?1",[attachment_id])?;
    let path=paths.attachments.join(rel);
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

pub fn attachment_data_url(conn: &Connection, paths: &AppPaths, attachment_id: &str) -> Result<String, AppError> {
    let (storage_key, media_type):(String,String)=conn.query_row("SELECT storage_key,COALESCE(media_type,'application/octet-stream') FROM attachments WHERE attachment_id=?1",[attachment_id],|r|Ok((r.get(0)?,r.get(1)?)))?;
    let rel=PathBuf::from(storage_key);
    if rel.is_absolute() || rel.components().any(|c|matches!(c,std::path::Component::ParentDir)) {return Err(AppError::Validation("unsafe attachment path".into()));}
    let path=paths.attachments.join(rel);
    let bytes=fs::read(path)?;
    Ok(format!("data:{};base64,{}",media_type,STANDARD.encode(bytes)))
}

