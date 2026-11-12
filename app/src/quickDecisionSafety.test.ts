import {describe,expect,it} from 'vitest';
import {directionFromZoneIntent,hasUnsavedDecisionCapture,type ExplicitTradeDirection} from './quickDecisionSafety';

describe('Quick Decision explicit direction and edit preservation',()=>{
  it('prefills ONLY a clearly directional Zone and never copies a previous direction',()=>{
    expect(directionFromZoneIntent('LONG')).toBe('LONG');
    expect(directionFromZoneIntent('SHORT')).toBe('SHORT');
    for(const intent of ['CONDITIONAL','WATCH','UNKNOWN','MIXED','',null,undefined])
      expect(directionFromZoneIntent(intent)).toBe('');
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
