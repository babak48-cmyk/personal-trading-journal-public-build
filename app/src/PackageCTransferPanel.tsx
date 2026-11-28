import {useEffect,useState} from 'react';
import {open} from '@tauri-apps/plugin-dialog';
import {localApi, type DemoTransferPreview, type RestoreResult} from './services/localApi';

/** The import commands are available ONLY in the explicitly separate
 * Package C DEMO app identifier. No transfer option is presented in the
 * normal journal. The user selects an external backup and must confirm
 * the exact preview of that same ZIP before the backend may write.
 */
export function PackageCTransferPanel(){
  const [isDemo,setIsDemo]=useState(false);
  const [checking,setChecking]=useState(true);
  const [busy,setBusy]=useState(false);
  const [path,setPath]=useState('');
  const [preview,setPreview]=useState<DemoTransferPreview|null>(null);
  const [confirmed,setConfirmed]=useState(false);
  const [receipt,setReceipt]=useState<RestoreResult|null>(null);
  const [message,setMessage]=useState('');
  const [unverified,setUnverified]=useState(false);
  useEffect(()=>{
    let alive=true;
    localApi.isPackageCDemo()
      .then(v=>{if(alive)setIsDemo(v===true);})
      .catch(()=>{if(alive)setIsDemo(false);})
      .finally(()=>{if(alive)setChecking(false);});
    return ()=>{alive=false;};
  },[]);
  async function selectAndPreview(){
    if(busy||unverified||receipt)return;
    setPreview(null);setConfirmed(false);setPath('');setMessage('');
    let selected:string|null;
    try{
      const picked=await open({title:'Select external Package B DEMO backup ZIP (read-only preview)',
        multiple:false,filters:[{name:'Trading Journal backup',extensions:['zip']}]});
      selected=typeof picked==='string'?picked:null;
    }catch(e){setMessage('Could not select backup: '+String(e));return;}
    if(!selected)return;
    setBusy(true);setPath(selected);
    try{
      const checked=await localApi.previewPackageCDemoImport(selected);
      if(!checked.original_backup_untouched||checked.archive_sha256.length!==64){
        throw new Error('A verified full-archive preview was not returned.');
      }
      setPreview(checked);
      setMessage('Read the import inventory and confirm separately. No data has been imported.');
    }catch(e){setPath('');setMessage('Transfer preview rejected; nothing imported: '+String(e));}
    finally{setBusy(false);}
  }
  async function importApproved(){
    if(busy||unverified||receipt||!isDemo||!confirmed||!preview||!path)return;
    const fixedPath=path, fixedHash=preview.archive_sha256;
    setBusy(true);setConfirmed(false);setMessage('Importing into isolated Package C DEMO…');
    // IPC failure may happen AFTER a transactional commit. Never retry
    // automatically or imply rollback is confirmed without independent review.
    try{
      const result=await localApi.importPackageBDemoBackup(fixedPath,fixedHash);
      if(result.integrity!=='ok'||!result.safety_backup){
        throw new Error('Import response lacks verified integrity/safety backup.');
      }
      setReceipt(result);setPreview(null);
      setMessage('Package C transfer completed. Restart this isolated DEMO to read its imported history.');
    }catch(e){
      setUnverified(true);setPreview(null);
      setMessage('Import outcome is NOT VERIFIED. Do not retry, delete or overwrite files before reviewing the destination and safety backup: '+String(e));
    }finally{setBusy(false);}
  }
  if(checking||!isDemo)return null;
  return <section className="panel" aria-label="Isolated Package C DEMO transfer">
    <h2>Package C DEMO · transfer verified Package B history</h2>
    <p className="subtle">Only in this separately identified Package C DEMO. Select an existing external Package B DEMO backup ZIP. The original archive is never edited. A destination with existing journal history or customized configuration will be refused. This is not a general restore.</p>
    <button type="button" disabled={busy||unverified||!!receipt} onClick={()=>void selectAndPreview()}>
      {busy?'Working…':'Select Package B DEMO backup and preview'}
    </button>
    {!!path&&<p className="subtle" style={{overflowWrap:'anywhere'}}>Selected archive: {path}</p>}
    {!!preview&&!receipt&&!unverified&&<div className="warningBox" role="group" aria-label="B to C transfer preflight">
      <strong>Read-only preflight passed — no import yet</strong>
      <p>Source schema {preview.source_schema_version} → Package C schema {preview.target_schema_version}.
        Sessions {preview.sessions}; Trades {preview.trades}; Zones {preview.zones}; Decisions {preview.decisions};
        Plan revisions {preview.plan_revisions}; Evidence {preview.evidence_events}; Fills {preview.fills};
        Risk snapshots {preview.risk_snapshots}; Reviews {preview.reviews}; Attachments {preview.attachments}.</p>
      <p>Audited Fill events {preview.correction_events}; Initial Risk events {preview.initial_risk_correction_events};
        Source Type events {preview.source_type_correction_events}; Source Price events {preview.source_price_correction_events};
        Weekly Learning actions {preview.weekly_learning_action_events}.</p>
      <p className="subtle" style={{overflowWrap:'anywhere'}}>Full backup ZIP SHA-256: {preview.archive_sha256}.
        Source SQLite SHA-256: {preview.database_sha256}.</p>
      <label><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>
        I understand this imports into a separate empty Package C DEMO only; the original Package B archive is preserved,
        and Package C may replace only its isolated destination after creating a safety backup.
      </label>
      <button type="button" className="primary" disabled={!confirmed||busy} onClick={()=>void importApproved()}>
        {busy?'Importing…':'Confirm verified B → C DEMO transfer'}
      </button>
      <button type="button" disabled={busy} onClick={()=>{setPreview(null);setPath('');setConfirmed(false);setMessage('Transfer cancelled; nothing imported.');}}>
        Cancel without import
      </button>
    </div>}
    {!!receipt&&<div role="status">
      <strong>Transfer completed · destination integrity: {receipt.integrity}</strong>
      <p className="subtle" style={{overflowWrap:'anywhere'}}>Separate destination safety backup: {receipt.safety_backup}</p>
      <button type="button" onClick={()=>window.location.reload()}>Reload isolated Package C DEMO history</button>
    </div>}
    {message&&<p role="status" aria-live="polite">{message}</p>}
  </section>;
}
