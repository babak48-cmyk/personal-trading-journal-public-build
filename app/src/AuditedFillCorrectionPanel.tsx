import {useEffect,useRef,useState} from 'react';
import {auditedFillCorrectionEditable} from './auditedCorrectionReadiness';
import {localApi, type TradeDetail, type FillCorrectionField,
  type FillCorrectionInput, type FillCorrectionPreview,
  type CorrectionHistoryEvent} from './services/localApi';

/** Optional historical correction workspace; not displayed in live entry.
 * The original execution row is immutable. A backend preflight must pass
 * before explicit user confirmation and a transactional append-only write.
 */
export function AuditedFillCorrectionPanel({
  trade, readOnly, onApplied,
}:{
  trade:TradeDetail; readOnly:boolean;
  onApplied:(updated:TradeDetail)=>void;
}){
  const [executionId,setExecutionId]=useState('');
  const [field,setField]=useState<FillCorrectionField>('price');
  const [replacementInput,setReplacementInput]=useState('');
  const [replacementUnknown,setReplacementUnknown]=useState(false);
  const [reason,setReason]=useState('');
  const [preview,setPreview]=useState<FillCorrectionPreview|null>(null);
  const [previewKey,setPreviewKey]=useState('');
  const [history,setHistory]=useState<CorrectionHistoryEvent[]|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const requestEpoch=useRef(0);
  const saving=useRef(false);
  const editable=auditedFillCorrectionEditable(trade.metrics.status,readOnly,history!==null);
  const selected=trade.fills.find(x=>x.execution_id===executionId);
  const current=selected?(selected[field] as number|null|undefined)??null:null;

  useEffect(()=>{
    let cancelled=false;
    const epoch=++requestEpoch.current;
    setHistory(null);
    localApi.listTradeCorrectionHistory(trade.metrics.trade_id)
      .then(v=>{if(!cancelled&&epoch===requestEpoch.current)setHistory(v);})
      .catch(e=>{if(!cancelled&&epoch===requestEpoch.current)setMessage('Audit history could not be verified: '+String(e));});
    return ()=>{cancelled=true;requestEpoch.current++;};
  },[trade.metrics.trade_id]);

  /** Manual recovery after a failed history read or an uncertain write.
   * Never treat an unreadable ledger as an empty audit chain. */
  async function reloadAuditHistory(){
    if(busy||saving.current)return;
    const epoch=++requestEpoch.current;
    setHistory(null);setPreview(null);setPreviewKey('');
    setBusy(true);setMessage('Re-reading the complete immutable Fill audit history…');
    try{
      const [verified,fresh]=await Promise.all([
        localApi.listTradeCorrectionHistory(trade.metrics.trade_id),
        localApi.getTradeDetail(trade.metrics.trade_id),
      ]);
      if(epoch!==requestEpoch.current)return;
      if(fresh.metrics.trade_id!==trade.metrics.trade_id){
        throw new Error('Audit reload returned a different Trade identity.');
      }
      setHistory(verified);
      onApplied(fresh);
      setMessage('Fill audit and effective Trade values independently re-read. Review the refreshed Fill before any new correction.');
    }catch(e){
      if(epoch===requestEpoch.current)
        setMessage('Audit history still unavailable; correction locked: '+String(e));
    }finally{
      if(epoch===requestEpoch.current)setBusy(false);
    }
  }

  function invalidate(){
    requestEpoch.current++;
    setPreview(null);setPreviewKey('');
    setMessage('');
  }
  function request():FillCorrectionInput|null{
    if(!selected||!editable||!reason.trim())return null;
    if(!replacementUnknown&&replacementInput.trim()==='')return null;
    const value=replacementUnknown?null:Number(replacementInput);
    if(value!==null&&!Number.isFinite(value))return null;
    if(replacementUnknown&&!['fees','commission'].includes(field))return null;
    return {execution_id:selected.execution_id,field,expected_effective:current,
      replacement:value,reason:reason.trim()};
  }
  const key=(input:FillCorrectionInput)=>JSON.stringify(input);
  const money=(n:number|null)=>n===null?'Unknown':n.toFixed(2);
  const rLabel=(n:number|null)=>n===null?'Unknown':n.toFixed(3)+'R';

  async function checkPreview(){
    const input=request();
    if(!input){setMessage('Select a closed Trade Fill, enter a replacement and a correction reason.');return;}
    const epoch=++requestEpoch.current;
    setBusy(true);setPreview(null);setPreviewKey('');
    try{
      const result=await localApi.previewFillCorrection(input);
      if(epoch!==requestEpoch.current)return;
      if(result.trade_id!==trade.metrics.trade_id||
         result.execution_id!==input.execution_id||
         result.current_effective!==input.expected_effective){
        throw new Error('Preview does not match the selected Trade / Fill.');
      }
      setPreview(result);setPreviewKey(key(input));
      setMessage('Read the original and effective values and financial impact, then confirm separately.');
    }catch(e){if(epoch===requestEpoch.current)setMessage('Correction rejected: '+String(e));}
    finally{if(epoch===requestEpoch.current)setBusy(false);}
  }

  async function apply(){
    const input=request();
    if(!input||!preview||previewKey!==key(input)||busy||saving.current){
      setMessage('The preview is outdated. Preview the proposed correction again.');return;
    }
    if(!preview.explicit_confirmation_required){setMessage('Explicit confirmation was not verified.');return;}
    const epoch=++requestEpoch.current;
    saving.current=true;setBusy(true);
    // Write outcome may be uncertain if a post-commit read fails. Keep the
    // editor locked until the complete ledger is independently re-read.
    setHistory(null);
    try{
      const receipt=await localApi.recordFillCorrection(input);
      // A committed response is not enough: verify persisted trade and audit
      // from SQLite before marking success and updating the parent view.
      const [fresh,audit]=await Promise.all([
        localApi.getTradeDetail(trade.metrics.trade_id),
        localApi.listTradeCorrectionHistory(trade.metrics.trade_id),
      ]);
      if(epoch!==requestEpoch.current)return;
      if(fresh.metrics.trade_id!==trade.metrics.trade_id||
         !audit.some(x=>x.correction_id===receipt.correction_id)){
        throw new Error('Correction response could not be independently read back.');
      }
      setHistory(audit);
      onApplied(fresh);
      setPreview(null);setPreviewKey('');setReplacementInput('');
      setReason('');setReplacementUnknown(false);
      setMessage('Saved and verified correction '+receipt.correction_id+'. Original Fill preserved.');
    }catch(e){
      if(epoch===requestEpoch.current)
        setMessage('Save outcome is NOT verified. Reopen the Trade and audit history before retrying: '+String(e));
    }finally{saving.current=false;if(epoch===requestEpoch.current)setBusy(false);}
  }

  return <details className="guidedMore">
    <summary>Correct a recorded Fill / immutable audit history{history?.length?' · '+history.length+' correction(s)':''}</summary>
    <p className="subtle">Historical entry mistake only — not a new market event, stop move or Plan revision. Original Fill and every past correction remain recorded. This section never changes a Fill in place.</p>
    {history===null&&<p role="status">Audit history not verified yet. Historical corrections are disabled until the history can be read successfully.</p>}
    <button type="button" disabled={busy||saving.current} onClick={()=>void reloadAuditHistory()}>Re-read immutable Fill audit history</button>
    {history!==null&&history.length===0&&<p className="subtle">No historical corrections recorded for this Trade.</p>}
    {history?.map(h=><div className="decisionHistory" key={h.correction_id}>
      <time>{h.recorded_at_utc}</time>
      <b>{h.field} · revision {h.revision}</b>
      <small>Fill {h.execution_id.slice(-8)} · previous {h.previous??'UNKNOWN'} → effective {h.replacement??'UNKNOWN'} · {h.actor}</small>
      <small>{h.reason}</small>
    </div>)}
    {readOnly&&<p className="subtle" role="status">Editing is unavailable while saved Review verification is pending, a Review is completed, or unsaved Review inputs exist. The audit history remains readable.</p>}
    {editable&&<div className="formGrid">
      <label>Saved Fill
        <select value={executionId} disabled={busy} onChange={e=>{invalidate();setExecutionId(e.target.value);setReplacementInput('');}}>
          <option value="">Select original execution…</option>
          {trade.fills.map(f=><option key={f.execution_id} value={f.execution_id}>{f.action} · {f.side} · {f.quantity} @ {f.price} · {f.execution_id.slice(-8)}</option>)}
        </select>
      </label>
      <label>Recorded field
        <select value={field} disabled={busy} onChange={e=>{invalidate();setField(e.target.value as FillCorrectionField);setReplacementInput('');setReplacementUnknown(false);}}>
          <option value="price">Price</option>
          <option value="quantity">Quantity</option>
          <option value="commission">Commission (total per Fill)</option>
          <option value="fees">Fees (total per Fill)</option>
        </select>
      </label>
      <label>Current effective value <input readOnly value={selected?(current??'UNKNOWN'):''}/></label>
      <label>Correct replacement
        <input type="number" step="any" value={replacementInput} disabled={busy||replacementUnknown}
          onChange={e=>{invalidate();setReplacementInput(e.target.value);}}
          placeholder="Correct recorded number" />
      </label>
      {['commission','fees'].includes(field)&&<label>
        <input type="checkbox" checked={replacementUnknown} disabled={busy}
          onChange={e=>{invalidate();setReplacementUnknown(e.target.checked);}}/>
        Amount genuinely unknown (not zero)
      </label>}
      <label>Mandatory correction reason <textarea maxLength={500} rows={2} value={reason}
        disabled={busy} onChange={e=>{invalidate();setReason(e.target.value);}}
        placeholder="Why was the original entry incorrect?"/></label>
      <div className="rowActions">
        <button type="button" disabled={busy||!selected||!reason.trim()} onClick={()=>void checkPreview()}>
          {busy?'Checking…':'Preview effect — no save'}
        </button>
      </div>
    </div>}
    {preview&&previewKey===key(request()??{execution_id:'',field,expected_effective:null,replacement:null,reason:''})&&
      <div className="warningBox" role="group" aria-label="Audited correction confirmation">
        <strong>Confirm historical correction — separate irreversible audit event</strong>
        <p>Original {preview.original??'UNKNOWN'} · current {preview.current_effective??'UNKNOWN'} · replacement {preview.proposed_effective??'UNKNOWN'}.</p>
        <p>Gross: {money(preview.before.gross_realized_pnl)} → {money(preview.after.gross_realized_pnl)};
           Net: {money(preview.before.net_realized_pnl)} → {money(preview.after.net_realized_pnl)};
           R: {rLabel(preview.before.realized_r)} → {rLabel(preview.after.realized_r)}.</p>
        <p>Open contracts: {preview.before.open_quantity} → {preview.after.open_quantity}.
           Unknown cost fields: {preview.before.unknown_cost_fields} → {preview.after.unknown_cost_fields}.</p>
        <p><b>Reason:</b> {preview.reason}</p>
        <div className="rowActions">
          <button type="button" className="primary" disabled={busy} onClick={()=>void apply()}>
            {busy?'Saving…':'Confirm and append audited correction'}
          </button>
          <button type="button" disabled={busy} onClick={invalidate}>Cancel — do not save</button>
        </div>
      </div>}
    {message&&<p role="status" aria-live="polite">{message}</p>}
  </details>;
}
