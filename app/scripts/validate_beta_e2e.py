import sqlite3, tempfile, pathlib, uuid, json, hashlib, zipfile, shutil, statistics
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
MIG = ROOT / 'src-tauri' / 'migrations'

def uid(prefix): return f"{prefix}_{uuid.uuid4().hex[:12]}"
def now(i=0): return f"2026-10-07T0{8+i}:00:00+11:00"

def apply_migrations(conn):
    for f in sorted(MIG.glob('*.sql')):
        conn.executescript(f.read_text())
    conn.commit()


def calc_trade(conn, trade_id, point_value=50.0):
    rows=conn.execute("select action,side,price,quantity,coalesce(commission,0),coalesce(fees,0) from execution_fills where trade_id=? order by occurred_at, execution_id",(trade_id,)).fetchall()
    entries=[r for r in rows if r[0]=='ENTRY']; exits=[r for r in rows if r[0]=='EXIT']
    inqty=sum(r[3] for r in entries); outqty=sum(r[3] for r in exits)
    avg_entry=sum(r[2]*r[3] for r in entries)/inqty
    direction=conn.execute('select direction from trades where trade_id=?',(trade_id,)).fetchone()[0]
    sign=1 if direction=='LONG' else -1
    gross=sum(sign*(r[2]-avg_entry)*r[3]*point_value for r in exits)
    costs=sum(r[4]+r[5] for r in rows)
    net=gross-costs
    initial=conn.execute("select risk_dollars from risk_snapshots where trade_id=? and snapshot_type='INITIAL' order by occurred_at limit 1",(trade_id,)).fetchone()[0]
    rr=net/initial if initial else None
    return dict(inqty=inqty,outqty=outqty,avg_entry=avg_entry,gross=gross,net=net,r=rr)

