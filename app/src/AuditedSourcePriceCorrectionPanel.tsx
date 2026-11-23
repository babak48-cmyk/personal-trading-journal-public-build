import {useEffect,useRef,useState} from 'react';
import {localApi,type HistoricalSourceReadout,type SourcePriceCorrectionEvent,
 type SourcePriceCorrectionRequest,type SourcePriceCorrectionPreview} from './services/localApi';

/** Historical transcription only; never changes Zone geometry, actual fills or revisions. */
export function AuditedSourcePriceCorrectionPanel({tradeId,readOnly,onApplied}:{
 tradeId:string;readOnly:boolean;onApplied:()=>void;
}){
 const [sources,setSources]=useState<HistoricalSourceReadout[]|null>(null);
 const [events,setEvents]=useState<SourcePriceCorrectionEvent[]|null>(null);
 const [selected,setSelected]=useState('');
 const [price,setPrice]=useState('');
 const [reason,setReason]=useState('');
 const [preview,setPreview]=useState<SourcePriceCorrectionPreview|null>(null);
 const [signature,setSignature]=useState('');
 const [busy,setBusy]=useState(false);
 const [uncertain,setUncertain]=useState(false);
 const [message,setMessage]=useState('');
 const serial=useRef(0),saveLock=useRef(false);
 const active=sources?.find(x=>x.candidate_source_id===selected);
 const clear=()=>{serial.current++;setPreview(null);setSignature('');setMessage('');};
 const request=():SourcePriceCorrectionRequest|null=>{
   const replacement=Number(price);
   if(readOnly||uncertain||!active||price.trim()===''||
      !Number.isFinite(replacement)||replacement<=0||reason.trim().length<5)return null;
   return {candidate_source_id:active.candidate_source_id,
      expected_effective_price:active.effective_source_price,
      expected_revision:active.price_correction_revision,
      replacement_price:replacement,reason:reason.trim()};
 };
 async function reload(){
   const id=++serial.current;setBusy(true);setPreview(null);setSignature('');
   try{
     const [list,audit]=await Promise.all([
       localApi.listTradeHistoricalSources(tradeId),
       localApi.listTradeSourcePriceCorrections(tradeId)]);
     if(id!==serial.current)return;
     setSources(list);setEvents(audit);setUncertain(false);
     setMessage('Original and effective source prices independently re-read from SQLite.');
   }catch(e){
     if(id===serial.current){setUncertain(true);setMessage('Historical price/audit read-back unavailable; saving blocked: '+String(e));}
   }finally{if(id===serial.current)setBusy(false);}
 }
 useEffect(()=>{
   const id=++serial.current;
   setSources(null);setEvents(null);setSelected('');setPrice('');setReason('');
   setUncertain(false);setPreview(null);setSignature('');
   Promise.all([localApi.listTradeHistoricalSources(tradeId),localApi.listTradeSourcePriceCorrections(tradeId)])
     .then(([list,audit])=>{if(id===serial.current){setSources(list);setEvents(audit);}})
     .catch(e=>{if(id===serial.current){setUncertain(true);setMessage('Historical source/audit unreadable: '+String(e));}});
   return ()=>{serial.current++;};
 },[tradeId]);
 async function check(){
   const input=request();if(!input){setMessage('Select a source, enter a valid price and factual reason.');return;}
   const id=++serial.current;setBusy(true);setPreview(null);
   try{
     const result=await localApi.previewSourcePriceCorrection(input);
     if(id!==serial.current)return;
     if(result.candidate_source_id!==input.candidate_source_id||
        result.expected_revision!==input.expected_revision||
        result.current_effective_price!==input.expected_effective_price||
        result.replacement_price!==input.replacement_price)
       throw new Error('Preview identity or expected audit revision differs');
     setPreview(result);setSignature(JSON.stringify(input));
     setMessage('Check original and replacement price, affected historical decisions and reason.');
   }catch(e){if(id===serial.current)setMessage('Preview refused: '+String(e));}
   finally{if(id===serial.current)setBusy(false);}
 }
 async function save(){
   const input=request();
   if(!input||!preview||!preview.explicit_confirmation_required||
     !preview.zone_geometry_unchanged||signature!==JSON.stringify(input)||
     busy||saveLock.current)return;
   saveLock.current=true;setBusy(true);const id=++serial.current;
   try{
     const receipt=await localApi.recordSourcePriceCorrection(input);
     const [list,audit]=await Promise.all([
       localApi.listTradeHistoricalSources(tradeId),
       localApi.listTradeSourcePriceCorrections(tradeId)]);
     if(id!==serial.current)return;
     if(!audit.some(x=>x.correction_id===receipt.correction_id)||
       !list.some(x=>x.candidate_source_id===input.candidate_source_id&&
         x.effective_source_price===input.replacement_price&&
         x.price_correction_revision===input.expected_revision+1))
       throw new Error('Correction could not be verified from persisted audit and source');
     setSources(list);setEvents(audit);setPrice('');setReason('');
     setPreview(null);setSignature('');
     onApplied();
     setMessage('Correction saved and verified; original source and Zone geometry unchanged.');
   }catch(e){
     if(id===serial.current){setUncertain(true);setPreview(null);
       setMessage('Write outcome UNKNOWN. Re-read original source and audit before any retry: '+String(e));}
   }finally{saveLock.current=false;if(id===serial.current)setBusy(false);}
 }
 return <details className="guidedMore" aria-label="Audited historical Level Source price correction">
  <summary>Correct a recorded Level Source price · immutable audit</summary>
  <p className="subtle">For an incorrect historical price entry only. A real change of a Zone price belongs in a timestamped Zone revision. Original source, Decision and Zone price range stay intact. Correction does not change P&amp;L or Net R.</p>
  {sources===null?<p role="status">Reading historical source prices…</p>:sources.length===0?
    <p className="subtle">This Trade has no verified Decision-time source snapshot.</p>:<>
    <label>Historical source
      <select disabled={busy} value={selected} onChange={e=>{clear();setSelected(e.target.value);setPrice('');}}>
       <option value="">Choose saved source…</option>
       {sources.map(x=><option key={x.candidate_source_id} value={x.candidate_source_id}>
        {x.effective_label} · {x.candidate_source_id.slice(-8)}
       </option>)}
      </select>
    </label>
    {active&&<p className="subtle">Original source price: {active.original_source_price??'Not recorded'}; effective: {active.effective_source_price??'Not recorded'}; historical price correction revision: {active.price_correction_revision}. Zone revision ID: {active.candidate_revision_id}</p>}
    {!readOnly&&!uncertain&&active&&<>
      <label>Historically correct source price
       <input type="number" step="any" min="0" disabled={busy} value={price}
        onChange={e=>{clear();setPrice(e.target.value);}}/>
      </label>
      <label>Reason for original recording mistake
       <textarea rows={2} maxLength={500} value={reason} disabled={busy}
        onChange={e=>{clear();setReason(e.target.value);}}
        placeholder="Why was the original price wrong, and how was the correct level established?"/>
      </label>
      <button type="button" disabled={busy||!request()} onClick={()=>void check()}>Preview price correction</button>
    </>}
    {events?.map(e=><div className="decisionHistory" key={e.correction_id}>
      <time>{e.recorded_at_utc}</time>
      <b>Revision {e.revision}: {e.previous_source_price??'Not recorded'} → {e.replacement_source_price}</b>
      <small>{e.reason} · audit {e.correction_id} · {e.actor}</small>
    </div>)}
    {preview&&request()&&signature===JSON.stringify(request())&&<div className="warningBox">
      <strong>Confirm append-only historical price correction</strong>
      <p>Original {preview.original_source_price??'Not recorded'}; effective {preview.current_effective_price??'Not recorded'} → {preview.replacement_price}.</p>
      <p>Linked to {preview.related_decision_count} Decision(s) and {preview.related_trade_count} Trade(s). Zone range, existing fills, financial P&amp;L and Net R remain unchanged.</p>
      <p>Reason: {preview.reason}</p>
      <button type="button" className="primary" disabled={busy} onClick={()=>void save()}>Confirm and append correction</button>
      <button type="button" disabled={busy} onClick={clear}>Cancel</button>
    </div>}
  </>}
  <button type="button" disabled={busy} onClick={()=>void reload()}>Re-read historical source and audit</button>
  {readOnly&&<p className="subtle">Correction locked while saved Review identity or unsaved Review fields are unresolved.</p>}
  {message&&<p role="status" aria-live="polite">{message}</p>}
 </details>;
}
