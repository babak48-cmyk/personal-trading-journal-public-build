//! Package B cohesive SQLite acceptance: two independent decisions in one Zone,
//! chronological fills, partial exits, risk history, net R and deferred review.
//! Runs ONLY on a temporary in-memory database; never uses AppPaths/user files.
use super::*;
use crate::db;

fn fill(trade_id:&str, action:&str, price:f64, quantity:f64, total_cost:f64)->AddTradeFillInput {
    AddTradeFillInput {
        trade_id:trade_id.into(), action:action.into(), price, quantity,
        order_type:Some("MARKET".into()), commission:Some(total_cost-0.5),
        fees:Some(0.5), note:None,
    }
}

fn review(trade_id:&str, finalize:bool, emotion:Option<bool>)->SaveTradeReviewInput {
    SaveTradeReviewInput {
        trade_id:trade_id.into(), decision_quality:Some("A".into()),
        execution_quality:Some("GOOD".into()),
        management_quality:Some("ACCEPTABLE".into()), exit_reason_code:None,
        exit_reason_note:None, emotion_affected:emotion,
        psychology_state:if emotion==Some(true){Some("HESITATION".into())}else{None},
        psychology_intensity:None,
        psychology_stage:if emotion==Some(true){Some("ENTRY".into())}else{None},
        mistake_type_ids:vec![],note:None, finalize:Some(finalize),
    }
}

