import {useMemo,useState} from 'react';
import type {JournalTradeRow} from './services/localApi';
import {setupPlaybookCandidate} from './setupPlaybookCandidate';

/** Phase #10 readiness: read-only reuse of a persisted closed Trade, not an
 * unapproved versioned Setup Playbook schema or a trading signal.
 */
export function SetupPlaybookCandidatePanel({rows}:{rows:readonly JournalTradeRow[]}){
  const [tradeId,setTradeId]=useState('');
  const candidates=rows.filter(x=>x.status==='CLOSED');
  const chosen=candidates.find(x=>x.trade_id===tradeId);
  const draft=useMemo(()=>chosen?setupPlaybookCandidate(chosen):'', [chosen]);
  return <section className="panel" aria-label="Setup Playbook candidate — historical source only">
    <div className="panelTitle"><div><h2>Setup Playbook candidate · read-only</h2>
    <p className="subtle">Reuse a saved closed Trade to prepare a draft without retyping its ID, source Zone, decision-time provenance or quality. No Setup is saved or approved here.</p></div></div>
    <label>Historical Trade (current analysis filters)
      <select value={chosen?tradeId:''} onChange={e=>setTradeId(e.target.value)}>
        <option value="">Choose a CLOSED saved Trade…</option>
        {candidates.map(x=><option key={x.trade_id} value={x.trade_id}>
          {x.session_date} · {x.instrument_symbol} · {x.candidate_label||'Unplanned'} · {x.trade_id.slice(-8)}
        </option>)}
      </select>
    </label>
    {draft&&<label>Source-backed draft text to review / copy
      <textarea readOnly rows={17} value={draft} aria-label="Read-only setup playbook candidate"/>
    </label>}
    <p className="subtle">Not an entry signal or a validated edge. Prerequisites, contrary evidence, invalidation and setup versions are not inferred. The future editable versioned Playbook needs its own approved schema and acceptance tests.</p>
  </section>;
}
