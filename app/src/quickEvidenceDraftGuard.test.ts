import {describe,expect,it} from 'vitest';
import {hasUnsavedEvidenceDraft,shouldPromptEvidencePageLeave,type QuickEvidenceDraft} from './quickEvidenceDraftGuard';

const empty:QuickEvidenceDraft={
 selectedIds:[],stances:{},direction:'',price:null,note:'',acknowledgedSaved:false,
};
describe('Quick Evidence draft navigation safeguards',()=>{
 it('leaves untouched Evidence empty; no manufactured confirmation or role',()=>{
   expect(hasUnsavedEvidenceDraft(empty)).toBe(false);
   expect(hasUnsavedEvidenceDraft({...empty,note:'   '})).toBe(false);
   expect(hasUnsavedEvidenceDraft({...empty,stances:{x:'GENERAL_OBSERVATION'}})).toBe(false);
 });
 it('protects observations, classification, price including zero, direction and notes',()=>{
   expect(hasUnsavedEvidenceDraft({...empty,selectedIds:['DOM_IMBALANCE']})).toBe(true);
   expect(hasUnsavedEvidenceDraft({...empty,stances:{x:'CONTRADICTING_EVIDENCE'}})).toBe(false); // Deselected chip cannot be persisted.
   expect(hasUnsavedEvidenceDraft({...empty,price:0})).toBe(true);
   expect(hasUnsavedEvidenceDraft({...empty,price:6011.25})).toBe(true);
   expect(hasUnsavedEvidenceDraft({...empty,direction:'NEUTRAL'})).toBe(true);
   expect(hasUnsavedEvidenceDraft({...empty,note:'observed absorption'})).toBe(true);
 });
 it('requires an in-app warning for actual observed unsaved Evidence on EVERY page exit',()=>{
   const observed={...empty,selectedIds:['DELTA_BEHAVIOUR'],note:'Test unsaved evidence'};
   for(const page of ['PLAN','DECISION','EXECUTION','REVIEW'])
     expect(shouldPromptEvidencePageLeave('EVIDENCE',page,true,observed)).toBe(true);
   expect(shouldPromptEvidencePageLeave('EVIDENCE','EVIDENCE',true,observed)).toBe(false);
   expect(shouldPromptEvidencePageLeave('DECISION','REVIEW',true,observed)).toBe(false);
   expect(shouldPromptEvidencePageLeave('EVIDENCE','DECISION',false,observed)).toBe(false);
   expect(shouldPromptEvidencePageLeave('EVIDENCE','DECISION',true,empty)).toBe(false);
   expect(shouldPromptEvidencePageLeave('EVIDENCE','DECISION',true,{...observed,acknowledgedSaved:true})).toBe(false);
 });
 it('does not represent an acknowledged atomic batch as unsaved',()=>{
   expect(hasUnsavedEvidenceDraft({...empty,selectedIds:['x'],note:'saved',acknowledgedSaved:true})).toBe(false);
 });
});
