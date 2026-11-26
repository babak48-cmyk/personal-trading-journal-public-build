import {describe,it,expect} from 'vitest';
import type {CustomTradeAnalysis,CustomAnalysisAnswer} from './services/localApi';
import {summarizeCustomTradeAnalysis} from './customTradeAnalytics';
const answer=(patch:Partial<CustomAnalysisAnswer>):CustomAnalysisAnswer=>({event_id:'e',recorded_at:'2026-11-27T00:00:00Z',value_type:'NUMBER',text_value:null,number_value:null,boolean_value:null,date_value:null,options:[],...patch});
const result=(kind:string,rows:CustomTradeAnalysis['rows']):CustomTradeAnalysis=>({field:{field_id:'f',stage:'zone',field_type:kind,label:'Field',help_text:'',required:false,active:false,display_order:0},timing:'AT_OR_BEFORE_DECISION',rows});
describe('custom trade cohorts',()=>{
 it('retains zero, separates missing, counts owners once and excludes unknown/open R',()=>{
  const data=result('NUMBER',[
   {trade_id:'a',owner_id:'z',status:'CLOSED',realized_r:0,answer:answer({number_value:0})},
   {trade_id:'b',owner_id:'z',status:'CLOSED',realized_r:null,answer:answer({number_value:0})},
   {trade_id:'c',owner_id:'q',status:'OPEN',realized_r:5,answer:answer({number_value:0})},
   {trade_id:'d',owner_id:null,status:'CLOSED',realized_r:null,answer:null},
  ]);
  const s=summarizeCustomTradeAnalysis(data);
  expect(s).toMatchObject({total:4,missing:1});
  expect(s.groups[0]).toMatchObject({label:'0',ownerCount:2,tradeCount:3,closedCount:2,eligibleCount:1,unknownR:1,netR:0,averageR:0});
  expect(s.groups[1]).toMatchObject({key:'missing',netR:null,averageR:null});
 });
 it('groups exact combinations regardless of order and separates renamed historical options',()=>{
  const pick=(label:string,reverse=false)=>answer({value_type:'MULTI_SELECT',options:(reverse?[
    {option_id:'b',label_at_selection:'B',ordinal:0},{option_id:'a',label_at_selection:label,ordinal:1}
  ]:[{option_id:'a',label_at_selection:label,ordinal:0},{option_id:'b',label_at_selection:'B',ordinal:1}])});
  const rows=['a','b','c'].map((id,i)=>({trade_id:id,owner_id:id,status:'CLOSED',realized_r:1,answer:pick(i===2?'Renamed':'Old',i===1)}));
  const s=summarizeCustomTradeAnalysis(result('MULTI_SELECT',rows));
  expect(s.groups.map(g=>[g.label,g.tradeCount])).toEqual([['Old + B',2],['Renamed + B',1]]);
 });
 it('keeps false and rejects duplicate trade rows',()=>{
  const row={trade_id:'a',owner_id:'z',status:'CLOSED',realized_r:-1,answer:answer({value_type:'BOOLEAN',boolean_value:false})};
  expect(summarizeCustomTradeAnalysis(result('BOOLEAN',[row])).groups[0].label).toBe('No');
  expect(()=>summarizeCustomTradeAnalysis(result('BOOLEAN',[row,row]))).toThrow('Duplicate trade');
 });
});
