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
    expect(readOnlyCustomRow(field('not-a-number','NUMBER'),typed({value_type:'NUMBER',number_value:Number.NaN}),null)).toBeNull();
  });
  it('honors Field Manager display order instead of alphabetical labels while retaining snapshots',()=>{
    const last={...field('alpha','TEXT'),display_order:7};
    const first={...field('zeta','TEXT'),display_order:1};
    const rows=[
      readOnlyCustomRow(last,typed({text_value:'Alpha saved'}),null)!,
      readOnlyCustomRow(first,typed({text_value:'Zeta saved'}),null)!,
    ];
    expect(orderedReadOnlyCustomRows(rows).map(row=>row.id)).toEqual(['zeta','alpha']);
    expect(orderedReadOnlyCustomRows(rows).map(row=>row.display)).toEqual(['Zeta saved','Alpha saved']);
    expect(rows[0].id).toBe('alpha'); // sort never mutates fetched records
  });
  it('keeps saved date and descriptive text unchanged and sorts without mutation',()=>{
    expect(readOnlyCustomRow(field('date','DATE'),typed({value_type:'DATE',date_value:'2026-11-09'}),null)?.display).toBe('2026-11-09');
    expect(readOnlyCustomRow(field('reason','TEXT'),typed({text_value:'Review learning'}),null)?.display).toBe('Review learning');
    const a={id:'z',label:'Z',display:'Z',retired:false,stage:'trade',displayOrder:0};
    const b={id:'a',label:'A',display:'A',retired:false,stage:'session-review',displayOrder:0};
    const input=[a,b] as const;
    expect(orderedReadOnlyCustomRows(input).map(x=>x.id)).toEqual(['a','z']);
    expect(input[0].id).toBe('z');
  });
});

describe('historical read-only type integrity',()=>{
  it('never silently shows a mismatched historical typed value as another field kind',()=>{
    const legacy=typed({value_type:'TEXT',text_value:'Previous text',number_value:12,
      boolean_value:true,date_value:'2026-11-14'});
    expect(readOnlyCustomRow(field('number','NUMBER'),legacy,null)).toBeNull();
    expect(readOnlyCustomRow(field('bool','BOOLEAN'),legacy,null)).toBeNull();
    expect(readOnlyCustomRow(field('date','DATE'),legacy,null)).toBeNull();
    expect(readOnlyCustomRow(field('text','TEXT'),legacy,null)?.display).toBe('Previous text');
  });
  it('does not display an event-less orphan as a confirmed historical response',()=>{
    expect(readOnlyCustomRow(field('text','TEXT'),typed({event_id:'',text_value:'No verified event'}),null)).toBeNull();
    expect(readOnlyCustomRow(field('choice','SINGLE_SELECT'),null,{event_id:'',options:[
      {option_id:'old',label_at_selection:'Old',ordinal:0}
    ]})).toBeNull();
  });
});
