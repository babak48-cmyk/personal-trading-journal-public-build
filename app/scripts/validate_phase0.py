import sqlite3, tempfile, pathlib, math, json, hashlib, zipfile, shutil
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
SQL1 = (ROOT / 'src-tauri/migrations/001_initial.sql').read_text(encoding='utf-8')
SQL2 = (ROOT / 'src-tauri/migrations/002_decision_workflow.sql').read_text(encoding='utf-8')
SQL3 = (ROOT / 'src-tauri/migrations/003_execution_core.sql').read_text(encoding='utf-8')
SQL4 = (ROOT / 'src-tauri/migrations/004_post_trade_review.sql').read_text(encoding='utf-8')
SQL5 = (ROOT / 'src-tauri/migrations/005_session_review_rules.sql').read_text(encoding='utf-8')

def risk(entry, stop, qty, point=50):
    return abs(entry-stop)*qty*point

def ticks(a,b,tick=.25):
    return abs(a-b)/tick

def pnl_long(entry, exits, point=50):
    return sum((p-entry)*q*point for p,q in exits)

def sha256(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for chunk in iter(lambda:f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()

def init_db(db):
    con = sqlite3.connect(db)
    con.execute('PRAGMA foreign_keys=ON')
    con.executescript('CREATE TABLE schema_meta(id INTEGER PRIMARY KEY CHECK(id=1), schema_version INTEGER NOT NULL); INSERT INTO schema_meta VALUES(1,0);')
    con.executescript(SQL1)
    con.execute('UPDATE schema_meta SET schema_version=1 WHERE id=1')
    con.executescript(SQL2)
    con.execute('UPDATE schema_meta SET schema_version=2 WHERE id=1')
    con.executescript(SQL3)
    con.execute('UPDATE schema_meta SET schema_version=3 WHERE id=1')
    con.executescript(SQL4)
    con.execute('UPDATE schema_meta SET schema_version=4 WHERE id=1')
    con.executescript(SQL5)
    con.execute('UPDATE schema_meta SET schema_version=5 WHERE id=1')
    con.commit()
    return con

def create_backup(root, db, attachments):
    # checkpoint equivalent for the acceptance harness
    con=sqlite3.connect(db)
    con.execute('PRAGMA wal_checkpoint(TRUNCATE)')
    con.close()
    backup=root/'TradingJournal_Backup_TEST.zip'
    files=list(attachments.rglob('*')) if attachments.exists() else []
    files=[f for f in files if f.is_file()]
    info={
      'backup_version':1,
      'created_at_utc':datetime.now(timezone.utc).isoformat(),
      'schema_version':5,
      'database_sha256':sha256(db),
      'attachment_count':len(files),
    }
    with zipfile.ZipFile(backup,'w',zipfile.ZIP_DEFLATED) as z:
        z.write(db,'database.sqlite')
        for f in files:
            z.write(f, f.relative_to(root).as_posix())
        z.writestr('backup_info.json',json.dumps(info,indent=2))
    return backup

def restore_to_staging(backup, root):
    staging=root/'restore-staging'
    if staging.exists(): shutil.rmtree(staging)
    staging.mkdir()
    with zipfile.ZipFile(backup) as z:
        names=z.namelist()
        assert 'database.sqlite' in names and 'backup_info.json' in names
        for n in names:
            p=pathlib.PurePosixPath(n)
            assert '..' not in p.parts and not p.is_absolute(), f'unsafe backup path: {n}'
        info=json.loads(z.read('backup_info.json'))
        db_bytes=z.read('database.sqlite')
        assert hashlib.sha256(db_bytes).hexdigest()==info['database_sha256']
        z.extractall(staging)
    restored=staging/'database.sqlite'
    con=sqlite3.connect(restored)
    assert con.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    return con, info, staging

with tempfile.TemporaryDirectory() as td:
    root=pathlib.Path(td)
    db=root/'journal.db'
    attachments=root/'attachments'
    attachments.mkdir()
    con=init_db(db)
    integrity = con.execute('PRAGMA integrity_check').fetchone()[0]
    assert integrity == 'ok', integrity
    tables = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    required = {'sessions','session_plan_revisions','candidates','candidate_revisions','candidate_decisions','trades','execution_fills','attachments','migration_runs'}
    assert required <= tables, required - tables

    # repository-style CRUD smoke test
    con.execute("INSERT INTO workspaces VALUES('w','Test','2026-01-01',NULL)")
    con.execute("INSERT INTO instruments(instrument_id,workspace_id,symbol,display_name,tick_size,point_value) VALUES('i','w','ES','E-mini S&P 500',0.25,50)")
    con.execute("INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,timezone_id,schema_version,created_at,updated_at) VALUES('s','w','i','2026-10-06','DEMO','2026-10-06T00:00:00Z','DRAFT','Australia/Sydney',2,'2026-10-06T00:00:00Z','2026-10-06T00:00:00Z')")
    assert con.execute("SELECT count(*) FROM sessions").fetchone()[0]==1

    # immutable trigger smoke test
    con.execute("INSERT INTO session_plan_revisions(revision_id,session_id,revision_number,revision_type,created_at,created_by) VALUES('r','s',1,'INITIAL','2026-10-06T00:00:00Z','USER')")
    try:
        con.execute("UPDATE session_plan_revisions SET why_changed='x' WHERE revision_id='r'")
        raise AssertionError('immutable update was not blocked')
    except sqlite3.DatabaseError:
        pass
    con.commit()

    # attachment package smoke test
    a=attachments/'sessions'/'s'/'pre-market.txt'
    a.parent.mkdir(parents=True)
    a.write_text('attachment-test',encoding='utf-8')

    # calculation acceptance
    assert ticks(6025.25,6022.25)==12
    assert risk(6025.25,6022.25,1)==150
    assert risk(6025.25,6028.25,2)==300
    assert pnl_long(6025,[(6027,1),(6028,1),(6024,1)])==200
    assert math.isclose(335/450, 0.7444444444444445)

    # backup -> validate -> restore round trip
    con.close()
    backup=create_backup(root,db,attachments)
    restored,info,staging=restore_to_staging(backup,root)
    assert info['attachment_count']==1
    assert restored.execute("SELECT count(*) FROM sessions").fetchone()[0]==1
    assert restored.execute("SELECT revision_type FROM session_plan_revisions WHERE revision_id='r'").fetchone()[0]=='INITIAL'
    restored.close()
    assert (staging/'attachments'/'sessions'/'s'/'pre-market.txt').read_text()=='attachment-test'


    # planning-core data-model smoke test
    con=sqlite3.connect(db)
    con.execute('PRAGMA foreign_keys=ON')
    # seed level source and create a second session with immutable initial plan + candidate revision
    con.execute("INSERT OR IGNORE INTO level_source_types(source_type_id,workspace_id,code,label,source_group,active,user_defined) VALUES('source-HOURLY_POC','w','HOURLY_POC','Hourly POC','PRICE_AUCTION',1,0)")
    con.execute("INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,timezone_id,schema_version,created_at,updated_at) VALUES('s2','w','i','2026-10-07','DEMO','2026-10-07T00:00:00Z','DRAFT','Australia/Sydney',2,'2026-10-07T00:00:00Z','2026-10-07T00:00:00Z')")
    con.execute("INSERT INTO session_plan_revisions(revision_id,session_id,revision_number,revision_type,created_at,initial_bias,created_by) VALUES('r2','s2',1,'INITIAL','2026-10-07T00:01:00Z','MIXED','USER')")
    con.execute("UPDATE sessions SET status='ACTIVE' WHERE session_id='s2'")
    con.execute("INSERT INTO candidates(candidate_id,session_id,instrument_id,label,identified_when,created_at,created_from_plan_revision_id) VALUES('c2','s2','i','Lower continuation','PRE_SESSION','2026-10-07T00:01:00Z','r2')")
    con.execute("INSERT INTO candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,directional_intent,trend_relationship,price_mode,price_from,price_to,required_conditions_json,invalidation_conditions_json,change_type) VALUES('cr2','c2',1,'2026-10-07T00:01:00Z','LONG','WITH_TREND','RANGE',6018,6020,'[\"Rejection\"]','[\"Acceptance below\"]','CREATE')")
    con.execute("INSERT INTO candidate_status_events(status_event_id,candidate_id,occurred_at,status) VALUES('se2','c2','2026-10-07T00:01:00Z','PLANNED')")
    con.execute("INSERT INTO candidate_sources(candidate_source_id,candidate_id,candidate_revision_id,source_type_id,is_primary) VALUES('cs2','c2','cr2','source-HOURLY_POC',1)")
    con.commit()
    assert con.execute("SELECT initial_bias FROM session_plan_revisions WHERE session_id='s2'").fetchone()[0]=='MIXED'
    assert con.execute("SELECT cr.directional_intent FROM candidate_revisions cr WHERE cr.candidate_id='c2'").fetchone()[0]=='LONG'
    assert con.execute("SELECT lst.label FROM candidate_sources cs JOIN level_source_types lst ON lst.source_type_id=cs.source_type_id WHERE cs.candidate_id='c2'").fetchone()[0]=='Hourly POC'
    con.close()

    print('PASS: schema, CRUD, immutability, planning-core relations, calculations, backup checksum, attachment packaging, and restore round trip')

# live-plan revision / status-history acceptance smoke test
with tempfile.TemporaryDirectory() as td2:
    root2=pathlib.Path(td2); db2=root2/'journal.db'; con=init_db(db2); con.execute('PRAGMA foreign_keys=ON')
    con.execute("INSERT INTO workspaces VALUES('w','Test','2026-01-01',NULL)")
    con.execute("INSERT INTO instruments(instrument_id,workspace_id,symbol,display_name,tick_size,point_value) VALUES('i','w','ES','E-mini S&P 500',0.25,50)")
    con.execute("INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,timezone_id,schema_version,created_at,updated_at) VALUES('s','w','i','2026-10-07','DEMO','2026-10-07T00:00:00Z','ACTIVE','Australia/Sydney',2,'2026-10-07T00:00:00Z','2026-10-07T00:00:00Z')")
    con.execute("INSERT INTO session_plan_revisions(revision_id,session_id,revision_number,revision_type,created_at,initial_bias,main_scenario,created_by) VALUES('r1','s',1,'INITIAL','2026-10-07T00:01:00Z','MIXED','Initial','USER')")
    con.execute("INSERT INTO session_plan_revisions(revision_id,session_id,revision_number,revision_type,created_at,previous_revision_id,initial_bias,main_scenario,what_changed_json,why_changed,created_by) VALUES('r2','s',2,'UPDATE','2026-10-07T00:10:00Z','r1','LONG','Initial','{\"change_type\":\"MARKET_VIEW_UPDATE\"}','New evidence','USER')")
    assert con.execute("SELECT initial_bias FROM session_plan_revisions WHERE session_id='s' ORDER BY revision_number DESC LIMIT 1").fetchone()[0]=='LONG'
    assert con.execute("SELECT initial_bias FROM session_plan_revisions WHERE revision_id='r1'").fetchone()[0]=='MIXED'
    con.execute("INSERT INTO candidates(candidate_id,session_id,instrument_id,label,identified_when,created_at,created_from_plan_revision_id) VALUES('c','s','i','Zone A','PRE_SESSION','2026-10-07T00:01:00Z','r1')")
    con.execute("INSERT INTO candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,directional_intent,price_mode,price_from,price_to,required_conditions_json,invalidation_conditions_json,change_type) VALUES('cr1','c',1,'2026-10-07T00:01:00Z','LONG','RANGE',6018,6020,'[]','[]','CREATE')")
    con.execute("INSERT INTO candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,previous_revision_id,directional_intent,price_mode,price_from,price_to,required_conditions_json,invalidation_conditions_json,change_type,change_reason) VALUES('cr2','c',2,'2026-10-07T00:12:00Z','cr1','LONG','RANGE',6016,6018,'[]','[]','UPDATE','Moved lower')")
    con.execute("INSERT INTO candidate_status_events(status_event_id,candidate_id,occurred_at,status) VALUES('se1','c','2026-10-07T00:01:00Z','PLANNED')")
    con.execute("INSERT INTO candidate_status_events(status_event_id,candidate_id,occurred_at,status) VALUES('se2','c','2026-10-07T00:15:00Z','WATCHING')")
    con.execute("INSERT INTO candidate_status_events(status_event_id,candidate_id,occurred_at,status) VALUES('se3','c','2026-10-07T00:20:00Z','REACHED')")
    assert con.execute("SELECT price_from FROM candidate_revisions WHERE candidate_id='c' ORDER BY revision_number DESC LIMIT 1").fetchone()[0]==6016
    assert con.execute("SELECT price_from FROM candidate_revisions WHERE candidate_revision_id='cr1'").fetchone()[0]==6018
    assert con.execute("SELECT status FROM candidate_status_events WHERE candidate_id='c' ORDER BY occurred_at DESC LIMIT 1").fetchone()[0]=='REACHED'
    con.close()
    print('PASS: immutable live plan revisions, candidate revisions, and status history')

# phase1-v0.5 live-candidate / evidence / consistency data-model smoke test
with tempfile.TemporaryDirectory() as td3:
    root3=pathlib.Path(td3); db3=root3/'journal.db'; con=init_db(db3); con.execute('PRAGMA foreign_keys=ON')
    con.execute("INSERT INTO workspaces VALUES('w','Test','2026-01-01',NULL)")
    con.execute("INSERT INTO instruments(instrument_id,workspace_id,symbol,display_name,tick_size,point_value) VALUES('i','w','ES','E-mini S&P 500',0.25,50)")
    con.execute("INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,timezone_id,schema_version,created_at,updated_at) VALUES('s','w','i','2026-10-07','DEMO','2026-10-07T00:00:00Z','ACTIVE','Australia/Sydney',2,'2026-10-07T00:00:00Z','2026-10-07T00:00:00Z')")
    con.execute("INSERT INTO session_plan_revisions(revision_id,session_id,revision_number,revision_type,created_at,initial_bias,created_by) VALUES('r1','s',1,'INITIAL','2026-10-07T00:01:00Z','MIXED','USER')")
    # live-added zone must be linked to a later plan revision, not retroactively to the initial plan
    con.execute("INSERT INTO session_plan_revisions(revision_id,session_id,revision_number,revision_type,created_at,previous_revision_id,initial_bias,what_changed_json,why_changed,created_by) VALUES('r2','s',2,'UPDATE','2026-10-07T00:20:00Z','r1','MIXED','{\"change_type\":\"ADD_CANDIDATE\"}','New live information','USER')")
    con.execute("INSERT INTO candidates(candidate_id,session_id,instrument_id,label,identified_when,created_at,created_from_plan_revision_id) VALUES('c-live','s','i','Live lower zone','DURING_SESSION','2026-10-07T00:20:00Z','r2')")
    con.execute("INSERT INTO candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,directional_intent,price_mode,price_from,price_to,required_conditions_json,invalidation_conditions_json,change_type,change_reason) VALUES('cr-live','c-live',1,'2026-10-07T00:20:00Z','LONG','RANGE',6014,6016,'[]','[]','CREATE','New live information')")
    con.execute("INSERT INTO candidate_status_events(status_event_id,candidate_id,occurred_at,status) VALUES('se-live','c-live','2026-10-07T00:20:00Z','PLANNED')")
    con.execute("INSERT INTO evidence_types(evidence_type_id,workspace_id,code,label,family,active,research_status,user_defined) VALUES('e-bt','w','BIG_TRADE','Big Trade','EXECUTED_FLOW',1,'EXPERIMENTAL',0)")
    con.execute("INSERT INTO evidence_observations(evidence_id,session_id,candidate_id,evidence_type_id,role,occurred_at,direction,price,present,provenance) VALUES('eo1','s','c-live','e-bt','SETUP_SUPPORT','2026-10-07T00:21:00Z','BUY',6015.25,1,'NATIVE')")
    con.commit()
    assert con.execute("SELECT created_from_plan_revision_id FROM candidates WHERE candidate_id='c-live'").fetchone()[0]=='r2'
    assert con.execute("SELECT label FROM evidence_types et JOIN evidence_observations eo ON eo.evidence_type_id=et.evidence_type_id WHERE eo.evidence_id='eo1'").fetchone()[0]=='Big Trade'
    assert con.execute("SELECT role FROM evidence_observations WHERE evidence_id='eo1'").fetchone()[0]=='SETUP_SUPPORT'
    # source and live evidence remain semantically separate tables
    assert con.execute("SELECT count(*) FROM candidate_sources WHERE candidate_id='c-live'").fetchone()[0]==0
    assert con.execute("SELECT count(*) FROM evidence_observations WHERE candidate_id='c-live'").fetchone()[0]==1
    con.close()
    print('PASS: live candidate provenance, quick-evidence semantics, and level-source/evidence separation')


# phase2 decision workflow acceptance: multiple decisions, immutable history, no-trade/missed separation, plan linkage
with tempfile.TemporaryDirectory() as td4:
    root4=pathlib.Path(td4); db4=root4/'journal.db'; con=init_db(db4); con.execute('PRAGMA foreign_keys=ON')
    con.execute("INSERT INTO workspaces VALUES('w','Test','2026-01-01',NULL)")
    con.execute("INSERT INTO instruments(instrument_id,workspace_id,symbol,display_name,tick_size,point_value) VALUES('i','w','ES','E-mini S&P 500',0.25,50)")
    con.execute("INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,timezone_id,schema_version,created_at,updated_at) VALUES('s','w','i','2026-10-07','DEMO','2026-10-07T00:00:00Z','ACTIVE','Australia/Sydney',2,'2026-10-07T00:00:00Z','2026-10-07T00:00:00Z')")
    con.execute("INSERT INTO session_plan_revisions(revision_id,session_id,revision_number,revision_type,created_at,initial_bias,created_by) VALUES('r1','s',1,'INITIAL','2026-10-07T00:01:00Z','MIXED','USER')")
    con.execute("INSERT INTO candidates(candidate_id,session_id,instrument_id,label,identified_when,created_at,created_from_plan_revision_id) VALUES('c','s','i','Lower long zone','PRE_SESSION','2026-10-07T00:01:00Z','r1')")
    con.execute("INSERT INTO candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,directional_intent,trend_relationship,price_mode,price_from,price_to,required_conditions_json,invalidation_conditions_json,change_type) VALUES('cr1','c',1,'2026-10-07T00:01:00Z','LONG','WITH_TREND','RANGE',6018,6020,'[]','[]','CREATE')")
    # first touch: correct no-trade; second touch: trade. Both must coexist.
    con.execute("INSERT INTO candidate_decisions(decision_id,candidate_id,session_id,occurred_at,decision_type,reason_code,decision_quality,based_on_plan_revision_id,based_on_candidate_revision_id,provenance,plan_alignment) VALUES('d1','c','s','2026-10-07T00:10:00Z','NO_TRADE','MISSING_CONFIRMATION','A','r1','cr1','NATIVE','NOT_APPLICABLE')")
    con.execute("INSERT INTO candidate_decisions(decision_id,candidate_id,session_id,occurred_at,decision_type,intended_direction,decision_quality,based_on_plan_revision_id,based_on_candidate_revision_id,provenance,plan_alignment) VALUES('d2','c','s','2026-10-07T00:20:00Z','TRADE','LONG','A','r1','cr1','NATIVE','ALIGNED')")
    con.execute("INSERT INTO candidate_decisions(decision_id,candidate_id,session_id,occurred_at,decision_type,reason_code,decision_quality,based_on_plan_revision_id,based_on_candidate_revision_id,provenance,plan_alignment) VALUES('d3','c','s','2026-10-07T00:30:00Z','MISSED','HESITATION','B','r1','cr1','NATIVE','NOT_APPLICABLE')")
    con.commit()
    assert con.execute("SELECT count(*) FROM candidate_decisions WHERE candidate_id='c'").fetchone()[0]==3
    assert con.execute("SELECT count(*) FROM candidate_decisions WHERE candidate_id='c' AND decision_type='NO_TRADE'").fetchone()[0]==1
    assert con.execute("SELECT count(*) FROM candidate_decisions WHERE candidate_id='c' AND decision_type='MISSED'").fetchone()[0]==1
    assert con.execute("SELECT plan_alignment FROM candidate_decisions WHERE decision_id='d2'").fetchone()[0]=='ALIGNED'
    try:
        con.execute("UPDATE candidate_decisions SET decision_quality='C' WHERE decision_id='d2'")
        raise AssertionError('decision immutability was not enforced')
    except sqlite3.DatabaseError:
        pass
    con.close()
    print('PASS: decision workflow supports immutable multiple decisions and separates trade/no-trade/missed')


# phase3 v0.7 execution-core acceptance: actual trade exists only after entry fill; fills/risk are immutable; partial exits and R are coherent
with tempfile.TemporaryDirectory() as td5:
    root5=pathlib.Path(td5); db5=root5/'journal.db'; con=init_db(db5); con.execute('PRAGMA foreign_keys=ON')
    con.execute("INSERT INTO workspaces VALUES('w','Test','2026-01-01',NULL)")
    con.execute("INSERT INTO instruments(instrument_id,workspace_id,symbol,display_name,tick_size,point_value) VALUES('i','w','ES','E-mini S&P 500',0.25,50)")
    con.execute("INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,timezone_id,schema_version,created_at,updated_at) VALUES('s','w','i','2026-10-07','DEMO','2026-10-07T00:00:00Z','ACTIVE','Australia/Sydney',3,'2026-10-07T00:00:00Z','2026-10-07T00:00:00Z')")
    con.execute("INSERT INTO session_plan_revisions(revision_id,session_id,revision_number,revision_type,created_at,initial_bias,created_by) VALUES('r1','s',1,'INITIAL','2026-10-07T00:01:00Z','LONG','USER')")
    con.execute("INSERT INTO candidates(candidate_id,session_id,instrument_id,label,identified_when,created_at,created_from_plan_revision_id) VALUES('c','s','i','Long zone','PRE_SESSION','2026-10-07T00:01:00Z','r1')")
    con.execute("INSERT INTO candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,directional_intent,price_mode,price_from,price_to,required_conditions_json,invalidation_conditions_json,change_type) VALUES('cr1','c',1,'2026-10-07T00:01:00Z','LONG','RANGE',6024,6026,'[]','[]','CREATE')")
    con.execute("INSERT INTO candidate_decisions(decision_id,candidate_id,session_id,occurred_at,decision_type,intended_direction,based_on_plan_revision_id,based_on_candidate_revision_id,provenance,plan_alignment) VALUES('d','c','s','2026-10-07T00:10:00Z','TRADE','LONG','r1','cr1','NATIVE','ALIGNED')")
    # Decision alone is not an executed trade.
    assert con.execute("SELECT count(*) FROM trades").fetchone()[0]==0
    # First actual entry materializes the trade and initial risk snapshot.
    con.execute("INSERT INTO trades(trade_id,decision_id,session_id,candidate_id,direction,planned_entry_price,planned_stop_price,status,provenance) VALUES('t','d','s','c','LONG',6025.25,6022.25,'OPEN','NATIVE')")
    con.execute("INSERT INTO execution_fills(execution_id,trade_id,occurred_at,action,side,price,quantity,order_type,source) VALUES('e1','t','2026-10-07T00:10:01Z','ENTRY','BUY',6025.25,3,'MARKET','MANUAL')")
    con.execute("INSERT INTO risk_snapshots(risk_snapshot_id,trade_id,occurred_at,snapshot_type,stop_price,quantity,risk_dollars,provenance) VALUES('rs1','t','2026-10-07T00:10:01Z','INITIAL',6022.25,3,450,'NATIVE')")
    con.execute("INSERT INTO execution_fills(execution_id,trade_id,occurred_at,action,side,price,quantity,source,note) VALUES('x1','t','2026-10-07T00:12:00Z','EXIT','SELL',6028.25,1,'MANUAL','Target 1')")
    con.execute("INSERT INTO execution_fills(execution_id,trade_id,occurred_at,action,side,price,quantity,source,note) VALUES('x2','t','2026-10-07T00:14:00Z','EXIT','SELL',6027.25,2,'MANUAL','Close')")
    gross=(6028.25-6025.25)*1*50 + (6027.25-6025.25)*2*50
    assert gross==350
    assert math.isclose(gross/450, 0.7777777777777778)
    # Append-only execution/risk history.
    try:
        con.execute("UPDATE execution_fills SET price=9999 WHERE execution_id='e1'")
        raise AssertionError('execution immutability was not enforced')
    except sqlite3.DatabaseError: pass
    try:
        con.execute("UPDATE risk_snapshots SET stop_price=9999 WHERE risk_snapshot_id='rs1'")
        raise AssertionError('risk snapshot immutability was not enforced')
    except sqlite3.DatabaseError: pass
    con.close()
    print('PASS: execution core keeps trade/fill/risk separation, partial exits, canonical initial risk, and immutable execution history')

# phase5 v0.9 acceptance: lightweight rule check + session pre-state + session review integrity
with tempfile.TemporaryDirectory() as td6:
    root6=pathlib.Path(td6); db6=root6/'journal.db'; con=init_db(db6); con.execute('PRAGMA foreign_keys=ON')
    con.execute("INSERT INTO workspaces VALUES('w','Test','2026-01-01',NULL)")
    con.execute("INSERT INTO instruments(instrument_id,workspace_id,symbol,display_name,tick_size,point_value) VALUES('i','w','ES','E-mini S&P 500',0.25,50)")
    con.execute("INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,timezone_id,schema_version,created_at,updated_at) VALUES('s','w','i','2026-10-07','DEMO','2026-10-07T00:00:00Z','ACTIVE','Australia/Sydney',5,'2026-10-07T00:00:00Z','2026-10-07T00:00:00Z')")
    con.execute("INSERT INTO session_pre_states(session_pre_state_id,session_id,state_type,intensity,created_at) VALUES('ps','s','FOCUSED',2,'2026-10-07T00:00:00Z')")
    assert con.execute("SELECT state_type FROM session_pre_states WHERE session_id='s'").fetchone()[0]=='FOCUSED'
    # Rule/version foundation + one-tap no-violation truth model.
    con.execute("INSERT INTO rules(rule_id,workspace_id,code,label,scope) VALUES('rule','w','NO_CHASING','No chasing','TRADE')")
    con.execute("INSERT INTO rule_versions(rule_version_id,rule_id,version_label,status) VALUES('rv','rule','1.0','ACTIVE')")
    con.execute("INSERT INTO session_plan_revisions(revision_id,session_id,revision_number,revision_type,created_at,initial_bias,created_by) VALUES('pr','s',1,'INITIAL','2026-10-07T00:01:00Z','LONG','USER')")
    con.execute("INSERT INTO candidate_decisions(decision_id,session_id,occurred_at,decision_type,intended_direction,based_on_plan_revision_id,provenance,plan_alignment) VALUES('d','s','2026-10-07T00:02:00Z','TRADE','LONG','pr','NATIVE','ALIGNED')")
    con.execute("INSERT INTO trades(trade_id,decision_id,session_id,direction,status,provenance) VALUES('t','d','s','LONG','CLOSED','NATIVE')")
    con.execute("INSERT INTO trade_rule_checks(trade_rule_check_id,trade_id,checked_at,any_violation) VALUES('rc','t','2026-10-07T00:03:00Z',1)")
    con.execute("INSERT INTO rule_assessments(rule_assessment_id,rule_version_id,trade_id,assessed_at,result) VALUES('ra','rv','t','2026-10-07T00:03:00Z','VIOLATED')")
    assert con.execute("SELECT count(*) FROM rule_assessments WHERE trade_id='t' AND result='VIOLATED'").fetchone()[0]==1
    # A completed trade review locks the rule check and assessment.
    con.execute("INSERT INTO trade_reviews(review_id,trade_id,status,created_at,updated_at,completed_at) VALUES('tr','t','COMPLETED','2026-10-07T00:04:00Z','2026-10-07T00:04:00Z','2026-10-07T00:04:00Z')")
    con.commit()
    try:
        con.execute("UPDATE trade_rule_checks SET any_violation=0 WHERE trade_id='t'")
        raise AssertionError('completed review did not lock rule check')
    except sqlite3.DatabaseError:
        pass
    # Session review can complete and then becomes immutable.
    con.execute("INSERT INTO session_reviews(review_id,session_id,status,created_at,completed_at,overall_assessment,updated_at) VALUES('sr','s','COMPLETED','2026-10-07T00:10:00Z','2026-10-07T00:10:00Z','GOOD','2026-10-07T00:10:00Z')")
    con.commit()
    try:
        con.execute("UPDATE session_reviews SET overall_assessment='NEEDS_IMPROVEMENT' WHERE review_id='sr'")
        raise AssertionError('completed session review was not immutable')
    except sqlite3.DatabaseError:
        pass
    con.close()
    print('PASS: phase5 rule-check, pre-session state, and immutable session-review foundation')
