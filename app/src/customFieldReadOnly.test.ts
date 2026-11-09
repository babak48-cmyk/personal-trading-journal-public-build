import {describe,expect,it} from 'vitest';
import {orderedReadOnlyCustomRows,readOnlyCustomRow} from './customFieldReadOnly';
import type {CustomFieldDefinition,CustomSelection,CustomTypedValue} from './services/localApi';

const field=(field_id:string,field_type:string,active=true):CustomFieldDefinition=>({
  field_id,field_type,active,stage:'session-review',label:field_id,
  help_text:'',required:false,display_order:0,
});
const typed=(value:Partial<CustomTypedValue>):CustomTypedValue=>({
  event_id:'evt',value_type:'TEXT',text_value:null,number_value:null,date_value:null,boolean_value:null,...value,
});
describe('completed review historical custom answers',()=>{
  it('shows confirmed zero and false rather than silently dropping them',()=>{
    expect(readOnlyCustomRow(field('qty','NUMBER'),typed({value_type:'NUMBER',number_value:0}),null)?.display).toBe('0');
    expect(readOnlyCustomRow(field('emotion','BOOLEAN'),typed({value_type:'BOOLEAN',boolean_value:false}),null)?.display).toBe('No');
  });
  it('uses historical selection-label snapshots even when the field is now inactive',()=>{
    const historical:CustomSelection={event_id:'evt',options:[
      {option_id:'b',label_at_selection:'Old label B',ordinal:1},
      {option_id:'a',label_at_selection:'Old label A',ordinal:0},
    ]};
    expect(readOnlyCustomRow(field('context','MULTI_SELECT',false),null,historical)).toMatchObject({
      display:'Old label A, Old label B',retired:true,
    });
  });
  it('does not invent a saved answer for untouched or blank fields',()=>{
    expect(readOnlyCustomRow(field('empty','TEXT'),null,null)).toBeNull();
    expect(readOnlyCustomRow(field('blank','TEXT'),typed({text_value:'  '}),null)).toBeNull();
    expect(readOnlyCustomRow(field('not-a-number','NUMBER'),typed({number_value:Number.NaN}),null)).toBeNull();
  });
  it('keeps saved date and descriptive text unchanged and sorts without mutation',()=>{
    expect(readOnlyCustomRow(field('date','DATE'),typed({date_value:'2026-11-09'}),null)?.display).toBe('2026-11-09');
    expect(readOnlyCustomRow(field('reason','TEXT'),typed({text_value:'Review learning'}),null)?.display).toBe('Review learning');
    const a={id:'z',label:'Z',display:'Z',retired:false,stage:'trade'};
    const b={id:'a',label:'A',display:'A',retired:false,stage:'session-review'};
    const input=[a,b] as const;
    expect(orderedReadOnlyCustomRows(input).map(x=>x.id)).toEqual(['a','z']);
    expect(input[0].id).toBe('z');
  });
});
