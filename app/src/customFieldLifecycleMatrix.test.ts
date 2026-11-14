import { describe, expect, it } from 'vitest';
import type { CustomFieldDefinition, CustomTypedValue, CustomSelection } from './services/localApi';
import { CAPTURABLE_CUSTOM_FIELD_STAGES, customFieldFocusId } from './customFieldStage';
import { missingRequiredCustomValues, type CustomValueReader } from './customFieldRequired';
import { quickValidationRoute } from './quickValidationRoute';

const fields:CustomFieldDefinition[]=CAPTURABLE_CUSTOM_FIELD_STAGES.flatMap((stage,index)=>[
  {field_id:stage+'-note',stage,field_type:'TEXT',label:stage+' note',
    help_text:'',active:true,required:true,display_order:index*2},
  {field_id:stage+'-pick',stage,field_type:'SINGLE_SELECT',label:stage+' choice',
    help_text:'',active:true,required:true,display_order:index*2+1},
]);
const savedNote:CustomTypedValue={event_id:'typed-A',value_type:'TEXT',
  text_value:'Owner A note',number_value:null,date_value:null,boolean_value:null};
const savedChoice:CustomSelection={event_id:'selection-A',options:[
  {option_id:'old-option',label_at_selection:'Historical label',ordinal:0}]};
function readerForOwnerA():CustomValueReader{
  return {
    listCustomFieldDefinitions:async()=>fields,
    currentCustomFieldTypedValue:async(stage,owner,id)=>
      owner==='owner-A' && id===stage+'-note'?savedNote:null,
    currentCustomFieldSelection:async(stage,owner,id)=>
      owner==='owner-A' && id===stage+'-pick'?savedChoice:null,
  };
}

describe('Cohesive Custom Field stage/owner and Required lifecycle matrix',()=>{
  it.each(CAPTURABLE_CUSTOM_FIELD_STAGES)(
    '%s reads only that stage and owner, never a sibling Session/Trade or other stage',
    async(stage)=>{
      const reader=readerForOwnerA();
      expect(await missingRequiredCustomValues(reader,stage,'owner-A')).toEqual([]);
      expect((await missingRequiredCustomValues(reader,stage,'owner-B')).map(v=>v.id))
        .toEqual([stage+'-note',stage+'-pick']);
      const first=customFieldFocusId(stage,'owner-B',stage+'-note');
      expect(first).not.toBe(customFieldFocusId(stage,'owner-A',stage+'-note'));
      for(const other of CAPTURABLE_CUSTOM_FIELD_STAGES){
        if(other!==stage)expect(first).not.toBe(customFieldFocusId(other,'owner-B',stage+'-note'));
      }
    }
  );
  it('does not rewrite original selected option labels or event IDs when checking Required',async()=>{
    const before=JSON.stringify(savedChoice);
    expect(await missingRequiredCustomValues(readerForOwnerA(),'zone','owner-A')).toEqual([]);
    expect(JSON.stringify(savedChoice)).toBe(before);
    expect(savedChoice.options[0].label_at_selection).toBe('Historical label');
  });
  it.each([
    ['session','PLAN'],['premarket-plan','PLAN'],['candidate','PLAN'],['zone','PLAN'],
    ['trade','EXECUTION'],['post-trade-review','EXECUTION'],['session-review','REVIEW'],
  ] as const)('routes existing %s owner to correct confirmed Quick page %s',(stage,page)=>{
    const id=customFieldFocusId(stage,'owner-B',stage+'-note');
    expect(quickValidationRoute(id,false,true).notebookPage).toBe(page);
    expect(quickValidationRoute(id,true,false).notebookPage).toBeNull();
  });
  it('keeps Session and Premarket custom fields on the existing draft plan page',()=>{
    for(const stage of ['session','premarket-plan'] as const){
      const route=quickValidationRoute(customFieldFocusId(stage,'draft-owner','field'),true,false);
      expect(route).toMatchObject({notebookPage:null,draftStep:1,draftPlanPage:0});
    }
  });
  it('deactivated required definitions do not block new answers, historical content remains untouched',async()=>{
    const disabled={...fields.find(x=>x.field_id==='zone-note')!,active:false};
    const defs=fields.map(x=>x.field_id===disabled.field_id?disabled:x);
    const reader={...readerForOwnerA(),listCustomFieldDefinitions:async()=>defs};
    expect((await missingRequiredCustomValues(reader,'zone','owner-B')).map(v=>v.id))
      .toEqual(['zone-pick']);
    expect(savedNote.text_value).toBe('Owner A note');
  });
});
