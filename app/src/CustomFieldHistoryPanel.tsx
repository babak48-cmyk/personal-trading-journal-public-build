import {useRef,useState} from 'react';
import {localApi} from './services/localApi';
import {loadCustomFieldHistory,type CustomHistoryGroup,type CustomHistoryScope} from './customFieldHistory';

/** Explicit lazy, read-only inspection. This is not an edit or correction path.
 * Callers key this component by canonical owner so switching owner discards
 * previous inspection state and late results cannot populate the new owner. */
export function CustomFieldHistoryPanel({ownerId,scope}:{ownerId:string;scope:CustomHistoryScope}){
  const [groups,setGroups]=useState<CustomHistoryGroup[]|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const busyRef=useRef(false);
  async function load(){
    if(busyRef.current)return;
    busyRef.current=true;setBusy(true);setError('');setGroups(null);
    try{setGroups(await loadCustomFieldHistory(localApi,scope,ownerId));}
    catch(e){setError('Custom answer history could not be read: '+String(e));}
    finally{busyRef.current=false;setBusy(false);}
  }
  return <details className="guidedMore" onToggle={e=>{if(e.currentTarget.open&&groups===null&&!error)void load();}}>
    <summary>Custom answer history (read-only)</summary>
    <p className="subtle">Up to 100 most recent saved events per field, newest first. Field names use today's definition; saved option names use their original selection snapshots. Hidden and inactive fields with history are included.</p>
    <button type="button" disabled={busy} onClick={()=>void load()}>{busy?'Reading history…':'Refresh history'}</button>
    {error&&<p role="alert" className="warningBox">{error}</p>}
    {groups!==null&&groups.length===0&&<p role="status">No custom answers recorded for this owner.</p>}
    {groups?.map(group=><details key={group.stage+':'+group.id} className="requirementGroup">
      <summary>{group.label} · {group.stage}{group.retired?' · Inactive':''} · {group.events.length} event(s)</summary>
      {group.events.map(event=><div key={event.id} className="decisionHistory">
        <time dateTime={event.recordedAt}>{event.recordedAt}</time>
        <p>{event.display}</p>
      </div>)}
    </details>)}
  </details>;
}
