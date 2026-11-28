import {nextCustomDisplayOrder} from './customAdminValidation';
import {describe,it,expect} from 'vitest';
import {assertCustomFieldTextUnchanged,customFieldTextReadbackMatches,CustomAdminValidationError,isPreWriteCustomAdminValidation,validateNewCustomFieldDefinition} from './customAdminValidation';
describe('custom admin uncertain-write distinction',()=>{
 it('recognizes only pre-write validation error type',()=>{
   expect(isPreWriteCustomAdminValidation(new CustomAdminValidationError('Duplicate active option'))).toBe(true);
   expect(isPreWriteCustomAdminValidation(new Error('VALIDATION: database failed after write'))).toBe(false);
   expect(isPreWriteCustomAdminValidation('VALIDATION: backend failed')).toBe(false);
 });
});

describe('custom field create preflight parity with native Rust',()=>{
 const base={field_id:'6d6febf2-47d0-49e7-93ae-d102b02b4995',stage:'session',field_type:'SINGLE_SELECT',label:'Session Focus TEST',help_text:'Select the main focus for this session',display_order:0};
 it('allows select definition with zero initial choices: options can be created later',()=>{
  expect(()=>validateNewCustomFieldDefinition(base)).not.toThrow();
  expect(()=>validateNewCustomFieldDefinition({...base,field_type:'MULTI_SELECT'})).not.toThrow();
  expect(()=>validateNewCustomFieldDefinition({...base,field_type:'TEXT'})).not.toThrow();
 });
 it('fails obvious invalid inputs before IPC, without uncertain-write lock',()=>{
  expect(()=>validateNewCustomFieldDefinition({...base,label:'  '})).toThrow(CustomAdminValidationError);
  expect(()=>validateNewCustomFieldDefinition({...base,help_text:'bad\nhelp'})).toThrow(CustomAdminValidationError);
  expect(()=>validateNewCustomFieldDefinition({...base,field_type:'UNKNOWN'})).toThrow(CustomAdminValidationError);
  expect(()=>validateNewCustomFieldDefinition({...base,display_order:-1})).toThrow(CustomAdminValidationError);
  expect(()=>validateNewCustomFieldDefinition({...base,label:'م'.repeat(121)})).toThrow(CustomAdminValidationError);
 });
});


describe('Custom field text edit safety',()=>{
 const before={field_id:'field-1',label:'Focus',help_text:'Original help',stage:'session',field_type:'TEXT',required:true,active:true,display_order:2};
 it('accepts unchanged opening text and rejects missing or stale definitions',()=>{
  expect(()=>assertCustomFieldTextUnchanged(before,{...before})).not.toThrow();
  for(const latest of [undefined,{...before,label:'Changed'},{...before,help_text:'Changed'},{...before,field_id:'field-2'}]){
   expect(()=>assertCustomFieldTextUnchanged(before,latest)).toThrow(CustomAdminValidationError);
  }
  expect(()=>assertCustomFieldTextUnchanged(undefined,before)).toThrow(CustomAdminValidationError);
 });
 it('verifies edited help, including explicit removal, without changing identity or metadata',()=>{
  const expected={...before,label:'New focus',help_text:''};
  expect(customFieldTextReadbackMatches(expected,{...expected})).toBe(true);
  expect(customFieldTextReadbackMatches(expected,undefined)).toBe(false);
  for(const mismatch of [{field_id:'other'},{label:'Old'},{help_text:'Old help'},{stage:'zone'},{field_type:'NUMBER'},{required:false},{active:false},{display_order:3}]){
   expect(customFieldTextReadbackMatches(expected,{...expected,...mismatch})).toBe(false);
  }
 });
});

describe('new custom field and option ordering',()=>{
 it('appends after sparse saved positions and starts an empty list at zero',()=>{
  expect(nextCustomDisplayOrder([])).toBe(0);
  expect(nextCustomDisplayOrder([{display_order:2},{display_order:17},{display_order:4}])).toBe(18);
 });
 it('rejects ranks that cannot be safely extended',()=>{
  expect(()=>nextCustomDisplayOrder([{display_order:Number.MAX_SAFE_INTEGER}])).toThrow('cannot be extended');
 });
});
