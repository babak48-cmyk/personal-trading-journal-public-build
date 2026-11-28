import {useEffect,useRef,useState} from 'react';
import {verifiedSourceTypeReadback} from './nonFillCorrectionReadback';
import {localApi,type HistoricalSourceReadout,type SourceTypeCorrectionEvent,
type SourceTypeCorrectionRequest,type SourceTypeCorrectionPreview,
type LevelSourceType} from './services/localApi';

/** Historical classification correction. This is NOT an additional live Zone
 * revision, a new source observation, or evidence of a profitable setup.
 */
export function AuditedSourceCorrectionPanel({tradeId,readOnly,onApplied}:{
  tradeId:string;readOnly:boolean;onApplied:()=>void;
}){
  const [sources,setSources]=useState<HistoricalSourceReadout[]|null>(null);
  const [events,setEvents]=useState<SourceTypeCorrectionEvent[]|null>(null);
  const [types,setTypes]=useState<LevelSourceType[]|null>(null);
  const [selected,setSelected]=useState('');
  const [replacement,setReplacement]=useState('');
  const [reason,setReason]=useState('');
  const [preview,setPreview]=useState<SourceTypeCorrectionPreview|null>(null);
  const [signature,setSignature]=useState('');
  const [busy,setBusy]=useState(false);
  const [uncertain,setUncertain]=useState(false);
  const [message,setMessage]=useState('');
  const epoch=useRef(0),saveLock=useRef(false);
  const active=sources?.find(s=>s.candidate_source_id===selected);
  const invalid=()=>{epoch.current++;setPreview(null);setSignature('');setMessage('');};
  const request=():SourceTypeCorrectionRequest|null=>{
    if(readOnly||uncertain||!active||!replacement||reason.trim().length<5)return null;
    return {candidate_source_id:active.candidate_source_id,
      expected_effective_type_id:active.effective_source_type_id,
      expected_revision:active.revision,replacement_type_id:replacement,
      reason:reason.trim()};
  };
  async function reload(){
    if(busy||saveLock.current)return;
    const id=++epoch.current;
    setBusy(true);setUncertain(true);setPreview(null);setSignature('');
    try{
      const [all,history,sourceTypes]=await Promise.all([
        localApi.listTradeHistoricalSources(tradeId),
        localApi.listTradeSourceTypeCorrections(tradeId),
        localApi.listAllLevelSources()
      ]);
      if(id!==epoch.current)return;
      setSources(all);setEvents(history);setTypes(sourceTypes);setUncertain(false);
      setMessage('Historical source and audit history verified from local SQLite.');
    }catch(e){
      if(id===epoch.current){
        setUncertain(true);
        setMessage('Could not independently read source provenance; save blocked: '+String(e));
      }
    }finally{if(id===epoch.current)setBusy(false);}
  }
  useEffect(()=>{
    const id=++epoch.current;
    setSources(null);setEvents(null);setTypes(null);setSelected('');setReplacement('');
    setPreview(null);setUncertain(false);setMessage('');
    Promise.all([
      localApi.listTradeHistoricalSources(tradeId),
      localApi.listTradeSourceTypeCorrections(tradeId),
      localApi.listAllLevelSources()
    ]).then(([all,history,sourceTypes])=>{
      if(id!==epoch.current)return;
      setSources(all);setEvents(history);setTypes(sourceTypes);
    }).catch(e=>{
      if(id===epoch.current){setUncertain(true);setMessage('Source audit cannot be verified: '+String(e));}
    });
    return ()=>{epoch.current++;};
  },[tradeId]);
  async function check(){
    const input=request();
    if(!input){setMessage('Choose a saved source, a different type and a factual reason.');return;}
    const id=++epoch.current;setBusy(true);setPreview(null);
    try{
      const result=await localApi.previewSourceTypeCorrection(input);
      if(id!==epoch.current)return;
      if(result.candidate_source_id!==input.candidate_source_id||
         result.current_effective_type_id!==input.expected_effective_type_id||
         result.expected_revision!==input.expected_revision||
         result.replacement_type_id!==input.replacement_type_id||result.reason!==input.reason||result.candidate_revision_id!==active?.candidate_revision_id||!result.monetary_result_unchanged)
        throw new Error('Source preview does not match original Zone revision and current audit');
      setPreview(result);setSignature(JSON.stringify(input));
      setMessage('Read the historical type change, affected Decision sample, and reason before confirming.');
    }catch(e){if(id===epoch.current)setMessage('Correction rejected: '+String(e));}
    finally{if(id===epoch.current)setBusy(false);}
  }
  async function save(){
    const input=request();
    if(!input||!preview||signature!==JSON.stringify(input)||!preview.explicit_confirmation_required||
       saveLock.current||busy)return;
    saveLock.current=true;setBusy(true);const id=++epoch.current;
    try{
      const receipt=await localApi.recordSourceTypeCorrection(input);
      const [updated,history]=await Promise.all([
        localApi.listTradeHistoricalSources(tradeId),
        localApi.listTradeSourceTypeCorrections(tradeId)
      ]);
      if(id!==epoch.current)return;
      if(!verifiedSourceTypeReadback(input,receipt,history,updated))
        throw new Error('Correction could not be verified from saved historical source and audit');
      setSources(updated);setEvents(history);setPreview(null);setSignature('');
      setReplacement('');setReason('');
      onApplied();
      setMessage('Saved and independently verified. Original Zone revision and source row are unchanged.');
    }catch(e){
      if(id===epoch.current){
        setUncertain(true);setPreview(null);
        setMessage('Save outcome UNKNOWN; re-read source and audit before retry: '+String(e));
      }
    }finally{saveLock.current=false;if(id===epoch.current)setBusy(false);}
  }
  return <details className="guidedMore" aria-label="Audited historical Level Source type correction">
    <summary>Correct a recorded Level Source type · immutable historical audit</summary>
    <p className="subtle">Only use this when the source classification was entered incorrectly. A genuine change of market structure belongs to a later timestamped Zone revision. The original source, Decision revision and timestamps are preserved. This is not entry confirmation.</p>
    {sources===null?<p role="status">{uncertain?'Cannot verify source history; use re-read below.':'Reading saved Level Source history…'}</p>:sources.length===0?
      <p className="subtle">No saved source provenance tied to this Trade's original Decision revision.</p>:<>
      <div className="formGrid">
        <label>Historical Level Source
          <select value={selected} disabled={busy} onChange={e=>{invalid();setSelected(e.target.value);setReplacement('');}}>
            <option value="">Select source from saved Decision…</option>
            {sources.map(s=><option key={s.candidate_source_id} value={s.candidate_source_id}>{s.effective_label} · {s.candidate_source_id.slice(-8)}</option>)}
          </select>
        </label>
        {active&&<p className="subtle">Original classification: {active.original_label} · currently effective: {active.effective_label} · {active.revision} correction(s). Decision revision ID: {active.candidate_revision_id}</p>}
        {!readOnly&&!uncertain&&active&&<><label>Correct source type
          <select value={replacement} disabled={busy} onChange={e=>{invalid();setReplacement(e.target.value);}}>
            <option value="">Select historically correct type…</option>
            {(types??[]).filter(x=>x.source_type_id!==active.effective_source_type_id).map(t=>
              <option key={t.source_type_id} value={t.source_type_id}>{t.label}{!t.active?' (inactive historical option)':''}</option>)}
          </select>
        </label>
        <label>Mandatory reason for mistaken recorded classification
          <textarea rows={2} maxLength={500} value={reason} disabled={busy}
            onChange={e=>{invalid();setReason(e.target.value);}}
            placeholder="What was entered incorrectly, and what establishes the original correct type?"/>
        </label>
        <button type="button" disabled={busy||!request()} onClick={()=>void check()}>Preview historical source correction</button></>}
      </div>
      {events?.map(e=><div className="decisionHistory" key={e.correction_id}>
        <time>{e.recorded_at_utc}</time><b>Revision {e.revision}: {e.previous_source_type_id} → {e.replacement_source_type_id}</b>
        <small>{e.reason} · audit {e.correction_id} · {e.actor}</small>
      </div>)}
      {preview&&request()&&signature===JSON.stringify(request())&&<div className="warningBox">
        <strong>Confirm historical correction — append-only</strong>
        <p>{preview.current_label} → {preview.replacement_label}. Original source ID {preview.original_source_type_id} remains preserved.</p>
        <p>Same original Zone revision. Related {preview.related_decision_count} Decision(s), {preview.related_trade_count} Trade(s) may appear under the corrected source in Analytics. Financial ledger and net R are unchanged.</p>
        <p>Reason: {preview.reason}</p>
        <button type="button" className="primary" disabled={busy} onClick={()=>void save()}>Confirm and append source correction</button>
        <button type="button" disabled={busy} onClick={invalid}>Cancel</button>
      </div>}
    </>}
    <button type="button" disabled={busy} onClick={()=>void reload()}>Re-read historical source and audit</button>
    {readOnly&&<p className="subtle">Historical correction is locked while saved Review verification or unsaved Review fields are unresolved.</p>}
    {message&&<p role="status" aria-live="polite">{message}</p>}
  </details>;
}
