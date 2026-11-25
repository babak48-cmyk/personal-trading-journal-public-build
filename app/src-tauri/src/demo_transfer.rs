//! Explicit one-way Package B DEMO backup transfer into an EMPTY, distinct
//! Package C DEMO profile. Never touches the original Package B app directory.
use std::{path::Path,fs::File,io::Read};
use sha2::{Digest,Sha256};
use rusqlite::{Connection,OptionalExtension};
use serde::Serialize;
use crate::{backup,db,error::AppError,paths::AppPaths,restore};

#[derive(Debug,Serialize)]
pub struct DemoTransferPreview {
    pub source_schema_version:u32,
    pub target_schema_version:u32,
    pub database_sha256:String,
    /// SHA-256 of the entire source archive, including all attachments.
    pub archive_sha256:String,
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
    pub initial_risk_correction_events:i64,
    pub source_type_correction_events:i64,
    pub source_price_correction_events:i64,
    pub weekly_learning_action_events:i64,
    pub attachments:usize,
    pub original_backup_untouched:bool,
}

fn external_archive_sha256(paths:&AppPaths,archive:&Path)->Result<String,AppError>{
    // Canonicalize both paths so relative segments and symlink aliases cannot
    // obscure that a "source" archive lives inside the destination profile.
    // Restore staging is cleaned before extraction: it must never hold the
    // user's only source ZIP. Package B backups are external by contract.
    let target_root=std::fs::canonicalize(&paths.root)?;
    let source_path=std::fs::canonicalize(archive)?;
    if source_path.starts_with(&target_root){
        return Err(AppError::Validation(
            "Package B source backup must be outside the Package C destination profile".into()));
    }
    let mut input=File::open(&source_path)?;
    let mut sha=Sha256::new();
    let mut chunk=[0u8;65536];
    loop{
        let n=input.read(&mut chunk)?;
        if n==0{break;}
        sha.update(&chunk[..n]);
    }
    Ok(hex::encode(sha.finalize()))
}

