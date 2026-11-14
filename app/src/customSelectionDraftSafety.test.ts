import {describe,it,expect} from 'vitest';
import {validCustomSelectionDraft} from './customSelectionDraftSafety';
const options=[{option_id:'A',active:true},{option_id:'B',active:true},{option_id:'retired',active:false}];
describe('Custom Selection new event validity',()=>{
 it('accepts one active Single Select, never malformed legacy multi-value or duplicates',()=>{
   expect(validCustomSelectionDraft('SINGLE_SELECT',['A'],options)).toBe(true);
   expect(validCustomSelectionDraft('SINGLE_SELECT',['A','B'],options)).toBe(false);
   expect(validCustomSelectionDraft('SINGLE_SELECT',['A','A'],options)).toBe(false);
 });
 it('permits multi select only for distinct active options',()=>{
   expect(validCustomSelectionDraft('MULTI_SELECT',['A','B'],options)).toBe(true);
   expect(validCustomSelectionDraft('MULTI_SELECT',['A','A'],options)).toBe(false);
   expect(validCustomSelectionDraft('MULTI_SELECT',['retired'],options)).toBe(false);
   expect(validCustomSelectionDraft('MULTI_SELECT',[],options)).toBe(false);
   expect(validCustomSelectionDraft('OTHER',['A'],options)).toBe(false);
 });
});
