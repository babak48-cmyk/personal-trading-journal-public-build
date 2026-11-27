import type {CustomAnalysisAnswer,CustomTradeAnalysis,CustomDecisionAnalysis} from './services/localApi';
import {readOnlyCustomRow} from './customFieldReadOnly';
type Group={key:string;label:string;tradeIds:string[];owners:Set<string>;closed:number;eligible:number;sum:number};
function answerGroup(field:CustomTradeAnalysis['field'],answer:CustomAnalysisAnswer|null):{key:string;label:string}|null{
  if(!answer||answer.value_type!==field.field_type)return null;
  const select=field.field_type==='SINGLE_SELECT'||field.field_type==='MULTI_SELECT';
  if(select&&(!answer.options.length||(field.field_type==='SINGLE_SELECT'&&answer.options.length!==1)
      ||new Set(answer.options.map(o=>o.option_id)).size!==answer.options.length))return null;
  const row=readOnlyCustomRow(field,select?null:answer,select?answer:null);
  if(!row)return null;
  // Multi-select is an exact combination, not one trade in several buckets.
  // Distinguish renamed historical labels and unrelated options with same text.
  const options=select?[...answer.options].sort((a,b)=>a.option_id.localeCompare(b.option_id))
    .map(o=>[o.option_id,o.label_at_selection]):null;
  return {key:JSON.stringify([field.field_type,options??row.display]),label:options?options.map(o=>o[1]).join(' + '):row.display};
}
export function summarizeCustomTradeAnalysis(result:CustomTradeAnalysis){
  const groups=new Map<string,Group>();
  const seen=new Set<string>();
  let missing=0;
  for(const row of result.rows){
    if(seen.has(row.trade_id))throw Error('Duplicate trade in custom analysis; results unavailable.');
    seen.add(row.trade_id);
    const value=row.owner_id?answerGroup(result.field,row.answer):null;
    if(!value)missing++;
    const key=value?.key??'missing';
    const group=groups.get(key)??{key,label:value?.label??'Not recorded / unavailable',tradeIds:[],owners:new Set<string>(),closed:0,eligible:0,sum:0};
    group.tradeIds.push(row.trade_id);
    if(row.owner_id)group.owners.add(row.owner_id);
    if(row.status==='CLOSED'){
      group.closed++;
      if(row.realized_r!==null&&Number.isFinite(row.realized_r)){
        group.eligible++;
        group.sum+=row.realized_r;
      }
    }
    groups.set(key,group);
  }
  return {total:seen.size,missing,groups:[...groups.values()].map(g=>({
    key:g.key,label:g.label,tradeIds:g.tradeIds,ownerCount:g.owners.size,tradeCount:g.tradeIds.length,
    closedCount:g.closed,eligibleCount:g.eligible,unknownR:g.closed-g.eligible,
    averageR:g.eligible?g.sum/g.eligible:null,netR:g.eligible?g.sum:null
  })).sort((a,b)=>a.key==='missing'?1:b.key==='missing'?-1:b.tradeCount-a.tradeCount||a.key.localeCompare(b.key))};
}

export function summarizeCustomDecisionAnalysis(result:CustomDecisionAnalysis){
  const seen=new Set<string>();
  const groups=new Map<string,{key:string;label:string;owners:Set<string>;rows:CustomDecisionAnalysis['rows'];noTrade:number;missed:number}>();
  let missing=0;
  for(const row of result.rows){
    if(seen.has(row.decision_id)||!['NO_TRADE','MISSED'].includes(row.decision_type))throw Error('Invalid or duplicate decision-only row');
    seen.add(row.decision_id);
    const value=row.owner_id?answerGroup(result.field,row.answer):null;
    if(!value)missing++;
    const key=value?.key??'missing';
    const g=groups.get(key)??{key,label:value?.label??'Not recorded / unavailable',owners:new Set<string>(),rows:[],noTrade:0,missed:0};
    if(row.owner_id)g.owners.add(row.owner_id);
    g.rows.push(row);
    if(row.decision_type==='NO_TRADE')g.noTrade++;else g.missed++;
    groups.set(key,g);
  }
  return {total:seen.size,missing,groups:[...groups.values()].map(g=>({key:g.key,label:g.label,ownerCount:g.owners.size,rows:g.rows,noTrade:g.noTrade,missed:g.missed})).sort((a,b)=>a.key==='missing'?1:b.key==='missing'?-1:b.rows.length-a.rows.length||a.key.localeCompare(b.key))};
}