fn count(conn:&Connection,table:&str)->Result<i64,AppError>{
    // Strict static allowlist; no unchecked table identifier comes from the UI.
    let sql=match table{
        "sessions"=>"SELECT COUNT(*) FROM sessions",
        "trades"=>"SELECT COUNT(*) FROM trades",
        "candidates"=>"SELECT COUNT(*) FROM candidates",
        "candidate_revisions"=>"SELECT COUNT(*) FROM candidate_revisions",
        "candidate_status_events"=>"SELECT COUNT(*) FROM candidate_status_events",
        "candidate_sources"=>"SELECT COUNT(*) FROM candidate_sources",
        "candidate_decisions"=>"SELECT COUNT(*) FROM candidate_decisions",
        "session_plan_revisions"=>"SELECT COUNT(*) FROM session_plan_revisions",
        "evidence_observations"=>"SELECT COUNT(*) FROM evidence_observations",
        "risk_snapshots"=>"SELECT COUNT(*) FROM risk_snapshots",
        "execution_fills"=>"SELECT COUNT(*) FROM execution_fills",
        "trade_reviews"=>"SELECT COUNT(*) FROM trade_reviews",
        "session_reviews"=>"SELECT COUNT(*) FROM session_reviews",
        "attachments"=>"SELECT COUNT(*) FROM attachments",
        "trade_mistakes"=>"SELECT COUNT(*) FROM trade_mistakes",
        "session_pre_states"=>"SELECT COUNT(*) FROM session_pre_states",
        "trade_rule_checks"=>"SELECT COUNT(*) FROM trade_rule_checks",
        "rule_assessments"=>"SELECT COUNT(*) FROM rule_assessments",
        "custom_field_value_events"=>"SELECT COUNT(*) FROM custom_field_value_events",
        "custom_field_selection_snapshots"=>"SELECT COUNT(*) FROM custom_field_selection_snapshots",
        // User-created definitions and playbook knowledge are valuable
        // destination state even if no Sessions or Trades exist yet.
        "custom_field_definitions"=>"SELECT COUNT(*) FROM custom_field_definitions",
        "custom_field_options"=>"SELECT COUNT(*) FROM custom_field_options",
        "setup_playbook_details"=>"SELECT COUNT(*) FROM setup_playbook_details",
        "setup_evidence_priorities"=>"SELECT COUNT(*) FROM setup_evidence_priorities",
        "strategies"=>"SELECT COUNT(*) FROM strategies",
        "strategy_versions"=>"SELECT COUNT(*) FROM strategy_versions",
        "settings_profiles"=>"SELECT COUNT(*) FROM settings_profiles",
        "settings_profile_versions"=>"SELECT COUNT(*) FROM settings_profile_versions",
        // Even a user-defined registry item without any captured journal
        // event must never be silently replaced by the imported profile.
        "user_defined_instruments"=>"SELECT COUNT(*) FROM instruments WHERE user_defined=1",
        "user_defined_setups"=>"SELECT COUNT(*) FROM setups WHERE user_defined=1",
        "user_defined_level_sources"=>"SELECT COUNT(*) FROM level_source_types WHERE user_defined=1",
        "setup_trade_links"=>"SELECT COUNT(*) FROM setup_trade_links",
        "fill_correction_events"=>"SELECT COUNT(*) FROM fill_correction_events",
        "initial_risk_correction_events"=>"SELECT COUNT(*) FROM initial_risk_correction_events",
        "candidate_source_type_correction_events"=>"SELECT COUNT(*) FROM candidate_source_type_correction_events",
        "candidate_source_price_correction_events"=>"SELECT COUNT(*) FROM candidate_source_price_correction_events",
        "weekly_learning_action_events"=>"SELECT COUNT(*) FROM weekly_learning_action_events",
        _=>return Err(AppError::Validation("invalid transfer inventory table".into())),
    };
    Ok(conn.query_row(sql,[],|r|r.get(0))?)
}
const JOURNAL_EVENT_TABLES:&[&str]=&[
    "sessions","trades","candidates","candidate_revisions",
    "candidate_status_events","candidate_sources","candidate_decisions",
    "session_plan_revisions","evidence_observations","risk_snapshots",
    "execution_fills","trade_reviews","session_reviews","attachments",
    "trade_mistakes","session_pre_states","trade_rule_checks","rule_assessments",
    "custom_field_value_events","custom_field_selection_snapshots",
    "custom_field_definitions","custom_field_options",
    "setup_playbook_details","setup_evidence_priorities",
    "strategies","strategy_versions","settings_profiles","settings_profile_versions",
    "user_defined_instruments","user_defined_setups","user_defined_level_sources",
    "setup_trade_links","fill_correction_events","initial_risk_correction_events",
    "candidate_source_type_correction_events","candidate_source_price_correction_events",
    "weekly_learning_action_events",
];
/// Refuse replacement of a destination whose built-in registries were
/// edited, even when their user_defined flag remains false. Compare against
/// the SAME reference seeding code as the installed app, not a duplicated
/// list of hard-coded instrument prices or level names.
fn ensure_pristine_reference_catalog(conn:&Connection)->Result<(),AppError>{
    use rusqlite::types::Value;
    use std::collections::HashMap;
    let baseline=Connection::open_in_memory()?;
    db::migrate(&baseline)?;
    crate::repository::ensure_default_workspace(&baseline)?;
    // A fresh, never-opened destination is genuinely empty: it may not have
    // the app's initial Workspace or seeded catalog rows yet. This is safe.
    // Any PARTIALLY populated catalog must match the full built-in baseline.
    let uninitialized:bool=conn.query_row(
        "SELECT NOT EXISTS(SELECT 1 FROM workspaces)
            AND NOT EXISTS(SELECT 1 FROM instruments)
            AND NOT EXISTS(SELECT 1 FROM level_source_types)
            AND NOT EXISTS(SELECT 1 FROM evidence_types)",[],|r|r.get(0))?;
    // Explicit source columns: exclude generated timestamps; include every
    // user-editable reference attribute, disabled state and presentation order.
    for (table,sql) in [
      ("instruments","SELECT instrument_id,symbol,display_name,tick_size,point_value,currency,active,market_type,display_order,user_defined,workspace_id FROM instruments"),
      ("level_source_types","SELECT source_type_id,code,label,source_group,active,user_defined,description,display_order,manager_group,workspace_id FROM level_source_types"),
      ("evidence_types","SELECT evidence_type_id,code,label,family,active,research_status,user_defined,workspace_id FROM evidence_types"),
    ]{
        let collect=|c:&Connection|->Result<HashMap<String,Vec<Value>>,AppError>{
            let mut statement=c.prepare(sql)?;
            let values=statement.query_map([],|row|{
                let key:String=row.get(0)?;
                let mut cells=Vec::with_capacity(row.as_ref().column_count());
                for index in 0..row.as_ref().column_count(){
                    cells.push(row.get::<_,Value>(index)?);
                }
                Ok((key,cells))
            })?.collect::<Result<HashMap<_,_>,_>>()?;
            Ok(values)
        };
        let references=collect(&baseline)?;
        let actual=collect(conn)?;
        for (id,record) in &actual{
            if references.get(id)!=Some(record){
                return Err(AppError::Validation(format!(
                    "Package C destination contains altered or nonbaseline {table} registry entry {id}; transfer is blocked to preserve settings"
                )));
            }
        }
        // A missing built-in reference is also a destination customization.
        // Comparing only extant destination rows silently accepted deletions.
        for id in references.keys(){
            if !uninitialized && !actual.contains_key(id){
                return Err(AppError::Validation(format!(
                    "Package C destination is missing baseline {table} registry entry {id}; transfer is blocked to preserve settings"
                )));
            }
        }
    }
    // The default Workspace is a user-visible entity; extra workspaces
    // or a renamed default must not silently vanish with a new ZIP.
    let mut workspaces=conn.prepare("SELECT workspace_id,name FROM workspaces")?;
    let rows=workspaces.query_map([],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?)))?;
    for row in rows{
        let (id,name)=row?;
        if id!="default-workspace" || name!="Personal Trading Journal"{
            return Err(AppError::Validation(
                "Package C destination contains customized Workspace identity/name; no overwrite permitted".into()
            ));
        }
    }
    Ok(())
}

