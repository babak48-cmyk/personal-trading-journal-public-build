import {describe,it,expect} from 'vitest';
import { verifiedCustomTypedEvent, verifiedCustomSelectionEvent } from './customFieldWriteVerification';
import type {CustomTypedInput,CustomTypedValue,CustomSelectionInput,CustomSelection} from './services/localApi';

const textReq:CustomTypedInput={event_id:'new-1',field_id:'field-a',owner_stage:'session',owner_id:'session-a',
  text_value:'my observation',number_value:null,date_value:null,boolean_value:null};
const storedText:CustomTypedValue={event_id:'new-1',value_type:'TEXT',text_value:'my observation',
  number_value:null,date_value:null,boolean_value:null};
describe('Custom Field safe write verification',()=>{
  it('rejects stale prior event even when the text matches',()=>{
    expect(verifiedCustomTypedEvent(textReq,{...storedText,event_id:'old-event'})).toBe(false);
    expect(verifiedCustomTypedEvent(textReq,storedText)).toBe(true);
    expect(verifiedCustomTypedEvent(textReq,{...storedText,text_value:'other'})).toBe(false);
    expect(verifiedCustomTypedEvent(textReq,null)).toBe(false);
  });
  it('verifies numeric zero and boolean false without treating either as absent',()=>{
    const n={...textReq,text_value:null,number_value:0};
    expect(verifiedCustomTypedEvent(n,{...storedText,value_type:'NUMBER',text_value:null,number_value:0})).toBe(true);
    const b={...textReq,text_value:null,boolean_value:false};
    expect(verifiedCustomTypedEvent(b,{...storedText,value_type:'BOOLEAN',text_value:null,boolean_value:false})).toBe(true);
    expect(verifiedCustomTypedEvent(b,{...storedText,value_type:'BOOLEAN',text_value:null,boolean_value:true})).toBe(false);
  });
  it('verifies date and rejects ambiguous multi-type submitted events',()=>{
    const d={...textReq,text_value:null,date_value:'2026-11-14'};
    expect(verifiedCustomTypedEvent(d,{...storedText,value_type:'DATE',text_value:null,date_value:'2026-11-14'})).toBe(true);
    expect(verifiedCustomTypedEvent({...textReq,number_value:2},storedText)).toBe(false);
  });
  const selection:CustomSelectionInput={event_id:'choice-new',field_id:'custom-b',owner_stage:'trade',owner_id:'trade-a',option_ids:['optA','optB']};
  const saved:CustomSelection={event_id:'choice-new',options:[{option_id:'optB',label_at_selection:'Earlier B',ordinal:1},{option_id:'optA',label_at_selection:'Earlier A',ordinal:0}]};
  it('verifies newly saved option IDs and historical label snapshots independent of order',()=>{
    expect(verifiedCustomSelectionEvent(selection,saved)).toBe(true);
    expect(verifiedCustomSelectionEvent(selection,{...saved,event_id:'old'})).toBe(false);
    expect(verifiedCustomSelectionEvent(selection,{...saved,options:saved.options.slice(0,1)})).toBe(false);
    expect(verifiedCustomSelectionEvent(selection,{...saved,options:[{...saved.options[0],label_at_selection:''},saved.options[1]]})).toBe(false);
    expect(verifiedCustomSelectionEvent({...selection,option_ids:['optA','optA']},saved)).toBe(false);
  });
});
