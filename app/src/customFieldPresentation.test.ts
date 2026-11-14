import {describe,it,expect} from 'vitest';
import { CAPTURABLE_CUSTOM_FIELD_STAGES } from './customFieldStage';
import { defaultCustomPresentation, effectiveCustomPresentation,isCustomFieldPresented,nextCustomPresentation } from './customFieldPresentation';
import type {CustomFieldDefinition} from './services/localApi';
const def=(stage:string,required=false,active=true):CustomFieldDefinition=>({
 field_id:stage+'-field',stage,field_type:'TEXT',label:'Test',help_text:'',required,active,display_order:0
});
describe('One Custom Fields presentation policy for all seven lifecycle stages',()=>{
 it.each(CAPTURABLE_CUSTOM_FIELD_STAGES)('%s keeps optional values in Detailed and Required visible in both',(stage)=>{
   const optional=def(stage);
   expect(isCustomFieldPresented(optional,true,{})).toBe(true);
   const prefs=nextCustomPresentation(optional,{},'placement');
   expect(isCustomFieldPresented(optional,true,prefs)).toBe(false);
   expect(isCustomFieldPresented(optional,false,prefs)).toBe(true);
   const hidden=nextCustomPresentation(optional,prefs,'visible');
   expect(isCustomFieldPresented(optional,false,hidden)).toBe(false);
   expect(isCustomFieldPresented(optional,true,hidden)).toBe(false);
   expect(isCustomFieldPresented(def(stage,true),true,hidden)).toBe(true);
   expect(isCustomFieldPresented(def(stage,true),false,hidden)).toBe(true);
   expect(isCustomFieldPresented(def(stage,false,false),false,{})).toBe(false);
   expect(effectiveCustomPresentation(def(stage,true),hidden)).toEqual(defaultCustomPresentation);
   expect(nextCustomPresentation(def(stage,true),hidden,'placement')).toBe(hidden);
 });
 it('does not mutate another field setting or remove a saved owner value',()=>{
   const a=def('zone'),b=def('trade');
   const prefs=nextCustomPresentation(a,{},'visible');
   expect(isCustomFieldPresented(b,true,prefs)).toBe(true);
   expect(prefs[a.field_id].visible).toBe(false);
 });
});
