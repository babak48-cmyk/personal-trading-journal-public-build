import {useState} from 'react';
import {open} from '@tauri-apps/plugin-dialog';
import {localApi,type NinjaTraderCsvReadiness} from './services/localApi';

/** Group 11 evidence gate; a broker integration or any Fill import is absent.
 * This panel never reads trading rows into JS, or writes a journal record.
 */
export function NinjaTraderImportReadinessPanel(){
  const [report,setReport]=useState<NinjaTraderCsvReadiness|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  async function inspect(){
    if(busy)return;
    setReport(null);setMessage('');setBusy(true);
    try{
      const path=await open({
        title:'Choose a NinjaTrader-exported CSV for READ-ONLY column inspection',
        multiple:false,filters:[{name:'CSV exports',extensions:['csv']}]
      });
      if(typeof path!=='string')return;
      const result=await localApi.inspectNinjaTraderCsvHeaders(path);
      if(result.ready_for_import || result.rows_imported!==0){
        throw new Error('Unexpected importer state: abort; no trade import is authorized.');
      }
      setReport(result);
    }catch(e){setMessage('Read-only inspection unavailable: '+String(e));}
    finally{setBusy(false);}
  }
  return <section className="panel" aria-label="NinjaTrader CSV readiness — no import">
    <div className="panelTitle"><div>
      <h2>NinjaTrader CSV readiness · no import</h2>
      <p className="subtle">Inspect ONLY column names from a file you explicitly choose. We must verify actual exported execution fields, time zones, contract snapshots and duplicate safeguards before enabling any import.</p>
    </div></div>
    <button type="button" disabled={busy} onClick={()=>void inspect()}>
      {busy?'Reading column names…':'Inspect exported CSV headers (read-only)'}
    </button>
    {message&&<p role="status">{message}</p>}
    {report&&<div>
      <p><strong>{report.file_name}</strong> · {report.column_count} columns · {report.detected_delimiter} delimiter.</p>
      <p className="subtle">{report.privacy_notice}</p>
      <label>Detected source headers — for verification only
        <textarea rows={Math.min(12,Math.max(4,report.headers.length))} readOnly
          value={report.headers.map((h,i)=>(i+1)+'. '+h).join('\n')}/>
      </label>
      <strong>Before import can be authorized:</strong>
      <ul>{report.required_next_evidence.map(x=><li key={x}>{x}</li>)}</ul>
      <p role="status">No Fill imported. No trading data copied to the journal. This is not a mapping or synchronization confirmation.</p>
    </div>}
  </section>;
}
