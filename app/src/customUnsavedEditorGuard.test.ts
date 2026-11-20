import {describe,it,expect} from 'vitest';
import {customEditorKey,hasUnsubmittedCustomTypedDraft,hasUnsubmittedCustomSelectionDraft,hasUnsavedCustomEditors} from './customUnsavedEditorGuard';

describe('Package A unsaved Custom Fields owner and Session leave gate',()=>{
 it('keeps stage and owner identities injective despite separators',()=>{
   expect(customEditorKey('typed','candidate','a-b')).not.toBe(customEditorKey('typed','candidate-a','b'));
   expect(customEditorKey('select','zone','zone-A')).not.toBe(customEditorKey('typed','zone','zone-A'));
 });
 it('recognizes unsaved TEXT, NUMBER, DATE and BOOLEAN edits without counting unchanged drafts',()=>{
   expect(hasUnsubmittedCustomTypedDraft({text:'',number:'0',date:'2026-11-20',bool:'false'},
     {text:'',number:'0',date:'2026-11-20',bool:'false'},['text','number','date','bool'])).toBe(false);
   expect(hasUnsubmittedCustomTypedDraft({text:'Partial plan'},{text:''},['text'])).toBe(true);
   expect(hasUnsubmittedCustomTypedDraft({number:'-1'},{number:'0'},['number'])).toBe(true);
   expect(hasUnsubmittedCustomTypedDraft({text:'Draft'},{text:''},['another-field'])).toBe(false);
 });
 it('recognizes unsaved select options and their immutable ordinal order',()=>{
   const original={zone:['sourceA','sourceB']};
   expect(hasUnsubmittedCustomSelectionDraft(original,original,['zone'])).toBe(false);
   expect(hasUnsubmittedCustomSelectionDraft({zone:['sourceB','sourceA']},original,['zone'])).toBe(true);
   expect(hasUnsubmittedCustomSelectionDraft({zone:['sourceA']},original,['zone'])).toBe(true);
   expect(hasUnsubmittedCustomSelectionDraft({zone:['sourceA','sourceB']},original,['zone'])).toBe(false);
 });
 it('prevents leaving while any current Custom editor is unsaved',()=>{
   const dirty=new Set<string>();
   expect(hasUnsavedCustomEditors(dirty)).toBe(false);
   dirty.add(customEditorKey('typed','session','session-A'));
   dirty.add(customEditorKey('select','zone','zone-B'));
   expect(hasUnsavedCustomEditors(dirty)).toBe(true);
   dirty.delete(customEditorKey('typed','session','session-A'));
   expect(hasUnsavedCustomEditors(dirty)).toBe(true);
   dirty.clear();
   expect(hasUnsavedCustomEditors(dirty)).toBe(false);
 });
});
