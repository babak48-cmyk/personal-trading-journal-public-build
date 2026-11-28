import {describe,expect,it} from 'vitest';
import {auditedFillCorrectionEditable} from './auditedCorrectionReadiness';

describe('historical Fill edit requires verified audit history',()=>{
  it('allows editing only for closed, unlocked Trades after successful audit read',()=>{
    expect(auditedFillCorrectionEditable('CLOSED',false,true)).toBe(true);
    expect(auditedFillCorrectionEditable('CLOSED',false,false)).toBe(false);
    expect(auditedFillCorrectionEditable('OPEN',false,true)).toBe(false);
    expect(auditedFillCorrectionEditable('PARTIALLY_CLOSED',false,true)).toBe(false);
    expect(auditedFillCorrectionEditable('CLOSED',true,true)).toBe(false);
    expect(auditedFillCorrectionEditable('CLOSED',true,false)).toBe(false);
  });
});
