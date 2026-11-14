import {describe,it,expect} from 'vitest';
import type {CustomFieldDefinition,CustomTypedValue,CustomSelection} from './services/localApi';
import {missingRequiredCustomValues,isUsableCustomTypedValue,isUsableCustomSelection,type CustomValueReader} from './customFieldRequired';

const def=(id:string,stage:string,type:string,required=true,active=true):CustomFieldDefinition=>({
 field_id:id,label:id,stage,field_type:type,required,active,help_text:'',display_order:0,
});
const all=[def('s-zero','session','NUMBER'),def('s-false','session','BOOLEAN'),def('s-empty','session','TEXT'),
 def('c-context','candidate','TEXT'),def('t-context','trade','TEXT'),
 def('z-pick','zone','SINGLE_SELECT'),def('z-date','zone','DATE'),def('z-unused','zone','TEXT',false),
 def('z-inactive','zone','NUMBER',true,false),
 def('p-required','premarket-plan','TEXT'),
 def('r-choice','post-trade-review','SINGLE_SELECT'),def('r-text','post-trade-review','TEXT'),
 def('sr-required','session-review','TEXT'),def('sr-zero','session-review','NUMBER')];
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
 it('keeps Candidate and Zone independently required although they refer to the same immutable candidate ID',async()=>{
  expect((await missingRequiredCustomValues(reader,'candidate','candidate-1')).map(x=>x.id)).toEqual(['c-context']);
  expect((await missingRequiredCustomValues(reader,'zone','candidate-1')).map(x=>x.id)).toEqual(['z-date','z-pick']);
 });
 it('checks Trade and Post-trade Review against the same trade ID without conflating their stage histories',async()=>{
  expect((await missingRequiredCustomValues(reader,'trade','trade-1')).map(x=>x.id)).toEqual(['t-context']);
  expect((await missingRequiredCustomValues(reader,'post-trade-review','trade-1')).map(x=>x.id)).toEqual(['r-text','r-choice']);
  const observed:string[]=[];
  const stageReader:CustomValueReader={...reader,
   currentCustomFieldTypedValue:async(stage,owner,id)=>{
    observed.push(`${stage}:${owner}:${id}`);
    return stage==='trade'&&owner==='trade-1'&&id==='t-context'
      ? {event_id:'saved',value_type:'TEXT',text_value:'Initial risk context',number_value:null,date_value:null,boolean_value:null}
      : null;
   },
  };
  expect(await missingRequiredCustomValues(stageReader,'trade','trade-1')).toEqual([]);
  expect((await missingRequiredCustomValues(stageReader,'trade','trade-2')).map(x=>x.id)).toEqual(['t-context']);
  expect(observed).toEqual(['trade:trade-1:t-context','trade:trade-2:t-context']);
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
 it('checks the selected trade as the canonical post-trade review owner',async()=>{
  expect((await missingRequiredCustomValues(reader,'post-trade-review','trade-1')).map(x=>x.id)).toEqual(['r-text','r-choice']);
  const seen:string[]=[];
  const complete:CustomValueReader={...reader,
   currentCustomFieldTypedValue:async(stage,owner,id)=>{seen.push(`${stage}:${owner}:${id}`);return {event_id:'x',value_type:'TEXT',text_value:'Reviewed',number_value:null,date_value:null,boolean_value:null};},
   currentCustomFieldSelection:async(stage,owner,id)=>{seen.push(`${stage}:${owner}:${id}`);return {event_id:'y',options:[{option_id:'1',label_at_selection:'Original label',ordinal:0}]};},
  };
  expect(await missingRequiredCustomValues(complete,'post-trade-review','trade-2')).toEqual([]);
  expect(seen).toEqual(expect.arrayContaining(['post-trade-review:trade-2:r-text','post-trade-review:trade-2:r-choice']));
 });
 it('reads required Session Review values only from the persisted review ID, preserving valid zero',async()=>{
  const visited:string[]=[];
  const ownerReader:CustomValueReader={...reader,
   currentCustomFieldTypedValue:async(stage,owner,id)=>{
    visited.push(stage+':'+owner+':'+id);
    if(stage==='session-review'&&owner==='review-A'&&id==='sr-zero')
      return {event_id:'zero',value_type:'NUMBER',number_value:0,text_value:null,date_value:null,boolean_value:null};
    if(stage==='session-review'&&owner==='review-A'&&id==='sr-required')
      return {event_id:'text',value_type:'TEXT',text_value:'Session learning',number_value:null,date_value:null,boolean_value:null};
    return null;
   },
  };
  expect(await missingRequiredCustomValues(ownerReader,'session-review','review-A')).toEqual([]);
  expect((await missingRequiredCustomValues(ownerReader,'session-review','session-A')).map(x=>x.id))
    .toEqual(['sr-required','sr-zero']);
  expect(visited).toContain('session-review:review-A:sr-required');
  expect(visited).toContain('session-review:review-A:sr-zero');
 });
 it('does not mistake a mismatched historical typed value for a saved Required response',async()=>{
  const mismatched:CustomValueReader={...reader,
    currentCustomFieldTypedValue:async()=>({event_id:'legacy',value_type:'TEXT',text_value:'nonempty',
      number_value:0,date_value:'2026-11-14',boolean_value:false}),
  };
  // Even non-empty cross-type columns must not satisfy a NUMBER or BOOLEAN input.
  expect((await missingRequiredCustomValues(mismatched,'session','s1')).map(x=>x.id))
    .toEqual(['s-false','s-zero']);
 });
 it('requires real historical option snapshots rather than an empty or duplicate saved selection',async()=>{
  const snapshots:CustomValueReader={...reader,currentCustomFieldSelection:async()=>({
    event_id:'saved',options:[{option_id:'A',label_at_selection:'  ',ordinal:0}],
  })};
  expect((await missingRequiredCustomValues(snapshots,'zone','z1')).map(x=>x.id)).toEqual(['z-date','z-pick']);
  const duplicates:CustomValueReader={...snapshots,currentCustomFieldSelection:async()=>({
    event_id:'saved',options:[
      {option_id:'A',label_at_selection:'Original',ordinal:0},
      {option_id:'A',label_at_selection:'Duplicate',ordinal:1}
    ]
  })};
  expect((await missingRequiredCustomValues(duplicates,'zone','z1')).map(x=>x.id)).toEqual(['z-date','z-pick']);
 });
 it('propagates unavailable persistence errors rather than confirming without checking',async()=>{
  await expect(missingRequiredCustomValues({...reader,listCustomFieldDefinitions:async()=>{throw Error('database unavailable')}},'zone','z1')).rejects.toThrow('database unavailable');
 });
});

