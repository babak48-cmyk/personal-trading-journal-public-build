import {describe,it,expect} from 'vitest';
import {previewEntryRisk} from './entryRiskPreview';
const baseline={entry:6025.25,stop:6022.25,quantity:2,tickSize:0.25,pointValue:50,direction:'LONG',target:6031.25};
describe('session-snapshot entry risk preview',()=>{
  it('derives long risk, ticks, and gross planned target R without predicting costs',()=>{
    expect(previewEntryRisk(baseline)).toMatchObject({riskDollars:300,riskTicks:12,targetRewardDollars:600,targetGrossR:2,problems:[]});
  });
  it('supports short direction and instrument-specific point value',()=>{
    expect(previewEntryRisk({...baseline,entry:3500,stop:3501,quantity:1,tickSize:0.1,pointValue:100,direction:'SHORT',target:3498}))
      .toMatchObject({riskDollars:100,riskTicks:10,targetRewardDollars:200,targetGrossR:2,problems:[]});
  });
  it('does not invent a target or an R value if target was not recorded',()=>{
    expect(previewEntryRisk({...baseline,target:null})).toMatchObject({riskDollars:300,targetRewardDollars:null,targetGrossR:null});
  });
  it('identifies off-tick prices before committing anything',()=>{
    expect(previewEntryRisk({...baseline,entry:6025.3}).problems.map(p=>p.id)).toContain('trade.entryPrice');
    const badTarget=previewEntryRisk({...baseline,target:6031.3});
    expect(badTarget.problems.map(p=>p.id)).toContain('trade.plannedTarget');
    expect(badTarget.riskDollars).toBe(300);
    expect(badTarget.targetGrossR).toBeNull();
  });
  it('rejects invalid stop sides and prevents a misleading negative-risk preview',()=>{
    const p=previewEntryRisk({...baseline,stop:6026});
    expect(p.riskDollars).toBeNull();
    expect(p.problems.map(x=>x.id)).toContain('trade.stopPrice');
  });
  it('refuses unknown or invalid contract snapshots and invalid quantities',()=>{
    expect(previewEntryRisk({...baseline,pointValue:0}).riskDollars).toBeNull();
    expect(previewEntryRisk({...baseline,tickSize:NaN}).problems.length).toBeGreaterThan(0);
    expect(previewEntryRisk({...baseline,quantity:1.2}).riskDollars).toBeNull();
    expect(previewEntryRisk({...baseline,direction:null}).riskDollars).toBeNull();
  });
  it('labels a target on the loss side as negative gross planned R, not a guaranteed outcome',()=>{
    expect(previewEntryRisk({...baseline,target:6024.25}).targetGrossR).toBeCloseTo(-1/3);
  });
});
