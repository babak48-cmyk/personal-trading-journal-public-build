import {describe,it,expect} from 'vitest';
import {CustomAdminValidationError,isPreWriteCustomAdminValidation,validateNewCustomFieldDefinition} from './customAdminValidation';
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
  expect(()=>validateNewCustomFieldDefinition({...base,help_text:'bad\\nhelp'})).toThrow(CustomAdminValidationError);
  expect(()=>validateNewCustomFieldDefinition({...base,field_type:'UNKNOWN'})).toThrow(CustomAdminValidationError);
  expect(()=>validateNewCustomFieldDefinition({...base,display_order:-1})).toThrow(CustomAdminValidationError);
  expect(()=>validateNewCustomFieldDefinition({...base,label:'م'.repeat(121)})).toThrow(CustomAdminValidationError);
 });
});
