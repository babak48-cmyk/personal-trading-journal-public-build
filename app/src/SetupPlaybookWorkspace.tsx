import {useEffect,useMemo,useRef,useState} from 'react';
import {localApi,type JournalTradeRow,type SaveSetupVersionInput,type SetupVersion,type SetupPerformance,type SetupEvidencePriority} from './services/localApi';
import {setupPlaybookCandidate} from './setupPlaybookCandidate';
import {sameSetupDefinition} from './setupDefinitionEquality';
import {hasPendingSetupEvidence} from './pendingSetupEvidence';
import {blankSetupDraft,setupDraftFromVersion,setupSwitchDraft} from './setupDraftLifecycle';
import {verifiedSetupSaveVersion} from './setupSaveReadback';
import {isFieldPresented,type FieldPlacement} from './fieldInventory';
import {orderedSetupDefinitionFields,setupApprovalMissingFields,setupApprovalActionFeedback} from './setupFieldManager';

const roles=['REQUIRED','SUPPORTING','CONTRADICTORY','NOT_RELEVANT'] as const;
type EditorTransition={kind:'close'|'switch'|'new';versionId?:string};

export function SetupPlaybookWorkspace({rows,quickMode,visibility,placements,fieldText,fieldOrder}:{
 rows:readonly JournalTradeRow[];quickMode:boolean;
 visibility:Readonly<Record<string,boolean>>;placements:Readonly<Record<string,FieldPlacement>>;
 fieldText:Readonly<Record<string,{label?:string;help?:string}>>;
 fieldOrder:Readonly<Record<string,number>>;
}){
 // Setup approval-critical definitions always render. Only connected optional
 // inputs honor presentation preferences, and their saved values are never erased.
 const shown=(id:string,force=false)=>isFieldPresented(id,quickMode,visibility,placements,{},force);
 const labelFor=(id:string,fallback:string)=>fieldText[id]?.label?.trim()||fallback;
 const [versions,setVersions]=useState<SetupVersion[]>([]);
 const [performance,setPerformance]=useState<SetupPerformance[]>([]);
 const [input,setInput]=useState<SaveSetupVersionInput>(blankSetupDraft);
 const [seedTrade,setSeedTrade]=useState('');
 const [selectedVersion,setSelectedVersion]=useState('');
 const [busy,setBusy]=useState(false);
 const saveLock=useRef(false);
 const [uncertainSave,setUncertainSave]=useState<{versionId:string|null}|null>(null);
 const [pendingTransition,setPendingTransition]=useState<EditorTransition|null>(null);
 const [status,setStatus]=useState('');
 // Keep an invalid approval response beside the action the trader clicked.
 const [approvalFeedback,setApprovalFeedback]=useState<string|null>(null);
 const [expanded,setExpanded]=useState(false);
 const [editorDirty,setEditorDirty]=useState(false);
 const [linkTradeId,setLinkTradeId]=useState('');
 const [linkVersionId,setLinkVersionId]=useState('');
 const [linkNote,setLinkNote]=useState('');
 const [newEvidence,setNewEvidence]=useState('');
 const [evidenceRole,setEvidenceRole]=useState<SetupEvidencePriority['priority_role']>('SUPPORTING');
 const [evidenceHelp,setEvidenceHelp]=useState('');
 const closed=useMemo(()=>rows.filter(r=>r.status==='CLOSED'),[rows]);
 const seed=closed.find(r=>r.trade_id===seedTrade);
 const selected=versions.find(v=>v.version_id===selectedVersion);
 async function reload(){
   const [v,p]=await Promise.all([localApi.listSetupVersions(),localApi.setupPlaybookPerformance()]);
   setVersions(v);setPerformance(p);
 }
 useEffect(()=>{void reload().catch(e=>setStatus('Playbook read failed: '+String(e)));},[]);
 const hasUncommittedEditorChanges=editorDirty||hasPendingSetupEvidence(newEvidence,evidenceRole,evidenceHelp);
 function applyTransition(action:EditorTransition){
   if(uncertainSave){setStatus('Save outcome unresolved. Recheck saved versions before leaving the editor.');return;}
   if(action.kind==='close'){
     setExpanded(false);
     const current=versions.find(v=>v.version_id===selectedVersion);
     setInput(current?setupDraftFromVersion(current):blankSetupDraft());
   }
   if(action.kind==='new'){
     setInput(blankSetupDraft());setSelectedVersion('');setExpanded(true);
     setStatus('New independent Setup (not a revision).');
   }
   if(action.kind==='switch'){
     const switched=setupSwitchDraft(versions,action.versionId??'');
     setSelectedVersion(switched.selectedVersion);
     setInput(switched.draft);
     setExpanded(true);
     setStatus(switched.selectedVersion?'Selected saved version for an immutable revision.':'No saved version selected. This is a NEW independent Setup.');
   }
   setEditorDirty(false);setApprovalFeedback(null);setNewEvidence('');setEvidenceHelp('');setEvidenceRole('SUPPORTING');
   setSeedTrade(''); // Selection is temporary; never carry a prior source across Setup changes.
   setPendingTransition(null);
 }
 function requestTransition(action:EditorTransition){
   if(uncertainSave){setStatus('Resolve the unverified Setup save before changing the editor.');return;}
   if(hasUncommittedEditorChanges){setPendingTransition(action);return;}
   applyTransition(action);
 }
 const update=(field:keyof SaveSetupVersionInput,value:string|null)=>{
   setEditorDirty(true);
   setApprovalFeedback(null);
   setInput(prev=>({...prev,[field]:value}));
 };
 function fromTrade(){
   if(!seed)return;
   setEditorDirty(true);
   setInput(prev=>({...prev,source_trade_id:seed.trade_id,
     zone_location:seed.candidate_label||prev.zone_location,
     notes:setupPlaybookCandidate(seed),
   }));
   setStatus('Source and known Zone copied. Prerequisites and evidence must be entered from actual historical records; unknown facts were not invented.');
 }
 function addEvidence(){
   if(!newEvidence.trim()||input.evidence_priorities.some(v=>v.evidence_label.trim().toLowerCase()===newEvidence.trim().toLowerCase()))return;
   setEditorDirty(true);
   setInput(prev=>({...prev,evidence_priorities:[...prev.evidence_priorities,
     {evidence_label:newEvidence.trim(),priority_role:evidenceRole,explanation:evidenceHelp.trim()||null}]}));
   setNewEvidence('');setEvidenceHelp('');setEvidenceRole('SUPPORTING');
 }
 async function save(approve:boolean){
   if(saveLock.current||busy||uncertainSave)return;
   setApprovalFeedback(null);
   if(hasPendingSetupEvidence(newEvidence,evidenceRole,evidenceHelp)){
     setStatus('An evidence-priority row has not been added yet. Select Add evidence requirement or clear the pending row before saving a version.');
     return;
   }
   // Deterministic pre-write check: do not enter the uncertain-write recovery flow
   // for an Approve request already known to violate the native six-field contract.
   // The Rust approval check remains authoritative.
   if(approve){
     const message=setupApprovalActionFeedback(input,labelFor);
     if(message){
       setApprovalFeedback(message);
       setStatus(message);
       return;
     }
   }
   if(selected && sameSetupDefinition(input,selected,approve)){
     setStatus('No changes from the selected saved version. Edit the Setup before saving a NEW immutable version.');
     return;
   }
   saveLock.current=true;setBusy(true);setStatus('');
   let attempted=false;
   let returned:SetupVersion|null=null;
   try{
     attempted=true;
     returned=await localApi.saveSetupVersion({...input,approve});
     const [fresh,perf]=await Promise.all([localApi.listSetupVersions(),localApi.setupPlaybookPerformance()]);
     const verified=verifiedSetupSaveVersion(fresh,returned.version_id);
     if(!verified)throw new Error('Saved immutable version ID could not be read back.');
     setVersions(fresh);setPerformance(perf);setSelectedVersion(verified.version_id);
     setInput(setupDraftFromVersion(verified));setEditorDirty(false);setNewEvidence('');setEvidenceHelp('');setEvidenceRole('SUPPORTING');
     setStatus('Version '+verified.version_number+(approve?' approved':' saved as DRAFT')+'. Original versions remain immutable. You can create a new revision from this draft.');
   }catch(e){
     if(attempted)setUncertainSave({versionId:returned?.version_id??null});
     setStatus('Setup save NOT verified. Further writes are blocked until the saved-version list is checked. Do not click Save again: '+String(e));
   }
   finally{saveLock.current=false;setBusy(false);}
 }
 async function verifyUncertainSave(){
   if(!uncertainSave||busy)return;
   setBusy(true);
   try{
     const [fresh,perf]=await Promise.all([localApi.listSetupVersions(),localApi.setupPlaybookPerformance()]);
     setVersions(fresh);setPerformance(perf);
     const saved=verifiedSetupSaveVersion(fresh,uncertainSave.versionId);
     if(saved){
       setSelectedVersion(saved.version_id);
       setInput(setupDraftFromVersion(saved));setEditorDirty(false);setNewEvidence('');setEvidenceHelp('');setEvidenceRole('SUPPORTING');
       setUncertainSave(null);
       setStatus('Verified: immutable Setup version '+saved.version_number+' exists. Duplicate save prevented.');
     }else{
       setStatus('Read-back completed, but this save is still UNVERIFIED. Inspect the saved versions. Do not retry automatically.');
     }
   }catch(e){setStatus('Saved versions could not be checked. Writes remain blocked: '+String(e));}
   finally{setBusy(false);}
 }
 async function deactivate(){
   if(!selected||busy||uncertainSave)return;
   setBusy(true);
   try{await localApi.deactivateSetup(selected.setup_id);await reload();setStatus('Setup safely deactivated. Existing version and trade attribution history retained.');}
   catch(e){setStatus('Deactivation failed: '+String(e));}
   finally{setBusy(false);}
 }
 async function link(){
   if(!linkTradeId||!linkVersionId||busy||uncertainSave)return;
   setBusy(true);
   try{
      await localApi.linkSetupTrade(linkTradeId,linkVersionId,linkNote.trim()||'Retrospective classification from closed trade; this was not known at entry.');
      await reload();
      setStatus('Retrospective Setup attribution recorded once. The original Trade/Decision is unchanged.');
      setLinkTradeId('');setLinkNote('');
   }catch(e){setStatus('Link rejected: '+String(e));}
   finally{setBusy(false);}
 }
 return <section className="panel" aria-label="Versioned Setup Playbook">
   <div className="panelTitle"><div><h2>Setup Playbook · saved versions</h2>
    <p className="subtle">Reusable manual setup definitions with immutable revisions, prerequisites, entry triggers, contrary/veto evidence, invalidation and configurable evidence roles. Not automated signals or validated edges.</p>
   </div></div>
   <div className="summaryStrip">
      <span><b>Saved versions</b>{versions.length}</span>
      <span><b>Active approved versions</b>{versions.filter(x=>x.is_active&&x.is_approved).length}</span>
      <span><b>Attributed closed trades</b>{performance.reduce((a,v)=>a+v.trade_count,0)}</span>
   </div>
   <div className="rowActions">
    <button type="button" disabled={busy||!!uncertainSave} onClick={()=>expanded?requestTransition({kind:'close'}):setExpanded(true)}>{expanded?'Close editor':'Open Setup editor / new revision'}</button>
   </div>
   {versions.length>0&&<label>Read a saved version or create its next immutable revision
     <select value={selectedVersion} disabled={busy||!!uncertainSave} onChange={e=>requestTransition({kind:'switch',versionId:e.target.value})}>
       <option value="">Select saved version…</option>
       {versions.map(v=><option key={v.version_id} value={v.version_id}>
         {v.name} · v{v.version_number} · {v.is_approved?'APPROVED':'DRAFT'} · {v.is_active?'ACTIVE':'INACTIVE'}
       </option>)}
     </select>
   </label>}
   {selected&&<div className="rowActions">
      <button type="button" disabled={busy||!!uncertainSave} onClick={()=>requestTransition({kind:'new'})}>New independent Setup</button>
      {selected.is_active&&<button type="button" disabled={busy||!!uncertainSave} onClick={()=>void deactivate()}>Deactivate Setup (preserve history)</button>}
   </div>}
   {selected&&<details className="guidedMore"><summary>Read immutable v{selected.version_number} evidence priorities</summary>
     <p><strong>{selected.name}</strong> · {selected.is_approved?'Approved':'Draft'} · {selected.created_at}</p>
     {selected.evidence_priorities.map((e,i)=><p key={i}>{e.priority_role}: {e.evidence_label}{e.explanation?' — '+e.explanation:''}</p>)}
     <p className="subtle">Changing the editor and saving produces a NEW version. Old facts and linked trades remain associated with the original version.</p>
   </details>}
   {expanded&&<div className="formGrid">
     <label>Setup name <input value={input.name} onChange={e=>update('name',e.target.value)} maxLength={120} placeholder="e.g. Rejection at Value Boundary"/></label>
     {shown('setup.sourceTrade',!!seedTrade)&&<label>{labelFor('setup.sourceTrade','Seed from saved CLOSED trade')} (optional; not automatically attributed)
       {fieldText['setup.sourceTrade']?.help&&<small title={fieldText['setup.sourceTrade'].help}>ⓘ</small>}
       <select value={seedTrade} onChange={e=>setSeedTrade(e.target.value)}>
        <option value="">Choose a historical Trade…</option>
        {closed.map(r=><option key={r.trade_id} value={r.trade_id}>{r.session_date} · {r.instrument_symbol} · {r.candidate_label||'No Zone label'} · {r.trade_id.slice(-8)}</option>)}
       </select>
     </label>}
     {seed&&<button type="button" onClick={fromTrade}>Copy historical source facts into editable draft</button>}
     {orderedSetupDefinitionFields(fieldOrder).map(field=><label key={field.id}>
       {labelFor(field.id,field.label)}
       <small> {field.approvalRequired?'Required to approve · optional in Draft':'Optional supporting definition'}</small>
       {fieldText[field.id]?.help&&<small title={fieldText[field.id].help}>ⓘ</small>}
       <textarea rows={2} value={input[field.key]??''} maxLength={2000}
        onChange={e=>update(field.key,e.target.value)} placeholder={field.hint}/>
     </label>)}
     {shown('setup.notes')&&<label>{labelFor('setup.notes','Notes (optional)')}
       {fieldText['setup.notes']?.help&&<small title={fieldText['setup.notes'].help}>ⓘ</small>}
       <textarea rows={4} value={input.notes??''} maxLength={2000}
         onChange={e=>update('notes',e.target.value)} placeholder="Keep it short"/>
     </label>}
     <fieldset><legend>Evidence priorities — configure by this setup/regime, not fixed indicator counts</legend>
       <p className="subtle">REQUIRED must be observed; SUPPORTING is optional; CONTRADICTORY conflicts with the thesis; NOT_RELEVANT need not be reviewed. No total-score shortcut or automatic trade permission.</p>
       {input.evidence_priorities.map((e,i)=><div className="rowActions" key={i}>
          <span>{e.priority_role}: {e.evidence_label}</span>
          <button type="button" onClick={()=>{setEditorDirty(true);setInput(p=>({...p,evidence_priorities:p.evidence_priorities.filter((_,j)=>i!==j)}));}}>Remove from NEXT version</button>
       </div>)}
       <input value={newEvidence} maxLength={120} placeholder="Evidence name, e.g. DOM pressure" onChange={e=>setNewEvidence(e.target.value)}/>
       <select value={evidenceRole} onChange={e=>{setEvidenceRole(e.target.value as SetupEvidencePriority['priority_role']);setEditorDirty(true);}}>
        {roles.map(role=><option value={role} key={role}>{role}</option>)}
       </select>
       {shown('setup.evidenceHelp',!!evidenceHelp.trim())&&<label>{labelFor('setup.evidenceHelp','Optional evidence explanation')}
         {fieldText['setup.evidenceHelp']?.help&&<small title={fieldText['setup.evidenceHelp'].help}>ⓘ</small>}
         <input value={evidenceHelp} maxLength={500} placeholder="Optional explanation" onChange={e=>setEvidenceHelp(e.target.value)}/>
       </label>}
       <button type="button" onClick={addEvidence} disabled={!newEvidence.trim()}>Add evidence requirement</button>
     </fieldset>
     {hasUncommittedEditorChanges&&<p role="status" className="subtle">Unsaved Setup editor changes. Save a NEW version before switching or closing this editor.</p>}
     {uncertainSave&&<div className="warningBox" role="alert">
       <strong>Setup version save is not verified.</strong> No second version will be submitted automatically.
       <div className="rowActions"><button type="button" disabled={busy} onClick={()=>void verifyUncertainSave()}>Recheck saved versions</button>
         <button type="button" disabled={busy} onClick={()=>{setUncertainSave(null);setStatus('Manual retry unlocked. Only proceed after verifying that the previous write did NOT create a version.');}}>I verified no new version was saved — unlock retry</button>
       </div>
       <small>Unlock requires a manual check. A completed call with a returned version ID is only accepted after that exact version is found.</small>
     </div>}
     <div className="rowActions">
       {setupApprovalMissingFields(input).length>0&&<small role="status">To approve: complete {setupApprovalMissingFields(input).length} missing definition field(s). Draft save can remain partial.</small>}
       <button type="button" disabled={busy||!!uncertainSave||!input.name.trim()} onClick={()=>void save(false)}>{busy?'Saving…':'Save new DRAFT version'}</button>
       <button className="primary" type="button" disabled={busy||!!uncertainSave||!input.name.trim()} onClick={()=>void save(true)}>Approve and save NEW version</button>
       {approvalFeedback&&<p role="alert" aria-live="assertive" className="warningBox" style={{flexBasis:'100%',width:'100%',marginTop:'.5rem'}}>{approvalFeedback}</p>}
     </div>
     <p className="subtle">Every save creates a NEW immutable version. Saving a DRAFT does not later change that version into APPROVED: after completing the conditions, Approve creates the NEXT version. To make v1 approved directly, use Approve on a new Setup without first saving a draft. Approval requires context, Zone, prerequisites, triggers, contrary evidence and thesis invalidation.</p>
   </div>}
   {performance.length>0&&<details className="guidedMore" open><summary>Performance by Setup VERSION · descriptive sample sizes only</summary>
     <div className="weeklyBreakdown">{performance.map(p=><div className="weeklyBreakdownRow" key={p.version_id}>
       <strong>{p.setup_name} · v{p.version_number}</strong>
       <span>{p.trade_count} attributed trades · R eligible {p.eligible_r_count}/{p.trade_count} · {p.unknown_r_count} missing R</span>
       <span>Known net R: {p.net_r==null?'UNKNOWN':p.net_r.toFixed(2)+'R'} · positive-R trades: {p.win_count} (not win rate)</span>
     </div>)}</div>
     <p className="subtle">Only explicitly attributed trades count. This is descriptive, not evidence of profitability; avoid conclusions from small or missing samples.</p>
   </details>}
   {closed.length>0&&versions.some(v=>v.is_approved&&v.is_active)&&<details className="guidedMore">
     <summary>Link a historical CLOSED trade to an approved Setup version (one-time attribution)</summary>
     <p className="subtle">This is a retrospective classification, NOT proof that the Setup was known or followed before entry. It does not alter the Decision or Fill history.</p>
     <label>Closed trade
      <select value={linkTradeId} onChange={e=>setLinkTradeId(e.target.value)}>
       <option value="">Select Trade…</option>{closed.map(t=><option key={t.trade_id} value={t.trade_id}>{t.session_date} · {t.instrument_symbol} · {t.trade_id.slice(-8)}</option>)}
      </select>
     </label>
     <label>Approved version
      <select value={linkVersionId} onChange={e=>setLinkVersionId(e.target.value)}>
        <option value="">Select active approved version…</option>
        {versions.filter(v=>v.is_approved&&v.is_active).map(v=><option key={v.version_id} value={v.version_id}>{v.name} · v{v.version_number}</option>)}
      </select>
     </label>
     <label>Reason for retrospective attribution
       <input maxLength={500} value={linkNote} onChange={e=>setLinkNote(e.target.value)} placeholder="Why does the saved trade match this Setup?"/>
     </label>
     <button type="button" disabled={busy||!linkVersionId||!linkTradeId} onClick={()=>void link()}>Record immutable retrospective attribution</button>
   </details>}
   {pendingTransition&&<div role="presentation" style={{position:'fixed',inset:0,zIndex:4000,background:'rgba(0,0,0,.65)',display:'grid',placeItems:'center',padding:'1rem'}}>
     <div role="alertdialog" aria-modal="true" aria-labelledby="setup-unsaved-title" aria-describedby="setup-unsaved-description" className="panel" style={{border:'2px solid currentColor',padding:'1rem',width:'min(100%,32rem)',maxHeight:'90vh',overflowY:'auto',background:'var(--panel-bg, #20242c)',color:'var(--text-color, #fff)'}}>
     <h3 id="setup-unsaved-title">Unsaved Setup changes</h3>
     <p id="setup-unsaved-description">This editor contains unsaved text or an unfinished evidence requirement. Discarding loses only these edits; saved versions remain immutable.</p>
     <div className="rowActions">
       <button type="button" onClick={()=>setPendingTransition(null)}>Keep editing</button>
       <button type="button" onClick={()=>applyTransition(pendingTransition)}>Discard edits and continue</button>
     </div>
     </div>
   </div>}
   {status&&<p role="status" aria-live="polite">{status}</p>}
 </section>;
}
