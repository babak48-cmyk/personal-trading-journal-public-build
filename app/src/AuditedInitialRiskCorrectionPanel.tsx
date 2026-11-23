import {useEffect,useRef,useState} from 'react';
import {localApi,type TradeDetail,type InitialRiskCorrectionRequest,
  type InitialRiskCorrectionPreview,type InitialRiskCorrectionEvent} from './services/localApi';

/** Audited correction of mistaken INITIAL risk denominator only.
 * Never records a stop move, reinterprets entry or overwrites an original snapshot.
 */
export function AuditedInitialRiskCorrectionPanel({trade,readOnly,onApplied}:{
  trade:TradeDetail;readOnly:boolean;onApplied:(updated:TradeDetail)=>void;
}){
  const initial=trade.risk_snapshots.find(r=>r.snapshot_type==='INITIAL')??null;
  const [history,setHistory]=useState<InitialRiskCorrectionEvent[]|null>(null);
  const [amount,setAmount]=useState('');
  const [reason,setReason]=useState('');
  const [preview,setPreview]=useState<InitialRiskCorrectionPreview|null>(null);
  const [previewSignature,setPreviewSignature]=useState('');
  const [busy,setBusy]=useState(false);
  const [uncertain,setUncertain]=useState(false);
  const [message,setMessage]=useState('');
  const epoch=useRef(0),saving=useRef(false);
  const current=initial?.risk_dollars??null;
  const revision=history?.filter(h=>h.risk_snapshot_id===initial?.risk_snapshot_id).length??0;
  const input=():InitialRiskCorrectionRequest|null=>{
    if(!initial||readOnly||history===null||uncertain||!reason.trim()||amount.trim()==='')return null;
    const replacement=Number(amount);
    if(!Number.isFinite(replacement)||replacement<=0)return null;
    return {risk_snapshot_id:initial.risk_snapshot_id,expected_effective:current,
      expected_revision:revision,replacement,reason:reason.trim()};
  };
  const signature=(r:InitialRiskCorrectionRequest)=>JSON.stringify(r);
  const clear=()=>{epoch.current++;setPreview(null);setPreviewSignature('');setMessage('');};
  async function reload(){
    const stamp=++epoch.current;
    setBusy(true);setUncertain(false);setHistory(null);setPreview(null);setPreviewSignature('');
    try{
      const rows=await localApi.listInitialRiskCorrections(trade.metrics.trade_id);
      if(stamp===epoch.current){setHistory(rows);setMessage('Audited initial risk history independently re-read.');}
    }catch(e){
      if(stamp===epoch.current){setUncertain(true);setMessage('Audit history unavailable; correction locked: '+String(e));}
    }finally{if(stamp===epoch.current)setBusy(false);}
  }
  useEffect(()=>{
    const stamp=++epoch.current;
    setHistory(null);setPreview(null);setPreviewSignature('');setUncertain(false);setMessage('');
    localApi.listInitialRiskCorrections(trade.metrics.trade_id).then(rows=>{
      if(stamp===epoch.current)setHistory(rows);
    }).catch(e=>{
      if(stamp===epoch.current){setUncertain(true);setMessage('Cannot verify initial-risk audit history: '+String(e));}
    });
    return ()=>{epoch.current++;};
  },[trade.metrics.trade_id]);
  async function requestPreview(){
    const r=input();
    if(!r){setMessage('Select a closed Trade, positive amount, and a factual correction reason.');return;}
    const stamp=++epoch.current;setBusy(true);setPreview(null);
    try{
      const result=await localApi.previewInitialRiskCorrection(r);
      if(stamp!==epoch.current)return;
      if(result.trade_id!==trade.metrics.trade_id||
         result.risk_snapshot_id!==r.risk_snapshot_id||
         result.current_effective!==r.expected_effective||
         result.expected_revision!==r.expected_revision)
        throw new Error('Risk preview does not belong to this Trade or current revision');
      setPreview(result);setPreviewSignature(signature(r));
      setMessage('Inspect the original, current and proposed initial risk and net R before confirming.');
    }catch(e){if(stamp===epoch.current)setMessage('Risk correction refused: '+String(e));}
    finally{if(stamp===epoch.current)setBusy(false);}
  }
  async function confirm(){
    const r=input();
    if(!r||!preview||signature(r)!==previewSignature||!preview.explicit_confirmation_required||saving.current||busy){
      setMessage('Preflight is missing or outdated. Preview again.');return;
    }
    const stamp=++epoch.current;saving.current=true;setBusy(true);
    try{
      const receipt=await localApi.recordInitialRiskCorrection(r);
      const [updated,events]=await Promise.all([
        localApi.getTradeDetail(trade.metrics.trade_id),
        localApi.listInitialRiskCorrections(trade.metrics.trade_id)
      ]);
      if(stamp!==epoch.current)return;
      if(updated.metrics.trade_id!==trade.metrics.trade_id||
         updated.metrics.initial_risk_dollars!==r.replacement||
         !events.some(e=>e.correction_id===receipt.correction_id))
        throw new Error('Effective risk and audit revision could not both be verified');
      setHistory(events);onApplied(updated);setPreview(null);setPreviewSignature('');
      setAmount('');setReason('');setMessage('Confirmed and verified. Original INITIAL risk snapshot retained; new immutable audit event appended.');
    }catch(e){
      if(stamp===epoch.current){
        setUncertain(true);setPreview(null);
        setMessage('Save outcome is UNKNOWN; never retry until original Trade and audit are reloaded: '+String(e));
      }
    }finally{saving.current=false;if(stamp===epoch.current)setBusy(false);}
  }
  if(trade.metrics.status!=='CLOSED')return null;
  return <details className="guidedMore" aria-label="Historical initial risk correction and audit">
    <summary>Correct recorded INITIAL risk (not a Stop Move) · immutable audit</summary>
    <p className="subtle">Only correct an incorrect historical initial dollar-risk value. A subsequent Stop Move, risk adjustment, Plan revision or price move must be entered through its own lifecycle event, never through this correction. Net P&amp;L is unaffected; net R changes if costs and original risk are known.</p>
    {!initial?<p role="status">No original INITIAL risk snapshot exists for this Trade. No correction possible.</p>:<>
      <p className="subtle">Initial snapshot ID {initial.risk_snapshot_id} · current effective risk {current===null?'Unknown':current.toFixed(2)} · {revision} recorded correction(s)</p>
      {history?.map(h=><div className="decisionHistory" key={h.correction_id}>
        <time>{h.recorded_at_utc}</time><b>Revision {h.revision}: {h.previous_risk_dollars??'UNKNOWN'} → {h.replacement_risk_dollars}</b>
        <small>Original {h.original_risk_dollars??'UNKNOWN'} · audit ID {h.correction_id} · {h.actor}</small>
        <small>{h.reason}</small>
      </div>)}
      {history===null&&<p role="status">{uncertain?'Risk history unavailable':'Loading saved audit history…'}</p>}
      {readOnly&&<p className="subtle">This trade cannot be edited while verification or other unsaved review inputs are unresolved.</p>}
      {!readOnly&&history!==null&&!uncertain&&<div className="formGrid">
        <label>Correct recorded initial risk (USD)
          <input type="number" min="0.01" step="any" value={amount} disabled={busy}
            onChange={e=>{clear();setAmount(e.target.value);}} placeholder="Positive dollar risk"/></label>
        <label>Mandatory reason (historical mistake only)
          <textarea maxLength={500} rows={2} value={reason} disabled={busy}
            onChange={e=>{clear();setReason(e.target.value);}} placeholder="Explain why the ORIGINAL initial-risk entry was wrong"/></label>
        <button type="button" disabled={busy||!amount.trim()||reason.trim().length<5}
          onClick={()=>void requestPreview()}>Preview impact — do not save</button>
      </div>}
      {preview&&input()&&previewSignature===signature(input()!)&&<div className="warningBox" role="group" aria-label="Confirm initial risk correction">
        <strong>Separate immutable audit correction — explicit confirmation</strong>
        <p>Original: {preview.original??'Unknown'} · current: {preview.current_effective??'Unknown'} → corrected: {preview.replacement}</p>
        <p>Net P&amp;L (unchanged): {preview.net_realized_pnl??'Unknown'} · Net R {preview.before_net_r===null?'Unknown':preview.before_net_r.toFixed(3)+'R'} → {preview.after_net_r===null?'Unknown':preview.after_net_r.toFixed(3)+'R'}</p>
        <p>Reason: {preview.reason}</p>
        <div className="rowActions"><button type="button" className="primary" disabled={busy} onClick={()=>void confirm()}>Confirm audited initial-risk correction</button><button type="button" disabled={busy} onClick={clear}>Cancel</button></div>
      </div>}
    </>}
    <button type="button" disabled={busy} onClick={()=>void reload()}>Re-read immutable initial-risk history</button>
    {message&&<p role="status" aria-live="polite">{message}</p>}
  </details>;
}
