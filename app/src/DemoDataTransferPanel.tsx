import {useEffect,useRef,useState} from 'react';
import {open} from '@tauri-apps/plugin-dialog';
import {localApi,type DemoTransferPreview} from './services/localApi';

/** Only Package C DEMO can execute the native import command.
 * The original Package B demo database and ZIP stay untouched. */
export function DemoDataTransferPanel(){
  const [canImport,setCanImport]=useState(false);
  useEffect(()=>{
    let mounted=true;
    localApi.isPackageCDemo().then(enabled=>{if(mounted)setCanImport(enabled);})
      .catch(()=>{if(mounted)setCanImport(false);});
    return ()=>{mounted=false;};
  },[]);
  const [source,setSource]=useState('');
  const [preview,setPreview]=useState<DemoTransferPreview|null>(null);
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState('');
  const [imported,setImported]=useState(false);
  const lock=useRef(false);

  async function choose(){
    if(busy)return;
    setPreview(null);setConfirmed(false);setResult('');
    const file=await open({title:'Choose the verified backup ZIP created in Package B DEMO',
      multiple:false,filters:[{name:'Journal backup',extensions:['zip']}]});
    if(typeof file==='string')setSource(file);
  }
  async function preflight(){
    if(!source||busy)return;
    setBusy(true);setResult('');setConfirmed(false);setPreview(null);
    try{
      const p=await localApi.previewPackageCDemoImport(source);
      setPreview(p);
      setResult('Preview verified: original ZIP not modified; staged database checked. No data imported yet.');
    }catch(e){setResult('Transfer preflight rejected: '+String(e));}
    finally{setBusy(false);}
  }
  async function transfer(){
    if(lock.current||busy||!source||!preview||!confirmed||imported)return;
    lock.current=true;setBusy(true);setResult('');
    try{
      const receipt=await localApi.importPackageBDemoBackup(source,preview.database_sha256);
      setImported(true);setConfirmed(false);
      setResult('Import completed to this separate Package C DEMO profile. Integrity: '+receipt.integrity+
        '. Safety backup: '+receipt.safety_backup+
        '. Close and reopen Package C DEMO to reload all saved B trades and Reviews.');
    }catch(e){
      setPreview(null);setConfirmed(false);
      setResult('Import was NOT verified. Do not retry without reviewing the Package C safety backup and data: '+String(e));
    }finally{lock.current=false;setBusy(false);}
  }
  if(!canImport)return null;
  return <details className="guidedMore" aria-label="Import previous Package B demo test data">
    <summary>Package C DEMO only · continue tests using Package B DEMO history</summary>
    <p className="subtle">Select an existing verified ZIP backup from Package B DEMO. The original Package B app and ZIP are never changed. Import is allowed only into an EMPTY, separate Package C DEMO profile, never production. The source journal is verified and migrated in staging first.</p>
    <div className="rowActions">
      <button type="button" disabled={busy||imported} onClick={()=>void choose()}>Choose Package B backup ZIP…</button>
      <button type="button" disabled={!source||busy||imported} onClick={()=>void preflight()}>{busy?'Checking…':'Preview source and transfer safety'}</button>
    </div>
    {source&&<p className="subtle" style={{overflowWrap:'anywhere'}}>Selected source: {source}</p>}
    {preview&&!imported&&<>
      <div className="summaryStrip">
        <span><b>Sessions</b>{preview.sessions}</span>
        <span><b>Trades</b>{preview.trades}</span>
        <span><b>Zones</b>{preview.zones}</span>
        <span><b>Decisions</b>{preview.decisions}</span>
        <span><b>Plan revisions</b>{preview.plan_revisions}</span>
        <span><b>Evidence events</b>{preview.evidence_events}</span>
        <span><b>Risk snapshots</b>{preview.risk_snapshots}</span>
        <span><b>Fills</b>{preview.fills}</span>
        <span><b>Reviews</b>{preview.reviews}</span>
        <span><b>Correction events</b>{preview.correction_events}</span>
        <span><b>Initial-risk audit</b>{preview.initial_risk_correction_events}</span>
        <span><b>Level Source audit</b>{preview.source_type_correction_events}</span>
        <span><b>Attachments</b>{preview.attachments}</span>
      </div>
      <p className="subtle">Source schema v{preview.source_schema_version} → staged schema v{preview.target_schema_version}. Checksums, foreign keys and immutable Fill correction chains must verify. Existing Package C data would block the import.</p>
      <label><input type="checkbox" checked={confirmed} disabled={busy}
        onChange={e=>setConfirmed(e.target.checked)}/>
        I confirm this is Package B DEMO test data and want to copy it into my empty Package C DEMO. I understand this does not modify the source.
      </label>
      <button type="button" className="primary" disabled={!confirmed||busy} onClick={()=>void transfer()}>
        Confirm transfer into empty Package C DEMO
      </button>
    </>}
    {result&&<p role="status" aria-live="polite" style={{overflowWrap:'anywhere'}}>{result}</p>}
  </details>;
}
