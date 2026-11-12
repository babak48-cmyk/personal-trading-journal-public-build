import {describe,expect,it} from 'vitest';
import {scopedQuickDraftKey} from './quickDraftIdentity';
import {hasUnsavedEntryInputs} from './quickUnsavedCapture';
import {hasUnsavedDecisionCapture} from './quickDecisionSafety';

describe('Nov 13 Windows Decision/Entry draft regression contract',()=>{
  it('never confuses a Decision draft with an entry or another session/Zone/type',()=>{
    const a=scopedQuickDraftKey('session-A','DECISION','zone-A','NO_TRADE');
    const keys=[
      scopedQuickDraftKey('session-B','DECISION','zone-A','NO_TRADE'),
      scopedQuickDraftKey('session-A','DECISION','zone-B','NO_TRADE'),
      scopedQuickDraftKey('session-A','DECISION','zone-A','MISSED'),
      scopedQuickDraftKey('session-A','ENTRY','zone-A'),
    ];
    expect(new Set([a,...keys]).size).toBe(5);
    expect(scopedQuickDraftKey('a::b','ENTRY','c')).not.toBe(scopedQuickDraftKey('a','ENTRY','b::c'));
  });
  it('identifies precisely the unsaved ES fixture before a Trade is created',()=>{
    expect(hasUnsavedEntryInputs({entryPrice:6000,stopPrice:5998,quantity:1,target:6004,commission:'',fees:''})).toBe(true);
    expect(hasUnsavedEntryInputs({entryPrice:null,stopPrice:null,quantity:1,target:null,commission:'',fees:''})).toBe(false);
  });
  it('detects entered unsaved Decision note, independent from saved Decision history',()=>{
    expect(hasUnsavedDecisionCapture({
      note:'Test unsaved decision',reason:'',quality:'',mismatchReason:'',
      direction:'LONG',defaultDirection:'LONG',decisionType:'TRADE',initialType:'TRADE',
    })).toBe(true);
  });

});
