import type {CandidateDecision} from './services/localApi';

/** Read-only saved decision history. Does not create or modify a Decision. */
export function DecisionHistoryList({rows,limit=12}:{rows:readonly CandidateDecision[];limit?:number}){
  if(!rows.length)return <p className="subtle">No saved Decisions for this Zone.</p>;
  return <div className="decisionHistoryList" aria-label="Saved Decision history">
    {rows.slice(0,limit).map(d=>
      <details className="savedDecisionRecord" key={d.decision_id}>
        <summary>
          <span className="savedDecisionWhen">{d.occurred_at}</span>
          <strong>{d.decision_type}{d.intended_direction?' · '+d.intended_direction:''}</strong>
          <span className="savedDecisionReason">{d.reason_code||d.plan_alignment||'—'}</span>
        </summary>
        <div className="savedDecisionDetails">
          <p><b>Decision ID:</b> <span>{d.decision_id}</span></p>
          <p><b>Recorded reason:</b> <span>{d.reason_code||'Not recorded'}</span></p>
          <p><b>Decision note:</b> <span>{d.reason_note||'No note recorded'}</span></p>
          <p><b>Decision quality:</b> <span>{d.decision_quality||'Not recorded'}</span></p>
          {d.plan_mismatch_reason&&<p><b>Opposite-plan reason:</b> <span>{d.plan_mismatch_reason}</span></p>}
          <small>Read-only saved history. Opening details does not edit or duplicate a Decision.</small>
        </div>
      </details>)}
  </div>;
}

/** A TRADE Decision without execution is not an executed Trade or Fill. */
export function PendingTradeDecisionRow({decision,current,onResume,disabled=false}:{
  decision:CandidateDecision;current:boolean;disabled?:boolean;onResume:()=>void;
}){
  return <div className="pendingDecisionRecord">
    <div className="pendingDecisionInfo">
      <time className="savedDecisionWhen">{decision.occurred_at}</time>
      <strong>{decision.intended_direction??'Unknown direction'} · Zone {decision.candidate_id??'Unplanned'}</strong>
      <small>Decision ID: {decision.decision_id}{decision.reason_code?' · '+decision.reason_code:''}</small>
    </div>
    <button type="button" disabled={disabled||current} onClick={onResume}>{current?'Current entry':'Resume original Decision'}</button>
  </div>;
}
