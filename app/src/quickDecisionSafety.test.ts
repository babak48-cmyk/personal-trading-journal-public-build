import {describe,expect,it} from 'vitest';
import {directionFromZoneIntent,missingTradeDirection,hasUnsavedDecisionCapture,requiresDecisionLeaveGate,confirmedEvidenceZoneDestination,quickDecisionSwitchDisposition,type ExplicitTradeDirection} from './quickDecisionSafety';

describe('Quick Decision explicit direction and edit preservation',()=>{
  it('prefills ONLY a clearly directional Zone and never copies a previous direction',()=>{
    expect(directionFromZoneIntent('LONG')).toBe('LONG');
    expect(directionFromZoneIntent('SHORT')).toBe('SHORT');
    for(const intent of ['CONDITIONAL','WATCH','UNKNOWN','MIXED','',null,undefined])
      expect(directionFromZoneIntent(intent)).toBe('');
  });
  it('requires an actual side only for TRADE, never No-trade or Missed',()=>{
    expect(missingTradeDirection('','TRADE')).toBe(true);
    expect(missingTradeDirection('LONG','TRADE')).toBe(false);
    expect(missingTradeDirection('SHORT','TRADE')).toBe(false);
    expect(missingTradeDirection('','NO_TRADE')).toBe(false);
    expect(missingTradeDirection('','MISSED')).toBe(false);
  });
  const draft={
    note:'',reason:'',quality:'',mismatchReason:'',
    direction:'' as ExplicitTradeDirection,defaultDirection:'' as ExplicitTradeDirection,
    decisionType:'TRADE' as const,initialType:'TRADE' as const,
  };
  it('does not warn on pristine editor; detects actual text, grade, or type change',()=>{
    expect(hasUnsavedDecisionCapture(draft)).toBe(false);
    expect(hasUnsavedDecisionCapture({...draft,note:'  '})).toBe(false);
    expect(hasUnsavedDecisionCapture({...draft,note:'rejected prior high'})).toBe(true);
    expect(hasUnsavedDecisionCapture({...draft,reason:'HESITATION'})).toBe(true);
    expect(hasUnsavedDecisionCapture({...draft,quality:'B'})).toBe(true);
    expect(hasUnsavedDecisionCapture({...draft,mismatchReason:'NEW_EVIDENCE'})).toBe(true);
    expect(hasUnsavedDecisionCapture({...draft,decisionType:'MISSED'})).toBe(true);
  });
  it('detects explicit direction changes, but an untouched Zone-derived direction is clean',()=>{
    expect(hasUnsavedDecisionCapture({...draft,direction:'SHORT'})).toBe(true);
    expect(hasUnsavedDecisionCapture({...draft,direction:'LONG',defaultDirection:'LONG'})).toBe(false);
    expect(hasUnsavedDecisionCapture({...draft,direction:'SHORT',defaultDirection:'LONG'})).toBe(true);
  });
});

describe('Direct multi-Zone Evidence actions honour unsaved Decision navigation',()=>{
  it('gates direct Evidence from an open Decision editor regardless of Zone identity',()=>{
    expect(requiresDecisionLeaveGate('DECISION',true,'EVIDENCE')).toBe(true);
    expect(requiresDecisionLeaveGate('DECISION',true,'PLAN')).toBe(true);
  });
  it('does not gate clean navigation without an open Decision editor',()=>{
    expect(requiresDecisionLeaveGate('DECISION',false,'EVIDENCE')).toBe(false);
    expect(requiresDecisionLeaveGate('PLAN',true,'EVIDENCE')).toBe(false);
    expect(requiresDecisionLeaveGate('EVIDENCE',true,'EVIDENCE')).toBe(false);
    expect(requiresDecisionLeaveGate('DECISION',true,'DECISION')).toBe(false);
  });
  it('does not treat a NO_TRADE or MISSED draft as safe to discard',()=>{
    for(const type of ['NO_TRADE','MISSED'] as const){
      const draft={
        note:'',reason:'HESITATION',quality:'',mismatchReason:'',
        direction:'' as ExplicitTradeDirection,defaultDirection:'' as ExplicitTradeDirection,
        decisionType:type,initialType:type,
      };
      expect(hasUnsavedDecisionCapture(draft)).toBe(true);
      expect(requiresDecisionLeaveGate('DECISION',true,'EVIDENCE')).toBe(true);
    }
  });
});

describe('Resume the exact clicked Zone after retaining an unsaved Decision',()=>{
  it('continues directly to the requested Evidence owner, not the earlier Zone',()=>{
    expect(confirmedEvidenceZoneDestination('EVIDENCE','zone-B')).toBe('zone-B');
    expect(confirmedEvidenceZoneDestination('EVIDENCE','zone-A')).toBe('zone-A');
    expect(confirmedEvidenceZoneDestination('EVIDENCE','zone:ES-12:range')).toBe('zone:ES-12:range');
  });
  it('ignores stale destinations when continuing to Plan or Review',()=>{
    for(const page of ['PLAN','DECISION','EXECUTION','REVIEW'])
      expect(confirmedEvidenceZoneDestination(page,'zone-B')).toBeNull();
  });
  it('never invents a destination from missing or blank identity',()=>{
    expect(confirmedEvidenceZoneDestination('EVIDENCE',null)).toBeNull();
    expect(confirmedEvidenceZoneDestination('EVIDENCE','')).toBeNull();
    expect(confirmedEvidenceZoneDestination('EVIDENCE',' ')).toBeNull();
  });
  it('does not change whether a Decision must ask to keep its unsaved draft',()=>{
    expect(requiresDecisionLeaveGate('DECISION',true,'EVIDENCE')).toBe(true);
    expect(requiresDecisionLeaveGate('EVIDENCE',true,'EVIDENCE')).toBe(false);
  });
});

describe('Quick Capture Zone and Decision type switches cannot silently erase an editor',()=>{
  it('does not reopen the same Zone or same Decision type',()=>{
    expect(quickDecisionSwitchDisposition('zone-A','TRADE','zone-A',null,true)).toBe('SAME');
    expect(quickDecisionSwitchDisposition('zone-A','NO_TRADE','zone-A','NO_TRADE',true)).toBe('SAME');
  });
  it('requires visible leave flow for dirty Zone and type changes including MISSED',()=>{
    expect(quickDecisionSwitchDisposition('zone-A','TRADE','zone-B',null,true)).toBe('PROMPT');
    expect(quickDecisionSwitchDisposition('zone-A','NO_TRADE','zone-B','NO_TRADE',true)).toBe('PROMPT');
    expect(quickDecisionSwitchDisposition('zone-A','MISSED','zone-A','TRADE',true)).toBe('PROMPT');
  });
  it('allows only clean or absent editors to switch without a destructive prompt',()=>{
    expect(quickDecisionSwitchDisposition('zone-A','TRADE','zone-B',null,false)).toBe('SWITCH');
    expect(quickDecisionSwitchDisposition('zone-A','TRADE','zone-A','MISSED',false)).toBe('SWITCH');
    expect(quickDecisionSwitchDisposition(null,null,'zone-B','NO_TRADE',false)).toBe('SWITCH');
  });
});
