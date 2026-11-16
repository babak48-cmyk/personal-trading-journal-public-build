import {useEffect,useState} from 'react';
import {localApi,type SetupVersion} from './services/localApi';

/** Optional planning-stage Setup selection. Version capture happens in a
 * NEW immutable candidate revision; observations remain separate.
 */
export function ZoneSetupGuide({candidateId,currentVersionId,onAssigned}:{
 candidateId:string;currentVersionId:string|null|undefined;
 onAssigned:()=>Promise<void>;
}){
 const [versions,setVersions]=useState<SetupVersion[]>([]);
 const [selected,setSelected]=useState('');
 const [reason,setReason]=useState('');
 const [busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState('');
 useEffect(()=>{
  let alive=true;
  localApi.listSetupVersions().then(v=>{if(alive){setVersions(v);setSelected(currentVersionId??'');}})
    .catch(e=>{if(alive)setFeedback('Setup versions unavailable: '+String(e));});
  return ()=>{alive=false};
 },[candidateId,currentVersionId]);
 const version=versions.find(v=>v.version_id===(selected||currentVersionId));
 const available=versions.filter(v=>v.is_active&&v.is_approved);
 async function assign(){
  if(busy||!selected||!reason.trim())return;
  setBusy(true);setFeedback('');
  try{
    await localApi.assignSetupToZone(candidateId,selected,reason);
    await onAssigned(); // Re-read canonical Plan to verify the durable revision.
    setReason('');setFeedback('Setup version assigned in a new Zone revision. Earlier Plan and decisions remain intact.');
  }catch(e){setFeedback('Assignment not verified: '+String(e));}
  finally{setBusy(false);}
 }
 return <details className="guidedMore">
   <summary>Setup Playbook · {currentVersionId?'Version attached to Zone':'Choose approved Setup (optional)'}</summary>
   <p className="subtle">Select the setup during planning, before recording observation or Decision. Changing the selected version appends a new Plan/Zone revision; it never edits an earlier Decision or Trade.</p>
   <label>Approved version
    <select value={selected} onChange={e=>{setSelected(e.target.value);setFeedback('');}}>
     <option value="">No selected Setup</option>
     {available.map(v=><option key={v.version_id} value={v.version_id}>{v.name} · v{v.version_number}</option>)}
    </select>
   </label>
   {currentVersionId&&<p className="subtle">Recorded on current Zone revision: {currentVersionId}. If a newer version is selected, past events retain the previous version.</p>}
   {version&&<div>
     <p><strong>Context:</strong> {version.market_context||'Unspecified'}</p>
     <p><strong>Zone:</strong> {version.zone_location||'Unspecified'}</p>
     <p><strong>Prerequisites:</strong> {version.prerequisites||'Not defined'}</p>
     <p><strong>Entry trigger:</strong> {version.entry_triggers||'Not defined'}</p>
     <p><strong>Supporting:</strong> {version.supporting_evidence||'Not defined'}</p>
     <p><strong>Contradictions / veto:</strong> {version.contrary_evidence||'Not defined'}</p>
     <p><strong>Thesis invalidation:</strong> {version.thesis_invalidation||'Not defined'}</p>
     <ul>{version.evidence_priorities.map((p,i)=><li key={i}><strong>{p.priority_role}</strong>: {p.evidence_label} {p.explanation||''}</li>)}</ul>
     <p className="subtle">Check actual live evidence separately with its real timestamp. Required observations missing or contrary evidence present mean WAIT/NO TRADE for review; this is not an automated order recommendation or validated probability.</p>
   </div>}
   {selected&&selected!==currentVersionId&&<>
     <label>Reason for changing this planned Setup selection
      <input maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Why is this specific version relevant to the Zone?"/>
     </label>
     <button type="button" disabled={busy||!reason.trim()} onClick={()=>void assign()}>
       {busy?'Recording…':'Record Setup version in new Zone revision'}
     </button>
   </>}
   {feedback&&<p role="status">{feedback}</p>}
 </details>;
}
