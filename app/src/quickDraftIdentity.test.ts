import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
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
  it('wires app-owned Decision and Trade Close and accessible read-only decision notes',()=>{
    // Static connection regression only: an installed Windows test is still required.
    const app=readFileSync(new URL('./App.tsx',import.meta.url),'utf8');
    expect(app).toContain('onClick={requestCloseDecisionEditor}>Close');
    expect(app).toContain('onClick={requestCloseDecisionEditor}>Cancel');
    expect(app).toContain('onClick={closePendingEntry}>Close');
    expect(app).toContain('id="decision-unsaved-close-warning"');
    expect(app).toContain('id="entry-unsaved-close-warning"');
    expect(app).toContain('Close and keep draft');
    expect(app).toContain('Discard draft and close');
    expect(app).toContain('Decision note:</b> {d.reason_note');
    expect(app).toContain('delete entryDraftsRef.current[entryDraftKey(');
    expect(app).toContain('delete decisionDraftsRef.current[decisionDraftKey(');
  });
});
