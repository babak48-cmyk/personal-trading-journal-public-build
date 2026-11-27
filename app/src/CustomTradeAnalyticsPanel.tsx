import {useEffect,useRef,useState} from 'react';
import {localApi,type CustomFieldDefinition,type CustomTradeAnalysis,type CustomDecisionAnalysis,type JournalFilter} from './services/localApi';
import {summarizeCustomTradeAnalysis,summarizeCustomDecisionAnalysis} from './customTradeAnalytics';
export function CustomTradeAnalyticsPanel({filter,openTrade}:{filter:JournalFilter;openTrade:(id:string)=>void}){
  const [fields,setFields]=useState<CustomFieldDefinition[]>([]);
  const [selected,setSelected]=useState('');
  const [catalogError,setCatalogError]=useState('');
  const [result,setResult]=useState<CustomTradeAnalysis|null>(null);
  const [decisionResult,setDecisionResult]=useState<CustomDecisionAnalysis|null>(null);
  const [decisionBusy,setDecisionBusy]=useState(false);
  const [decisionError,setDecisionError]=useState('');
  const decisionGeneration=useRef(0);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const generation=useRef(0);
  const filterKey=JSON.stringify(filter);
  useEffect(()=>{generation.current++;setResult(null);setError('');setBusy(false);return()=>{generation.current++;};},[filterKey,selected]);
  useEffect(()=>{decisionGeneration.current++;setDecisionResult(null);setDecisionError('');setDecisionBusy(false);return()=>{decisionGeneration.current++;};},[filterKey,selected]);
  const decisionEligible=fields.some(f=>f.field_id===selected&&['session','premarket-plan','candidate','zone'].includes(f.stage));
  async function analyzeDecisions(){
    if(!decisionEligible||decisionBusy)return;
    const token=++decisionGeneration.current;
    setDecisionBusy(true);setDecisionResult(null);setDecisionError('');
    try{
      const data=await localApi.analyzeCustomDecisionField(filter,selected);
      if(token!==decisionGeneration.current)return;
      if(data.field.field_id!==selected)throw Error('Unexpected field returned');
      summarizeCustomDecisionAnalysis(data);setDecisionResult(data);
    }catch(e){if(token===decisionGeneration.current)setDecisionError(String(e));}
    finally{if(token===decisionGeneration.current)setDecisionBusy(false);}
  }
  const decisionSummary=decisionResult?summarizeCustomDecisionAnalysis(decisionResult):null;
  async function loadFields(){
    if(loaded)return;
    setLoaded(true);
    try{setFields((await localApi.listCustomFieldDefinitions()).filter(f=>['session','premarket-plan','candidate','zone','trade','execution','post-trade-review','session-review'].includes(f.stage)));}
    catch(e){setCatalogError('Custom field list unavailable: '+String(e));setLoaded(false);}
  }
  async function analyze(){
    if(!selected||busy)return;
    const token=++generation.current;
    setBusy(true);setResult(null);setError('');
    try{
      const data=await localApi.analyzeCustomTradeField(filter,selected);
      if(token!==generation.current)return;
      if(data.field.field_id!==selected)throw Error('Unexpected field returned');
      summarizeCustomTradeAnalysis(data);
      setResult(data);
    }catch(e){if(token===generation.current)setError(String(e));}
    finally{if(token===generation.current)setBusy(false);}
  }
  const summary=result?summarizeCustomTradeAnalysis(result):null;
  const fmt=(n:number|null)=>n===null?'—':n.toFixed(2)+'R';
  return <details className="panel" onToggle={e=>{if(e.currentTarget.open)void loadFields();}}>
    <summary><strong>Custom fields · trade and decision analysis</strong></summary>
    <p className="subtle">Uses the currently applied journal filters. Planning and Zone answers are limited to recorded values at or before each original Decision. Trade, execution and review answers are retrospective, not entry signals.</p>
    {catalogError&&<p role="alert">{catalogError} <button onClick={()=>void loadFields()}>Retry field list</button></p>}
    <label>Custom field<select value={selected} onChange={e=>{generation.current++;setResult(null);setSelected(e.target.value);}}>
      <option value="">Choose a field</option>{fields.map(f=><option key={f.field_id} value={f.field_id}>{f.label} · {f.stage}{f.active?'':' · Inactive'}</option>)}
    </select></label>
    <button type="button" disabled={!selected||busy} onClick={()=>void analyze()}>{busy?'Reading…':'Analyze saved answers'}</button>
    <section className="requirementGroup">
      <h3>No Trade / Missed · independent analysis</h3>
      <p className="subtle">Date and instrument filters only, matching decision-only analytics. Planning and Zone answers as recorded by the original Decision time. Execution and review fields are not applicable. No P&amp;L or R is assigned.</p>
      <button type="button" disabled={!decisionEligible||decisionBusy} onClick={()=>void analyzeDecisions()}>{decisionBusy?'Reading decisions…':'Analyze No Trade / Missed'}</button>
      {decisionError&&<p role="alert">Decision analysis unavailable: {decisionError}</p>}
      {decisionSummary&&<>
        <p>{decisionSummary.total} decisions · {decisionSummary.missing} missing / unavailable answers</p>
        {decisionSummary.groups.map(g=><details key={g.key}><summary>{g.label} · No Trade {g.noTrade} · Missed {g.missed} · {g.ownerCount} owners</summary>
          {g.rows.map(row=><p key={row.decision_id}>{row.decision_type==='NO_TRADE'?'No Trade':'Missed'} · {row.occurred_at} · {row.reason_code??'No reason code'} {row.reason_note??''} · {row.decision_id.slice(0,8)}</p>)}
        </details>)}
      </>}
    </section>
    {error&&<p role="alert" className="warningBox">Custom analysis unavailable, not zero: {error}</p>}
    {result&&summary&&<>
      <p>{result.field.label} · {result.timing==='AT_OR_BEFORE_DECISION'?'Recorded by Decision time':'Latest recorded · retrospective'}</p>
      <p>{summary.total} recorded trades · {summary.total-summary.missing} with usable answers · {summary.missing} unavailable.</p>
      <p className="subtle">One trade per group. Multi-select uses exact combinations and historical option labels. Field title is the current definition. Shared Session/Zone answers may apply to several trades; owner counts show this dependency. Only closed trades with known net R contribute to R statistics. Small samples and associations do not prove an edge. Decision-only records are not included here.</p>
      {summary.groups.map(g=><details key={g.key} className="requirementGroup">
        <summary>{g.label} · {g.tradeCount} trade(s) · {g.ownerCount} owner(s)</summary>
        <p>Closed: {g.closedCount} · R eligible: {g.eligibleCount} · unknown R: {g.unknownR} · average {fmt(g.averageR)} · net {fmt(g.netR)}</p>
        <p className="subtle">Inspect the individual saved trades:</p>
        {g.tradeIds.map(id=><button key={id} type="button" onClick={()=>openTrade(id)}>Open trade {id.slice(0,8)}</button>)}
      </details>)}
    </>}
  </details>;
}