#[test]
fn one_zone_two_trades_partial_exit_cost_risk_and_deferred_reviews_remain_independent() {
    let mut conn=Connection::open_in_memory().unwrap();
    conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
    db::migrate(&conn).unwrap();
    ensure_default_workspace(&conn).unwrap();
    // Two owner Sessions share the same ES instrument; all observed amounts here
    // are synthetic and defined in advance, not inferred trading results.
    conn.execute_batch("
      INSERT INTO sessions(session_id,workspace_id,instrument_id,session_date,environment,opened_at,status,created_at,updated_at)
      VALUES ('s1','default-workspace','instrument-ES','2026-11-15','DEMO','2026-11-15T08:00:00Z','ACTIVE','2026-11-15T08:00:00Z','2026-11-15T08:00:00Z'),
             ('s2','default-workspace','instrument-ES','2026-11-16','FORWARD_TEST','2026-11-16T08:00:00Z','ACTIVE','2026-11-16T08:00:00Z','2026-11-16T08:00:00Z');
      INSERT INTO session_plan_revisions(revision_id,session_id,revision_number,revision_type,created_at)
      VALUES ('p1','s1',1,'INITIAL','2026-11-15T08:01:00Z');
      INSERT INTO candidates(candidate_id,session_id,instrument_id,identified_when,created_at,created_from_plan_revision_id)
      VALUES ('zone-1','s1','instrument-ES','PRE_SESSION','2026-11-15T08:02:00Z','p1');
      INSERT INTO candidate_revisions(candidate_revision_id,candidate_id,revision_number,created_at,directional_intent,price_mode,change_type)
      VALUES ('zone-rev-1','zone-1',1,'2026-11-15T08:03:00Z','LONG','RANGE','INITIAL');
    ").unwrap();

    let decision_a=create_candidate_decision(&conn,CreateCandidateDecisionInput{
      session_id:"s1".into(),candidate_id:Some("zone-1".into()),
      decision_type:"TRADE".into(),intended_direction:Some("LONG".into()),
      reason_code:None,reason_note:None,decision_quality:None,
      decision_quality_note:None,plan_mismatch_reason:None,
    }).unwrap();
    let first=create_trade_with_entry(&mut conn,CreateTradeExecutionInput{
      decision_id:decision_a.decision_id.clone(),entry_price:5000.0,
      stop_price:4996.0,quantity:2.0,order_type:Some("MARKET".into()),
      planned_target_price:None,commission:Some(2.0),fees:Some(0.5),
    }).unwrap();
    assert_eq!(first.metrics.initial_risk_dollars,Some(400.0));
    assert_eq!(first.metrics.status,"OPEN");
    assert_eq!(first.risk_snapshots.len(),1);
    assert!(create_trade_with_entry(&mut conn,CreateTradeExecutionInput{
      decision_id:decision_a.decision_id.clone(),entry_price:5000.0,
      stop_price:4996.0,quantity:2.0,order_type:None,
      planned_target_price:None,commission:Some(0.0),fees:Some(0.0),
    }).is_err(),"One Decision must never create two Trades");
    let partial=add_trade_fill(&mut conn,fill(&first.metrics.trade_id,"EXIT",5004.0,1.0,2.5)).unwrap();
    assert_eq!(partial.metrics.status,"PARTIALLY_CLOSED");
    assert_eq!(partial.metrics.open_quantity,1.0);
    assert_eq!(partial.metrics.gross_realized_pnl,Some(200.0));
    assert_eq!(partial.metrics.net_realized_pnl,Some(195.0));
    assert!(add_trade_fill(&mut conn,fill(&first.metrics.trade_id,"EXIT",5008.0,2.0,2.5)).is_err(),
      "Excess exits must not write a fill");
    let changed=move_trade_stop(&mut conn,MoveStopInput{
      trade_id:first.metrics.trade_id.clone(),stop_price:4998.0,
      reason:Some("Risk reduced after partial exit".into()),was_rule_compliant:Some(true),
    }).unwrap();
    assert_eq!(changed.risk_snapshots.len(),2);
    assert_eq!(changed.risk_snapshots[1].quantity,Some(1.0));
    assert_eq!(changed.metrics.initial_risk_dollars,Some(400.0),
       "Changing stop must never rewrite original R denominator");
    let closed_a=add_trade_fill(&mut conn,fill(&first.metrics.trade_id,"EXIT",5008.0,1.0,2.5)).unwrap();
    assert_eq!(closed_a.metrics.status,"CLOSED");
    assert_eq!(closed_a.metrics.gross_realized_pnl,Some(600.0));
    assert_eq!(closed_a.metrics.net_realized_pnl,Some(592.5));
    assert_eq!(closed_a.metrics.realized_r,Some(592.5/400.0));
    assert_eq!(closed_a.fills.len(),3);
    assert!(add_trade_fill(&mut conn,fill(&first.metrics.trade_id,"EXIT",5010.0,1.0,2.5)).is_err());

    let decision_b=create_candidate_decision(&conn,CreateCandidateDecisionInput{
      session_id:"s1".into(),candidate_id:Some("zone-1".into()),
      decision_type:"TRADE".into(),intended_direction:Some("LONG".into()),
      reason_code:None,reason_note:Some("Fresh independent attempt".into()),
      decision_quality:None,decision_quality_note:None,plan_mismatch_reason:None,
    }).unwrap();
    assert_ne!(decision_a.decision_id,decision_b.decision_id);
    assert_eq!(decision_a.based_on_candidate_revision_id,decision_b.based_on_candidate_revision_id);
    let second=create_trade_with_entry(&mut conn,CreateTradeExecutionInput{
      decision_id:decision_b.decision_id.clone(),entry_price:5005.0,
      stop_price:5001.0,quantity:1.0,order_type:None,
      planned_target_price:None,commission:Some(2.0),fees:Some(0.5),
    }).unwrap();
    assert_ne!(first.metrics.trade_id,second.metrics.trade_id);
    let closed_b=add_trade_fill(&mut conn,fill(&second.metrics.trade_id,"EXIT",5001.0,1.0,2.5)).unwrap();
    assert_eq!(closed_b.metrics.gross_realized_pnl,Some(-200.0));
    assert_eq!(closed_b.metrics.net_realized_pnl,Some(-205.0));
    assert_eq!(closed_b.metrics.realized_r,Some(-1.025));
    assert_eq!(closed_b.metrics.initial_risk_dollars,Some(200.0));

    // Quick review may be deferred. A saved draft is not a final judgment.
    let draft=save_trade_review(&mut conn,review(&first.metrics.trade_id,false,None)).unwrap();
    assert_eq!(draft.status,"DRAFT");
    let completed=save_trade_review(&mut conn,review(&second.metrics.trade_id,true,Some(true))).unwrap();
    assert_eq!(completed.status,"COMPLETED");
    assert_eq!(completed.psychology_stage.as_deref(),Some("ENTRY"));
    assert!(save_trade_review(&mut conn,review(&second.metrics.trade_id,false,Some(false))).is_err());

    let pending=list_cross_session_pending_reviews(&conn,250).unwrap();
    assert_eq!(pending.len(),1);
    assert_eq!(pending[0].trade_id,first.metrics.trade_id);
    assert_eq!(pending[0].review_status,"DRAFT");
    assert_eq!(pending[0].session.session_id,"s1");
    assert_eq!(pending[0].session.environment,"DEMO");

    // Finalizing one historical Review must not affect the other trade's
    // decision, fills, risk, metrics, or independent review history.
    save_trade_review(&mut conn,review(&first.metrics.trade_id,true,Some(false))).unwrap();
    assert!(list_cross_session_pending_reviews(&conn,250).unwrap().is_empty());
    assert_eq!(get_trade_detail(&conn,&second.metrics.trade_id).unwrap().metrics.realized_r,Some(-1.025));
    assert_eq!(db::integrity_check(&conn).unwrap(),"ok");
    assert_eq!(db::foreign_key_violation_count(&conn).unwrap(),0);
    let decisions:i64=conn.query_row(
      "SELECT COUNT(*) FROM candidate_decisions WHERE candidate_id='zone-1'",[],|r|r.get(0)
    ).unwrap();
    assert_eq!(decisions,2,"Original independent Decisions must remain immutable");
}
