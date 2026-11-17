import {describe,it,expect} from 'vitest';
import { CAPTURABLE_CUSTOM_FIELD_STAGES } from './customFieldStage';
import { defaultCustomPresentation, effectiveCustomPresentation,isCustomFieldPresented,nextCustomPresentation,compactCustomPresentation,safeVisibleCustomFields } from './customFieldPresentation';
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

describe('Safe preference cleanup after controlled deletion of a NEVER-used field',()=>{
 it('retains inactive field preferences and removes only truly absent definitions',()=>{
   const active=def('zone'),inactive=def('trade',false,false);
   const prefs={
     [active.field_id]:{visible:false,placement:'DETAILED_ONLY' as const},
     [inactive.field_id]:{visible:false,placement:'DETAILED_ONLY' as const},
     'deleted-unused-field':{visible:true,placement:'QUICK_AND_DETAILED' as const},
   };
   expect(compactCustomPresentation(prefs,[active,inactive])).toEqual({
     [active.field_id]:prefs[active.field_id],
     [inactive.field_id]:prefs[inactive.field_id],
   });
   expect(prefs['deleted-unused-field']).toBeDefined(); // original map is not mutated
 });
});

describe('Required Custom Fields remain available when display preferences fail to load',()=>{
 it.each(CAPTURABLE_CUSTOM_FIELD_STAGES)('keeps Required %s editable without disclosing optional saved-hidden fields',(stage)=>{
  const required=def(stage,true);
  const optional={...def(stage,false),field_id:stage+'-optional'};
  const inactive={...def(stage,true,false),field_id:stage+'-inactive'};
  const fields=[required,optional,inactive];
  const stalePreferences={
   [required.field_id]:{visible:false,placement:'DETAILED_ONLY' as const},
   [optional.field_id]:{visible:false,placement:'DETAILED_ONLY' as const},
  };
  // Use distinct IDs: fallback depends on verified required/active semantics,
  // not a guessed or cached visibility preference.
  for(const quick of [true,false]){
   expect(safeVisibleCustomFields(fields,quick,stalePreferences,false)).toEqual([required]);
  }
  expect(safeVisibleCustomFields([optional],true,stalePreferences,false)).toEqual([]);
  expect(safeVisibleCustomFields([inactive],false,{},false)).toEqual([]);
 });
 it('restores optional visibility/placement ONLY after saved presentation was loaded',()=>{
  const optional=def('trade');
  const prefs={[optional.field_id]:{visible:true,placement:'DETAILED_ONLY' as const}};
  expect(safeVisibleCustomFields([optional],true,prefs,false)).toEqual([]);
  expect(safeVisibleCustomFields([optional],true,prefs,true)).toEqual([]);
  expect(safeVisibleCustomFields([optional],false,prefs,true)).toEqual([optional]);
  const hidden={[optional.field_id]:{visible:false,placement:'QUICK_AND_DETAILED' as const}};
  expect(safeVisibleCustomFields([optional],false,hidden,true)).toEqual([]);
 });
});