describe('shared Quick/Detailed persisted custom-field completion policy',()=>{
  it('does not display a required NUMBER or BOOLEAN as complete from a TEXT event',()=>{
    const wrong:CustomTypedValue={event_id:'event-1',value_type:'TEXT',text_value:'old',
      number_value:0,date_value:null,boolean_value:false};
    expect(isUsableCustomTypedValue('NUMBER',wrong)).toBe(false);
    expect(isUsableCustomTypedValue('BOOLEAN',wrong)).toBe(false);
    expect(isUsableCustomTypedValue('TEXT',wrong)).toBe(true);
    expect(isUsableCustomTypedValue('NUMBER',{...wrong,value_type:'NUMBER'})).toBe(true);
    expect(isUsableCustomTypedValue('BOOLEAN',{...wrong,value_type:'BOOLEAN'})).toBe(true);
    expect(isUsableCustomTypedValue('TEXT',{...wrong,event_id:''})).toBe(false);
  });
  it('uses the same immutable option snapshot policy in the editor and the stage save guard',()=>{
    expect(isUsableCustomSelection(null)).toBe(false);
    expect(isUsableCustomSelection({event_id:'old',options:[{option_id:'id-A',label_at_selection:'Historical value',ordinal:0}]})).toBe(true);
    expect(isUsableCustomSelection({event_id:'old',options:[{option_id:'id-A',label_at_selection:'',ordinal:0}]})).toBe(false);
    expect(isUsableCustomSelection({event_id:'',options:[{option_id:'id-A',label_at_selection:'Historical value',ordinal:0}]})).toBe(false);
    expect(isUsableCustomSelection({event_id:'old',options:[
      {option_id:'id-A',label_at_selection:'First',ordinal:0},
      {option_id:'id-A',label_at_selection:'Second',ordinal:1}
    ]})).toBe(false);
  });
});
