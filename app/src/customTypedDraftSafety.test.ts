import {describe,it,expect} from 'vitest';
import {isValidCustomTextDraft} from './customTypedDraftSafety';
describe('Custom TEXT draft matches native append contract',()=>{
 it('accepts normal text and rejects empty, control characters, oversized text',()=>{
   expect(isValidCustomTextDraft('Real observation')).toBe(true);
   expect(isValidCustomTextDraft('    ')).toBe(false);
   expect(isValidCustomTextDraft('Line one\nLine two')).toBe(false);
   expect(isValidCustomTextDraft('x'.repeat(4000))).toBe(true);
   expect(isValidCustomTextDraft('x'.repeat(4001))).toBe(false);
 });
 it('uses native UTF-8 byte length, not just JavaScript character count',()=>{
   expect(isValidCustomTextDraft('é'.repeat(2000))).toBe(true);
   expect(isValidCustomTextDraft('é'.repeat(2001))).toBe(false);
 });
});
