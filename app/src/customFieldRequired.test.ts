import {describe,it,expect} from 'vitest';
import type {CustomFieldDefinition,CustomTypedValue,CustomSelection} from './services/localApi';
import {missingRequiredCustomValues,type CustomValueReader} from './customFieldRequired';

const def=(id:string,stage:string,type:string,required=true,active=true):CustomFieldDefinition=>({
 field_id:id,label:id,stage,field_type:type,required,active,help_text:'',display_order:0,
});
const all=[def('s-zero','session','NUMBER'),def('s-false','session','BOOLEAN'),def('s-empty','session','TEXT'),
 def('z-pick','zone','SINGLE_SELECT'),def('z-date','zone','DATE'),def('z-unused','zone','TEXT',false),
 def('z-inactive','zone','NUMBER',true,false),
 def('p-required','premarket-plan','TEXT')];
const values:Record<string,CustomTypedValue>={
 's-zero':{event_id:'a',value_type:'NUMBER',number_value:0,text_value:null,boolean_value:null,date_value:null},
 's-false':{event_id:'b',value_type:'BOOLEAN',number_value:null,text_value:null,boolean_value:false,date_value:null},
};
const reader:CustomValueReader={
 listCustomFieldDefinitions:async()=>all,
 currentCustomFieldTypedValue:async(_stage,_owner,id)=>values[id]??null,
 currentCustomFieldSelection:async()=>null,
};
describe('custom field semantic boundary required check',()=>{
 it('accepts persisted numeric zero and boolean false, reports only missing session text',async()=>{
  expect((await missingRequiredCustomValues(reader,'session','s1')).map(x=>x.id)).toEqual(['s-empty']);
 });
 it('checks actual Zone owner and excludes optional/inactive fields',async()=>{
  expect((await missingRequiredCustomValues(reader,'zone','z1')).map(x=>x.id)).toEqual(['z-date','z-pick']);
 });
 it('accepts a persisted choice and a valid saved date',async()=>{
  const complete:CustomValueReader={
   ...reader,
   currentCustomFieldTypedValue:async()=>({event_id:'c',value_type:'DATE',date_value:'2026-11-06',text_value:null,number_value:null,boolean_value:null}),
   currentCustomFieldSelection:async()=>({event_id:'d',options:[{option_id:'opt',label_at_selection:'original',ordinal:0}]} as CustomSelection),
  };
  expect(await missingRequiredCustomValues(complete,'zone','z1')).toEqual([]);
 });
 it('keeps required pre-market plan distinct from Session even on the same canonical owner',async()=>{
  expect((await missingRequiredCustomValues(reader,'session','session-1')).map(x=>x.id)).toEqual(['s-empty']);
  expect((await missingRequiredCustomValues(reader,'premarket-plan','session-1')).map(x=>x.id)).toEqual(['p-required']);
 });
 it('propagates unavailable persistence errors rather than confirming without checking',async()=>{
  await expect(missingRequiredCustomValues({...reader,listCustomFieldDefinitions:async()=>{throw Error('database unavailable')}},'zone','z1')).rejects.toThrow('database unavailable');
 });
});