fn ensure_empty_target(paths:&AppPaths)->Result<(),AppError>{
    let conn=db::open_database(&paths.database())?;
    // Refuse ALL previously captured journal history, including draft-only
    // records, unattached metadata and per-trade action events. An empty Trade
    // list alone does not establish an empty destination. Static registries
    // and default Settings are not treated as events.
    for table in JOURNAL_EVENT_TABLES{
        if count(&conn,table)?>0{
            return Err(AppError::Validation(format!(
              "Package C destination already contains journal data in {table}; transfer requires an empty, separate DEMO profile. No overwrite permitted.")));
        }
    }
    ensure_pristine_reference_catalog(&conn)?;
    if paths.attachments.exists()&&
       std::fs::read_dir(&paths.attachments)?.next().is_some(){
       return Err(AppError::Validation("Package C destination already has attachments; transfer refused".into()));
    }
    Ok(())
}
fn require_test_sessions(conn:&Connection)->Result<(),AppError>{
    // Fail closed: an unknown, whitespace-padded or future environment value
    // is NOT proof that the history is synthetic. Never infer DEMO status.
    let non_test:i64=conn.query_row(
       "SELECT COUNT(*) FROM sessions
         WHERE environment IS NULL OR UPPER(environment) NOT IN ('DEMO','FORWARD_TEST')",
       [],|r|r.get(0))?;
    if non_test>0{
        return Err(AppError::Validation("Source contains non-DEMO or unknown sessions. Only explicitly DEMO/FORWARD_TEST records may be transferred".into()));
    }
    Ok(())
}
pub fn preview(paths:&AppPaths,archive:&Path)->Result<DemoTransferPreview,AppError>{
    // Validate source location before any restore-staging directory is cleared.
    let archive_sha256=external_archive_sha256(paths,archive)?;
    ensure_empty_target(paths)?;
    let info=restore::validate_backup(archive)?;
    if !(10..=db::CURRENT_SCHEMA_VERSION).contains(&info.schema_version){
        return Err(AppError::Validation("Unsupported prior DEMO backup schema version".into()));
    }
    let staged=restore::restore_to_staging(paths,archive)?;
    let _staging_cleanup=restore::StagingCleanup(Some(staged.clone()));
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
    crate::source_price_corrections::verify_all(&c)?;
    Ok(DemoTransferPreview{
        source_schema_version:info.schema_version,
        target_schema_version:staged_schema,
        database_sha256:info.database_sha256,
        archive_sha256,
        sessions:count(&c,"sessions")?,trades:count(&c,"trades")?,
        zones:count(&c,"candidates")?,decisions:count(&c,"candidate_decisions")?,
        plan_revisions:count(&c,"session_plan_revisions")?,
        evidence_events:count(&c,"evidence_observations")?,
        risk_snapshots:count(&c,"risk_snapshots")?,
        fills:count(&c,"execution_fills")?,reviews:count(&c,"trade_reviews")?,
        correction_events:count(&c,"fill_correction_events")?,
        initial_risk_correction_events:count(&c,"initial_risk_correction_events")?,
        source_type_correction_events:count(&c,"candidate_source_type_correction_events")?,
        source_price_correction_events:count(&c,"candidate_source_price_correction_events")?,
        weekly_learning_action_events:count(&c,"weekly_learning_action_events")?,
        attachments:info.attachment_count,
        original_backup_untouched:true,
    })
}

