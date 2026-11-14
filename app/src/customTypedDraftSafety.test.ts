import {describe,it,expect} from 'vitest';
import {isValidCustomTextDraft,isValidCustomTypedDraft} from './customTypedDraftSafety';
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

describe('Custom typed draft pre-write parity for every native kind',()=>{
 it('allows numeric zero, negatives and exponent notation but no non-finite or blank values',()=>{
   for(const value of ['0','-2.5','1e2','0.0001'])expect(isValidCustomTypedDraft('NUMBER',value)).toBe(true);
   for(const value of ['', '   ','Infinity','NaN','1e999','abc'])expect(isValidCustomTypedDraft('NUMBER',value)).toBe(false);
 });
 it('checks Gregorian DATE before sending an append attempt to SQLite',()=>{
   for(const value of ['2024-02-29','2026-11-14'])expect(isValidCustomTypedDraft('DATE',value)).toBe(true);
   for(const value of ['','2026-02-29','2026-04-31','2026-2-09','not a date'])
     expect(isValidCustomTypedDraft('DATE',value)).toBe(false);
 });
 it('accepts only explicit persisted yes/no choices; a blank or corrupt value is never false',()=>{
   expect(isValidCustomTypedDraft('BOOLEAN','true')).toBe(true);
   expect(isValidCustomTypedDraft('BOOLEAN','false')).toBe(true);
   for(const value of ['', 'False', '0', 'yes', 'other'])expect(isValidCustomTypedDraft('BOOLEAN',value)).toBe(false);
 });
 it('applies the already validated TEXT byte and control constraints uniformly',()=>{
   expect(isValidCustomTypedDraft('TEXT','Valid information')).toBe(true);
   expect(isValidCustomTypedDraft('TEXT','New\\nline')).toBe(true);
   expect(isValidCustomTypedDraft('TEXT','New\nline')).toBe(false);
   expect(isValidCustomTypedDraft('TEXT','x'.repeat(4001))).toBe(false);
   expect(isValidCustomTypedDraft('SINGLE_SELECT','A')).toBe(false);
 });
});
