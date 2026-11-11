import { describe,it,expect } from 'vitest';
import { hasUncertainWrite, canAcknowledgeVerifiedHistory } from './writeOutcomeGuard';

describe('Quick Decision/Fill persistence uncertainty gate',()=>{
  it('locks reattempt of an uncertain write for that same Zone or Trade',()=>{
    expect(hasUncertainWrite('zone-a','zone-a')).toBe(true);
    expect(hasUncertainWrite('trade-a','trade-a')).toBe(true);
    expect(hasUncertainWrite('trade-a','trade-b')).toBe(false);
    expect(hasUncertainWrite(null,'trade-a')).toBe(false);
  });
  it('requires successful history refresh for the exact owner before manual retry acknowledgement',()=>{
    expect(canAcknowledgeVerifiedHistory('trade-a',null,'trade-a')).toBe(false);
    expect(canAcknowledgeVerifiedHistory('trade-a','trade-b','trade-a')).toBe(false);
    expect(canAcknowledgeVerifiedHistory('trade-a','trade-a','trade-a')).toBe(true);
    expect(canAcknowledgeVerifiedHistory('zone-a','zone-a','zone-b')).toBe(false);
  });
});
