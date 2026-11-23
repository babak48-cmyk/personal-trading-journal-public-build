import {useEffect,useRef,useState} from 'react';
import {localApi,type JournalFilter,type WeeklyActionEvent,type SaveWeeklyActionInput} from './services/localApi';

/** Deliberately optional post-session learning. Never shown during live entry. */
export function WeeklyActionWorkspace({weekStart,appliedFilter,suggestedAction}:{
  weekStart:string;appliedFilter:JournalFilter;suggestedAction:string;
}){
  const filterSnapshot=JSON.stringify(appliedFilter);
  const [history,setHistory]=useState<WeeklyActionEvent[]|null>(null);
  const [draft,setDraft]=useState('');
  const [followUp,setFollowUp]=useState('');
  const [note,setNote]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [uncertain,setUncertain]=useState(false);
  const currentRequest=useRef(0);
  const saveLock=useRef(false);
  const latestScope=useRef('');
  const scope=weekStart+'|'+filterSnapshot;
  const commitment=history?.find(event=>event.event_kind==='COMMITMENT')??null;

  useEffect(()=>{
    const request=++currentRequest.current;
    latestScope.current=scope;
    setHistory(null);setDraft(suggestedAction);setFollowUp('');setNote('');
    setNotice('');setUncertain(false);
    localApi.listWeeklyActions(weekStart,filterSnapshot).then(rows=>{
      if(request===currentRequest.current)setHistory(rows);
    }).catch(e=>{
      if(request===currentRequest.current){
        setUncertain(true);
        setNotice('Could not read saved weekly actions; saving is blocked: '+String(e));
      }
    });
    return ()=>{currentRequest.current++;};
    // The suggested action is initial draft text; changes in data after load must
    // never erase a user's manually typed unfinished improvement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[scope]);

  async function reread(){
    const request=++currentRequest.current;
    setBusy(true);
    try{
      const rows=await localApi.listWeeklyActions(weekStart,filterSnapshot);
      if(request!==currentRequest.current)return;
      setHistory(rows);setUncertain(false);setNotice('Saved weekly history read back from local SQLite.');
    }catch(e){if(request===currentRequest.current){setUncertain(true);setNotice('Read-back failed: '+String(e));}}
    finally{if(request===currentRequest.current)setBusy(false);}
  }

  async function save(){
    if(busy||saveLock.current||uncertain||history===null||!weekStart)return;
    const isFollowUp=!!commitment;
    const text=isFollowUp?followUp.trim():draft.trim();
    if(!text){setNotice('Enter one concrete improvement or follow-up first.');return;}
    if(text.length>500||note.length>1000){setNotice('Weekly action exceeds text length limit.');return;}
    const input:SaveWeeklyActionInput={
      week_start:weekStart,filter_snapshot_json:filterSnapshot,action_text:text,
      event_kind:isFollowUp?'FOLLOW_UP':'COMMITMENT',
      based_on_event_id:commitment?.action_event_id??null,note:note.trim()||null,
    };
    saveLock.current=true;setBusy(true);setNotice('');
    const request=++currentRequest.current;
    try{
      const result=await localApi.saveWeeklyAction(input);
      const persisted=await localApi.listWeeklyActions(weekStart,filterSnapshot);
      if(request!==currentRequest.current||latestScope.current!==scope)return;
      if(!persisted.some(row=>row.action_event_id===result.action_event_id&&
        row.event_kind===input.event_kind&&row.action_text===text)){
        throw new Error('New weekly action event could not be independently read back.');
      }
      setHistory(persisted);setFollowUp('');setNote('');
      setNotice('Weekly action saved and independently verified. Prior events remain immutable.');
    }catch(e){
      if(request===currentRequest.current){
        setUncertain(true);
        setNotice('Save outcome UNKNOWN. Do not retry; re-read the saved history first: '+String(e));
      }
    }finally{
      saveLock.current=false;if(request===currentRequest.current)setBusy(false);
    }
  }
  if(!weekStart)return null;
  return <details className="guidedMore" aria-label="Saved weekly action and follow-up">
    <summary>Save one weekly improvement and check it next week · optional</summary>
    <p className="subtle">One explicit personal commitment for the selected Monday week and applied filters. Follow-ups append new events; saved decisions are never overwritten. Suggestions are not validated trading edges.</p>
    <p className="subtle">Week {weekStart} · exact applied filter snapshot. Changing filters selects a different review history.</p>
    {history===null?<div><p role="status">{uncertain?"Saved weekly actions could not be verified. Writes remain blocked.":"Reading saved weekly actions…"}</p><button type="button" disabled={busy} onClick={()=>void reread()}>Re-read saved history</button></div>:<>
      {history.length>0&&<div className="weeklyBreakdown">{history.map(event=><div className="weeklyBreakdownRow" key={event.action_event_id}>
        <strong>{event.event_kind==='COMMITMENT'?'Committed improvement':'Follow-up'} · {event.recorded_at_utc}</strong>
        <span>{event.action_text}</span>{event.note&&<small>{event.note}</small>}
        <small>Read-only audit ID {event.action_event_id}</small>
      </div>)}</div>}
      {!uncertain&&<label>{commitment?'Record factual next-week follow-up':'One actionable weekly improvement'}
        <textarea rows={2} maxLength={500} value={commitment?followUp:draft} disabled={busy}
          onChange={e=>commitment?setFollowUp(e.target.value):setDraft(e.target.value)}/>
      </label>}
      {!uncertain&&<label>Optional factual observation
        <textarea rows={2} maxLength={1000} value={note} disabled={busy} onChange={e=>setNote(e.target.value)}/>
      </label>}
      <div className="rowActions">
        <button type="button" disabled={busy||uncertain||!(commitment?followUp.trim():draft.trim())}
          onClick={()=>void save()}>{busy?'Saving…':commitment?'Append follow-up event':'Save one weekly commitment'}</button>
        <button type="button" disabled={busy} onClick={()=>void reread()}>Re-read saved history</button>
      </div>
    </>}
    {notice&&<p role="status" aria-live="polite">{notice}</p>}
  </details>;
}