with tempfile.TemporaryDirectory() as td:
    td=pathlib.Path(td)
    db=td/'journal.sqlite'
    conn=sqlite3.connect(db)
    conn.execute('pragma foreign_keys=on')
    apply_migrations(conn)

    ws=uid('ws'); inst=uid('inst'); strat=uid('strat'); sv=uid('sv'); sess=uid('sess')
    conn.execute("insert into workspaces values(?,?,?,null)",(ws,'Personal Trading',now()))
    conn.execute("insert into instruments(instrument_id,workspace_id,symbol,display_name,tick_size,point_value,currency,active) values(?,?,?,?,?,?,?,1)",(inst,ws,'ES','E-mini S&P 500',0.25,50.0,'USD'))
    conn.execute("insert into strategies(strategy_id,workspace_id,name,description,active) values(?,?,?,?,1)",(strat,ws,'Personal System','Zand-based PA + order flow'))
    conn.execute("insert into strategy_versions(strategy_version_id,strategy_id,version_label,status,effective_from,notes) values(?,?,?,?,?,?)",(sv,strat,'v1','ACTIVE',now(),'test'))
    conn.execute("insert into sessions(session_id,workspace_id,instrument_id,strategy_version_id,session_date,environment,opened_at,status,timezone_id,schema_version,created_at,updated_at,max_trades) values(?,?,?,?,?,?,?,?,?,?,?,?,?)",(sess,ws,inst,sv,'2026-10-07','DEMO',now(),'ACTIVE','Australia/Sydney',6,now(),now(),3))

    # pre-session state
    conn.execute("insert into session_pre_states values(?,?,?,?,?,?,?)",(uid('pre'),sess,'FOCUSED',2,None,now(),'NATIVE'))

    # initial plan then immutable revision
    pr1=uid('pr'); pr2=uid('pr')
    conn.execute("insert into session_plan_revisions(revision_id,session_id,revision_number,revision_type,created_at,initial_bias,market_posture,main_scenario,things_not_to_do_json,created_by,provenance) values(?,?,?,?,?,?,?,?,?,?,?)",(pr1,sess,1,'INITIAL',now(),'MIXED','Bullish / conditional','Long lower zone; conditional short upper',json.dumps(['NO_CHASING']),'USER','NATIVE'))
    conn.execute("insert into session_plan_revisions(revision_id,session_id,revision_number,revision_type,created_at,previous_revision_id,initial_bias,market_posture,main_scenario,what_changed_json,why_changed,new_evidence_summary,created_by,provenance) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(pr2,sess,2,'UPDATE',now(1),pr1,'LONG','Bullish','Upper short cancelled; long plan retained',json.dumps({'zone':'upper','action':'cancel'}),'Acceptance above upper zone','Price acceptance','USER','NATIVE'))
    try:
        conn.execute("update session_plan_revisions set initial_bias='SHORT' where revision_id=?",(pr1,))
        raise AssertionError('immutable plan update unexpectedly succeeded')
    except sqlite3.DatabaseError:
        pass

    # source registries
    src_poc=uid('src'); src_p3=uid('src'); ev_big=uid('evtype')
    conn.execute("insert into level_source_types values(?,?,?,?,?,?,?,?)",(src_poc,ws,'HOURLY_POC','Hourly POC','PRICE_AUCTION',1,0,'Hourly point of control'))
    conn.execute("insert into level_source_types values(?,?,?,?,?,?,?,?)",(src_p3,ws,'P3','P3','STRUCTURE',1,0,'Price-action structure'))
    conn.execute("insert into evidence_types values(?,?,?,?,?,?,?,?)",(ev_big,ws,'BIG_TRADE','Big Trade','EXECUTED_FLOW',1,'EXPERIMENTAL',0))

    cand=uid('cand'); cr1=uid('cr'); cr2=uid('cr')
    conn.execute("insert into candidates values(?,?,?,?,?,?,?,null)",(cand,sess,inst,'Lower Long Zone','PRE_SESSION',now(),pr1))
    conn.execute("insert into candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,directional_intent,trend_relationship,price_mode,price_from,price_to,required_conditions_json,invalidation_conditions_json,change_type,provenance) values(?,?,?,?,?,?,?,?,?,?,?,?,?)",(cr1,cand,1,now(),'LONG','CONTINUATION_AFTER_CORRECTION','RANGE',6018,6020,json.dumps(['REJECTION','BUY_EVIDENCE']),json.dumps(['ACCEPTANCE_BELOW']),'CREATE','NATIVE'))
    conn.execute("insert into candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,previous_revision_id,directional_intent,trend_relationship,price_mode,price_from,price_to,required_conditions_json,invalidation_conditions_json,change_type,change_reason,provenance) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(cr2,cand,2,now(1),cr1,'LONG','CONTINUATION_AFTER_CORRECTION','RANGE',6016,6018,json.dumps(['REJECTION','BUY_EVIDENCE']),json.dumps(['ACCEPTANCE_BELOW']),'MOVE','new hourly structure','NATIVE'))
    conn.execute("insert into candidate_sources values(?,?,?,?,?,?,?,?,?,?,?)",(uid('cs'),cand,cr2,src_poc,6017,None,None,now(1),'primary zone',1,'NATIVE'))
    conn.execute("insert into candidate_sources values(?,?,?,?,?,?,?,?,?,?,?)",(uid('cs'),cand,cr2,src_p3,6016.75,None,None,now(1),None,0,'NATIVE'))
    for i,status in enumerate(['PLANNED','WATCHING','REACHED','VALID']):
        conn.execute("insert into candidate_status_events values(?,?,?,?,?,?)",(uid('st'),cand,now(i),status,None,'NATIVE'))

    # first interaction NO_TRADE, second interaction TRADE
    d1=uid('dec'); d2=uid('dec')
    conn.execute("insert into candidate_decisions(decision_id,candidate_id,session_id,occurred_at,decision_type,reason_code,decision_quality,based_on_plan_revision_id,based_on_candidate_revision_id,provenance,intended_direction,plan_alignment) values(?,?,?,?,?,?,?,?,?,?,?,?)",(d1,cand,sess,now(2),'NO_TRADE','MISSING_CONFIRMATION','A',pr2,cr2,'NATIVE','LONG','ALIGNED'))
    conn.execute("insert into evidence_observations(evidence_id,session_id,candidate_id,evidence_type_id,role,occurred_at,direction,price,numeric_value,present,note,provenance) values(?,?,?,?,?,?,?,?,?,?,?,?)",(uid('evidence'),sess,cand,ev_big,'ENTRY_CONFIRMATION',now(3),'BUY',6017.25,120,1,'Big trade after second test','NATIVE'))
    conn.execute("insert into candidate_decisions(decision_id,candidate_id,session_id,occurred_at,decision_type,reason_code,decision_quality,based_on_plan_revision_id,based_on_candidate_revision_id,provenance,intended_direction,plan_alignment) values(?,?,?,?,?,?,?,?,?,?,?,?)",(d2,cand,sess,now(3),'TRADE','CONFIRMED','A',pr2,cr2,'NATIVE','LONG','ALIGNED'))

    trade=uid('trade')
    conn.execute("insert into trades(trade_id,decision_id,session_id,candidate_id,direction,planned_entry_price,planned_stop_price,planned_target_price,status,provenance) values(?,?,?,?,?,?,?,?,?,?)",(trade,d2,sess,cand,'LONG',6017.25,6014.25,6023.25,'CLOSED','NATIVE'))
    fills=[
        (uid('x'),now(3),'ENTRY','BUY',6017.25,3,'MARKET',3.0,0.0),
        (uid('x'),now(4),'EXIT','SELL',6020.25,1,'LIMIT',1.0,0.0),
        (uid('x'),now(5),'EXIT','SELL',6019.25,2,'LIMIT',2.0,0.0),
    ]
    for x,t,a,s,p,q,ot,c,f in fills:
        conn.execute("insert into execution_fills(execution_id,trade_id,occurred_at,action,side,price,quantity,order_type,commission,fees,source) values(?,?,?,?,?,?,?,?,?,?,?)",(x,trade,t,a,s,p,q,ot,c,f,'MANUAL'))
    conn.execute("insert into risk_snapshots values(?,?,?,?,?,?,?,?,?,?,?,?)",(uid('risk'),trade,now(3),'INITIAL',6014.25,3,450.0,None,1.0,'initial stop',1,'NATIVE'))
    conn.execute("insert into risk_snapshots values(?,?,?,?,?,?,?,?,?,?,?,?)",(uid('risk'),trade,now(4),'MODIFIED',6017.25,2,0.0,None,0.0,'break even',1,'NATIVE'))

    metrics=calc_trade(conn,trade)
    assert round(metrics['gross'],2)==350.00, metrics
    assert round(metrics['net'],2)==344.00, metrics
    assert round(metrics['r'],6)==round(344/450,6), metrics

    # review + psychology + mistake + rules
    mt=uid('mistype')
    conn.execute("insert into mistake_types values(?,?,?,?,?,?)",(mt,'EXIT_TOO_EARLY','Exit too early','EXIT',1,0))
    review=uid('review')
    conn.execute("insert into trade_reviews(review_id,trade_id,status,created_at,updated_at,completed_at,decision_quality,execution_quality,management_quality,exit_reason_code,emotion_affected,psychology_state,psychology_intensity,psychology_stage,note) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(review,trade,'COMPLETED',now(5),now(5),now(5),'A','GOOD','ACCEPTABLE','TARGET',1,'FEAR',3,'MANAGEMENT','fear affected management slightly'))
    conn.execute("insert into trade_mistakes values(?,?,?,?,?,?,?,?,?)",(uid('tm'),trade,review,mt,now(5),0.2,90.0,'trimmed too soon','NATIVE'))
    rule=uid('rule'); rv=uid('rv')
    conn.execute("insert into rules values(?,?,?,?,?,?,?)",(rule,ws,'NO_CHASING','No chasing','TRADE',1,0))
    conn.execute("insert into rule_versions values(?,?,?,?,?,?,?)",(rv,rule,'v1',now(),None,'Do not chase beyond planned entry area','ACTIVE'))
    conn.execute("insert into trade_rule_checks values(?,?,?,?,?,?)",(uid('trc'),trade,now(5),0,None,'NATIVE'))
    conn.execute("insert into rule_assessments values(?,?,?,?,?,?,?,?,?)",(uid('ra'),rv,trade,None,now(5),'FOLLOWED',None,None,'NATIVE'))

    # attachment + full backup roundtrip
    att_dir=td/'attachments'; att_dir.mkdir()
    shot=att_dir/'post_exit.png'; shot.write_bytes(b'fakepng-e2e-content')
    digest=hashlib.sha256(shot.read_bytes()).hexdigest()
    conn.execute("insert into attachments values(?,?,?,?,?,?,?,?,?,?,?,?,?)",(uid('att'),ws,'TRADE',trade,'POST_EXIT',now(5),'attachments/post_exit.png','post_exit.png','image/png',shot.stat().st_size,digest,'post exit',now(5)))

    # session review and close
    sr=uid('sr')
    conn.execute("insert into session_reviews(review_id,session_id,status,created_at,completed_at,what_went_well,next_improvement,overall_assessment,updated_at) values(?,?,?,?,?,?,?,?,?)",(sr,sess,'COMPLETED',now(6),now(6),'Waited for second interaction','Keep exit management calmer','GOOD',now(6)))
    conn.execute("update sessions set status='CLOSED', closed_at=?, updated_at=? where session_id=?",(now(6),now(6),sess))
    conn.commit()

    # reconciliation counts / referential integrity
    assert conn.execute('pragma integrity_check').fetchone()[0]=='ok'
    assert conn.execute('pragma foreign_key_check').fetchall()==[]
    counts={t:conn.execute(f'select count(*) from {t}').fetchone()[0] for t in ['sessions','session_plan_revisions','candidates','candidate_revisions','candidate_decisions','trades','execution_fills','risk_snapshots','trade_reviews','session_reviews','attachments']}
    assert counts['candidate_decisions']==2 and counts['execution_fills']==3 and counts['session_plan_revisions']==2

    # Ensure completed review really immutable
    try:
        conn.execute("update trade_reviews set decision_quality='C' where review_id=?",(review,))
        raise AssertionError('completed review update unexpectedly succeeded')
    except sqlite3.DatabaseError:
        pass

    # portable backup simulation with hash and attachment
    conn.commit(); conn.close()
    backup=td/'backup.zip'
    dbsha=hashlib.sha256(db.read_bytes()).hexdigest()
    manifest={'schema_version':6,'database_sha256':dbsha,'attachments':[{'path':'attachments/post_exit.png','sha256':digest}]}
    with zipfile.ZipFile(backup,'w',zipfile.ZIP_DEFLATED) as z:
        z.write(db,'database.sqlite')
        z.write(shot,'attachments/post_exit.png')
        z.writestr('manifest.json',json.dumps(manifest,indent=2))
    restore=td/'restore'; restore.mkdir()
    with zipfile.ZipFile(backup) as z: z.extractall(restore)
    assert hashlib.sha256((restore/'database.sqlite').read_bytes()).hexdigest()==dbsha
    assert hashlib.sha256((restore/'attachments/post_exit.png').read_bytes()).hexdigest()==digest
    rc=sqlite3.connect(restore/'database.sqlite')
    assert rc.execute('pragma integrity_check').fetchone()[0]=='ok'
    assert rc.execute('select count(*) from trades').fetchone()[0]==1
    assert rc.execute('select count(*) from candidate_decisions').fetchone()[0]==2
    rc.close()

print('PASS: full synthetic day Plan -> Revision -> Candidate -> Evidence -> NO_TRADE -> TRADE -> Fills -> Risk -> Review -> Rule -> Session Review -> Attachment -> Backup/Restore')
