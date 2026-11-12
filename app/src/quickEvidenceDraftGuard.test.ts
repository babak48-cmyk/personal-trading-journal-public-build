import {describe,expect,it} from 'vitest';
import {hasUnsavedEvidenceDraft,type QuickEvidenceDraft} from './quickEvidenceDraftGuard';

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
   expect(hasUnsavedEvidenceDraft({...empty,stances:{x:'CONTRADICTING_EVIDENCE'}})).toBe(true);
   expect(hasUnsavedEvidenceDraft({...empty,price:0})).toBe(true);
   expect(hasUnsavedEvidenceDraft({...empty,price:6011.25})).toBe(true);
   expect(hasUnsavedEvidenceDraft({...empty,direction:'NEUTRAL'})).toBe(true);
   expect(hasUnsavedEvidenceDraft({...empty,note:'observed absorption'})).toBe(true);
 });
 it('does not represent an acknowledged atomic batch as unsaved',()=>{
   expect(hasUnsavedEvidenceDraft({...empty,selectedIds:['x'],note:'saved',acknowledgedSaved:true})).toBe(false);
 });
});