pub fn import_into_empty(paths:&AppPaths,archive:&Path,expected_archive_sha:&str)
 ->Result<restore::RestoreResult,AppError>{
    if expected_archive_sha.len()!=64 ||
       !expected_archive_sha.bytes().all(|c|c.is_ascii_hexdigit()){
        return Err(AppError::Validation("Full 64-character preflight archive hash required".into()));
    }
    let confirmed=preview(paths,archive)?;
    if confirmed.archive_sha256!=expected_archive_sha{
        return Err(AppError::Validation(
            "Source archive or attachments changed after preview; import cancelled".into()));
    }
    // This only changes the separate Package C destination. Existing restore
    // creates its own safety backup, rollback folder, and rechecks staged DB.
    let receipt=restore::replace_live_from_backup_with_postcheck(paths,archive,|c|{
        // This executes BEFORE Restore deletes the rollback snapshot or reports
        // success. A count mismatch must not leave replaced data with an error
        // that falsely suggests the original destination is still intact.
        if db::integrity_check(c)?!="ok"||db::foreign_key_violation_count(c)?>0||
           count(c,"sessions")?!=confirmed.sessions||
           count(c,"trades")?!=confirmed.trades||
           count(c,"candidates")?!=confirmed.zones||
           count(c,"candidate_decisions")?!=confirmed.decisions||
           count(c,"session_plan_revisions")?!=confirmed.plan_revisions||
           count(c,"evidence_observations")?!=confirmed.evidence_events||
           count(c,"risk_snapshots")?!=confirmed.risk_snapshots||
           count(c,"execution_fills")?!=confirmed.fills||
           count(c,"trade_reviews")?!=confirmed.reviews||
           count(c,"fill_correction_events")?!=confirmed.correction_events||
           count(c,"initial_risk_correction_events")?!=confirmed.initial_risk_correction_events||
           count(c,"candidate_source_type_correction_events")?!=confirmed.source_type_correction_events||
           count(c,"candidate_source_price_correction_events")?!=confirmed.source_price_correction_events||
           count(c,"weekly_learning_action_events")?!=confirmed.weekly_learning_action_events{
            return Err(AppError::Validation(
              "Package C post-install record counts disagree with verified B preview; rollback required".into()));
        }
        // Redundant by design: mandatory Restore checks and transfer-specific
        // checks both fail closed on every supported audited correction chain.
        crate::fill_corrections::verify_all_correction_chains(c)?;
        crate::initial_risk_corrections::verify_all_initial_risk_correction_chains(c)?;
        crate::source_type_corrections::verify_all_source_correction_chains(c)?;
        crate::source_price_corrections::verify_all(c)?;
        // Validate the physical source ZIP after the staged copy is installed,
        // while Restore still has its rollback snapshot. If the original
        // archive changed during import, reject before reporting success.
        if external_archive_sha256(paths,archive)?!=confirmed.archive_sha256{
            return Err(AppError::Validation(
                "Source ZIP changed during B-to-C import; destination rollback required".into()));
        }
        Ok(())
    })?;
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
        c.execute("DELETE FROM sessions WHERE environment='REAL'",[]).unwrap();
        for unknown in ["", "UNKNOWN", "PAPER", "LIVE", " DEMO ", "FORWARD-TEST"] {
            c.execute("INSERT INTO sessions VALUES(?1)",[unknown]).unwrap();
            assert!(require_test_sessions(&c).is_err(), "unapproved environment: {unknown}");
            c.execute("DELETE FROM sessions WHERE environment=?1",[unknown]).unwrap();
        }
        assert!(require_test_sessions(&c).is_ok());
    }
    #[test]
    fn destination_with_attachment_metadata_but_no_sessions_is_not_empty(){
        let base=std::env::temp_dir().join(format!("ptj-c-nonempty-{}",Uuid::new_v4()));
        let paths=target_paths(&base);
        let conn=db::open_database(&paths.database()).unwrap();
        conn.execute("INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','Synthetic','2026-11-23')",[]).unwrap();
        conn.execute(
          "INSERT INTO attachments(attachment_id,workspace_id,owner_type,owner_id,stage,storage_key,created_at)
           VALUES('a','w','SESSION','historical-owner','OTHER','test-key','2026-11-23')",[]
        ).unwrap();
        assert!(ensure_empty_target(&paths).is_err(),
          "metadata-only history must block destructive import");
        drop(conn);fs::remove_dir_all(base).unwrap();
    }
    #[test]
    fn destination_custom_field_definition_without_session_is_not_empty(){
        let base=std::env::temp_dir().join(format!("ptj-c-custom-field-{}",Uuid::new_v4()));
        let paths=target_paths(&base);
        let conn=db::open_database(&paths.database()).unwrap();
        conn.execute(
          "INSERT INTO custom_field_definitions(field_id,stage,field_type,label)
           VALUES('user-field','session-review','TEXT','My private review field')",[]
        ).unwrap();
        assert!(ensure_empty_target(&paths).is_err(),
          "custom Field Manager definitions are user data even without trades");
        drop(conn);fs::remove_dir_all(base).unwrap();
    }
    #[test]
    fn destination_playbook_detail_without_trade_is_not_empty(){
        let base=std::env::temp_dir().join(format!("ptj-c-playbook-{}",Uuid::new_v4()));
        let paths=target_paths(&base);
        let conn=db::open_database(&paths.database()).unwrap();
        conn.execute_batch(
          "INSERT INTO workspaces(workspace_id,name,created_at)
             VALUES('w','Synthetic','2026-11-23');
           INSERT INTO setups(setup_id,workspace_id,name,user_defined)
             VALUES('setup-1','w','User playbook',1);
           INSERT INTO setup_versions(setup_version_id,setup_id,version_label,status)
             VALUES('v1','setup-1','v1','DRAFT');
           INSERT INTO setup_playbook_details(version_id,version_number,created_at,name_snapshot,is_approved)
             VALUES('v1',1,'2026-11-23','User playbook',0);"
        ).unwrap();
        assert!(ensure_empty_target(&paths).is_err(),
          "a historical playbook definition must block destructive import");
        drop(conn);fs::remove_dir_all(base).unwrap();
    }
    #[test]
    fn destination_user_defined_registries_block_import_even_without_sessions(){
        for kind in ["instrument","setup","level_source"]{
            let base=std::env::temp_dir().join(format!("ptj-c-registry-{}-{}",kind,Uuid::new_v4()));
            let paths=target_paths(&base);
            let conn=db::open_database(&paths.database()).unwrap();
            conn.execute(
              "INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','Synthetic','2026-11-23')",[]
            ).unwrap();
            match kind{
                "instrument"=>{conn.execute(
                    "INSERT INTO instruments(instrument_id,workspace_id,symbol,tick_size,point_value,user_defined)
                     VALUES('i','w','MYMARKET',0.01,10,1)",[]).unwrap();},
                "setup"=>{conn.execute(
                    "INSERT INTO setups(setup_id,workspace_id,name,user_defined)
                     VALUES('custom-setup','w','My setup',1)",[]).unwrap();},
                _=>{conn.execute(
                    "INSERT INTO level_source_types(source_type_id,workspace_id,code,label,source_group,user_defined)
                     VALUES('source-1','w','MY_LEVEL','My custom level','MANUAL',1)",[]).unwrap();},
            }
            assert!(ensure_empty_target(&paths).is_err(),
              "user-defined instrument/setup/level must not be overwritten by import");
            drop(conn);fs::remove_dir_all(base).unwrap();
        }
    }
    #[test]
    fn refuses_source_backup_inside_destination_even_in_restore_staging(){
        let base=std::env::temp_dir().join(format!("ptj-c-self-source-{}",Uuid::new_v4()));
        let paths=target_paths(&base);
        let staging=paths.root.join("restore-staging");
        fs::create_dir_all(&staging).unwrap();
        let source=staging.join("original-B-backup.zip");
        fs::write(&source,b"original user archive bytes").unwrap();
        assert!(preview(&paths,&source).is_err(),
          "source inside destination must be rejected before staging cleanup");
        assert_eq!(fs::read(&source).unwrap(),b"original user archive bytes",
          "refused source must not be deleted by staging preparation");
        fs::remove_dir_all(base).unwrap();
    }
    #[test]
    fn destination_strategy_and_settings_profiles_block_import_without_sessions(){
        for kind in ["strategy","settings_profile"] {
            let base=std::env::temp_dir().join(format!("ptj-c-profile-{kind}-{}",Uuid::new_v4()));
            let paths=target_paths(&base);
            let conn=db::open_database(&paths.database()).unwrap();
            conn.execute("INSERT INTO workspaces(workspace_id,name,created_at) VALUES('w','Synthetic','2026-11-23')",[]).unwrap();
            if kind=="strategy" {
                conn.execute("INSERT INTO strategies(strategy_id,workspace_id,name) VALUES('st','w','Personal custom strategy')",[]).unwrap();
                conn.execute("INSERT INTO strategy_versions(strategy_version_id,strategy_id,version_label,status) VALUES('st-v1','st','v1','DRAFT')",[]).unwrap();
            } else {
                conn.execute("INSERT INTO settings_profiles(settings_profile_id,workspace_id,name) VALUES('sp','w','My settings')",[]).unwrap();
                conn.execute("INSERT INTO settings_profile_versions(settings_profile_version_id,settings_profile_id,version_label,payload_json) VALUES('sp-v1','sp','v1','{}')",[]).unwrap();
            }
            assert!(ensure_empty_target(&paths).is_err(),"strategy/settings profile without Trades is user data");
            drop(conn);fs::remove_dir_all(base).unwrap();
        }
    }
    #[test]
    fn pristine_seeded_reference_catalog_allows_empty_destination(){
        let base=std::env::temp_dir().join(format!("ptj-c-pristine-{}",Uuid::new_v4()));
        let paths=target_paths(&base);
        let conn=db::open_database(&paths.database()).unwrap();
        crate::repository::ensure_default_workspace(&conn).unwrap();
        assert!(ensure_empty_target(&paths).is_ok(),
          "fresh Package C reference defaults must not block a safe B transfer");
        drop(conn);fs::remove_dir_all(base).unwrap();
    }
    #[test]
    fn missing_builtin_reference_row_blocks_transfer_without_any_trades(){
        for (table,key,id) in [
            ("instruments","instrument_id","instrument-ES"),
            ("level_source_types","source_type_id","source-VAH"),
            ("evidence_types","evidence_type_id","evidence-ATS"),
        ]{
            let base=std::env::temp_dir().join(format!("ptj-c-missing-seed-{}-{}",table,Uuid::new_v4()));
            let paths=target_paths(&base);
            let conn=db::open_database(&paths.database()).unwrap();
            crate::repository::ensure_default_workspace(&conn).unwrap();
            assert!(ensure_empty_target(&paths).is_ok(),"baseline must be safe before edit");
            let sql=format!("DELETE FROM {table} WHERE {key}=?1");
            assert_eq!(conn.execute(&sql,[id]).unwrap(),1,"test must delete one known built-in row");
            assert!(ensure_empty_target(&paths).is_err(),
                "a removed default {table} row is a changed destination and must block import");
            drop(conn);fs::remove_dir_all(base).unwrap();
        }
    }
    #[test]
    fn existing_builtin_registry_edits_cannot_be_overwritten_by_import(){
        for kind in ["instrument_price","instrument_disabled","instrument_order",
                     "level_label","level_disabled","evidence_status","workspace_name"]{
            let base=std::env::temp_dir().join(format!("ptj-c-edited-{}-{}",kind,Uuid::new_v4()));
            let paths=target_paths(&base);
            let conn=db::open_database(&paths.database()).unwrap();
            crate::repository::ensure_default_workspace(&conn).unwrap();
            match kind{
                "instrument_price"=>{conn.execute(
                    "UPDATE instruments SET tick_size=0.50 WHERE instrument_id='instrument-ES'",[]
                ).unwrap();},
                "instrument_disabled"=>{conn.execute(
                    "UPDATE instruments SET active=0 WHERE instrument_id='instrument-GC'",[]
                ).unwrap();},
                "instrument_order"=>{conn.execute(
                    "UPDATE instruments SET display_order=3000 WHERE instrument_id='instrument-ES'",[]
                ).unwrap();},
                "level_label"=>{conn.execute(
                    "UPDATE level_source_types SET label='My personal high' WHERE source_type_id='source-PRIOR_DAY_HIGH'",[]
                ).unwrap();},
                "level_disabled"=>{conn.execute(
                    "UPDATE level_source_types SET active=0 WHERE source_type_id='source-VAH'",[]
                ).unwrap();},
                "evidence_status"=>{conn.execute(
                    "UPDATE evidence_types SET research_status='CORE' WHERE evidence_type_id='evidence-ATS'",[]
                ).unwrap();},
                _=>{conn.execute(
                    "UPDATE workspaces SET name='My analysis workspace' WHERE workspace_id='default-workspace'",[]
                ).unwrap();},
            }
            assert!(ensure_empty_target(&paths).is_err(),
                "customized built-in catalog must block B-to-C transfer: {kind}");
            drop(conn);fs::remove_dir_all(base).unwrap();
        }
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
           DROP TABLE candidate_source_type_correction_events;
           DROP TABLE candidate_source_price_correction_events;
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
        assert_eq!(observed.target_schema_version,15);
        assert_eq!((observed.sessions,observed.trades,observed.fills,observed.reviews,observed.attachments),(1,2,5,2,1));
        assert_eq!(observed.decisions,2);
        assert_eq!(observed.risk_snapshots,2);
        assert_eq!(observed.zones,0);
        assert_eq!(observed.plan_revisions,0);
        assert_eq!(observed.evidence_events,0);
        assert_eq!(observed.weekly_learning_action_events,0);
        // The database is identical, but the attachment differs. A database-
        // only preview hash could not distinguish these two valid ZIP files.
        let changed_archive=source.join("B-TEST-changed-attachment.zip");
        let mut changed=ZipWriter::new(File::create(&changed_archive).unwrap());
        changed.start_file("database.sqlite",options).unwrap();
        changed.write_all(&old_bytes).unwrap();
        changed.start_file("attachments/example.txt",options).unwrap();
        changed.write_all(b"different post-preview attachment").unwrap();
        changed.start_file("backup_info.json",options).unwrap();
        changed.write_all(serde_json::json!({
          "backup_version":1,"created_at_utc":"2026-11-22T12:00:00Z",
          "schema_version":11,"database_sha256":observed.database_sha256,
          "attachment_count":1
        }).to_string().as_bytes()).unwrap();
        changed.finish().unwrap();
        let changed_preview=preview(&new_c,&changed_archive).unwrap();
        assert_eq!(changed_preview.database_sha256,observed.database_sha256);
        assert_ne!(changed_preview.archive_sha256,observed.archive_sha256);
        assert!(import_into_empty(&new_c,&changed_archive,&observed.archive_sha256).is_err(),
          "changed attachments must fail against the exact preflight archive hash");
        assert!(ensure_empty_target(&new_c).is_ok(),
          "a changed archive cannot mutate the target");
        let receipt=import_into_empty(&new_c,&backup,&observed.archive_sha256).unwrap();
        assert_eq!(receipt.integrity,"ok");
        assert_eq!(fs::read(&backup).unwrap(),backup_bytes,"old source ZIP must stay byte-identical");
        assert_eq!(fs::read(&old_path).unwrap(),old_bytes,"old Package B SQLite must stay byte-identical");
        let restored=db::open_database(&new_c.database()).unwrap();
        assert_eq!(db::schema_version(&restored).unwrap(),15);
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
        assert!(import_into_empty(&new_c,&backup,&observed.archive_sha256).is_err(),
               "a destination with B history cannot be silently overwritten");
        drop(restored);
        fs::remove_dir_all(base).unwrap();
    }
}
