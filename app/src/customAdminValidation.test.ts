import {describe,it,expect} from 'vitest';
import {CustomAdminValidationError,isPreWriteCustomAdminValidation} from './customAdminValidation';
describe('custom admin uncertain-write distinction',()=>{
 it('recognizes only pre-write validation error type',()=>{
   expect(isPreWriteCustomAdminValidation(new CustomAdminValidationError('Duplicate active option'))).toBe(true);
   expect(isPreWriteCustomAdminValidation(new Error('VALIDATION: database failed after write'))).toBe(false);
   expect(isPreWriteCustomAdminValidation('VALIDATION: backend failed')).toBe(false);
 });
});
