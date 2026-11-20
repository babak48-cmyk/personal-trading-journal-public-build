import {describe,it,expect} from 'vitest';
import {parseOptionalFillCost,fillCostCoverage,verifiedFillCostSummary,verifiedRealizedMetrics} from './fillCosts';
import type {ExecutionFill} from './services/localApi';
const fill=(commission:number|null,fees:number|null):ExecutionFill=>({
 execution_id:'f',action:'ENTRY',side:'BUY',price:100,quantity:1,commission,fees,
});
describe('manual fill cost accuracy',()=>{
  it('distinguishes unknown from explicitly confirmed zero',()=>{
    expect(parseOptionalFillCost('')).toEqual({valid:true,value:null});
    expect(parseOptionalFillCost('   ')).toEqual({valid:true,value:null});
    expect(parseOptionalFillCost('0')).toEqual({valid:true,value:0});
    expect(parseOptionalFillCost('0.00')).toEqual({valid:true,value:0});
  });
  it('accepts ordinary non-negative totals per fill',()=>{
    expect(parseOptionalFillCost('2.75')).toEqual({valid:true,value:2.75});
    expect(parseOptionalFillCost('.25')).toEqual({valid:true,value:.25});
  });
  it.each(['-1','Infinity','NaN','abc','1,000','1e4'])('rejects unsupported or invalid cost %s',(v)=>{
    expect(parseOptionalFillCost(v).valid).toBe(false);
  });
  it('reports incomplete total costs for old fills without rewriting them',()=>{
    expect(fillCostCoverage([fill(null,null),fill(1.5,0)])).toEqual({
      fillCount:2,completeFillCount:1,unknownFields:2,knownCostTotal:1.5,allKnown:false,
    });
  });
  it('marks all-known including zero cost and sums per-fill total',()=>{
    expect(fillCostCoverage([fill(0,0),fill(2,1)])).toEqual({
      fillCount:2,completeFillCount:2,unknownFields:0,knownCostTotal:3,allKnown:true,
    });
  });
});

describe('verified net P&L/R on manual partial exits and unknown costs',()=>{
  it('retains known costs exactly but refuses net/R if an entry or exit fee is UNKNOWN',()=>{
    const fills=[fill(1.25,0),fill(0,null)];
    expect(verifiedFillCostSummary(fills)).toEqual({verifiedTotal:null,missingFields:1,invalidFields:0});
    expect(verifiedRealizedMetrics(fills,1,125,1.25)).toEqual({net:null,r:null});
  });
  it('includes ALL incurred entry and exit costs during partial exits, not prorated costs',()=>{
    const fills=[fill(4,1),fill(2,0.5)];
    expect(verifiedFillCostSummary(fills).verifiedTotal).toBe(7.5);
    expect(verifiedRealizedMetrics(fills,1,117.5,1.175)).toEqual({net:117.5,r:1.175});
    expect(verifiedRealizedMetrics(fills,0,117.5,1.175)).toEqual({net:null,r:null});
    expect(verifiedRealizedMetrics([],1,117.5,1.175)).toEqual({net:null,r:null});
  });
  it('treats known zero as a confirmed amount, never as unknown',()=>{
    const fills=[fill(0,0),fill(0,0)];
    expect(verifiedFillCostSummary(fills)).toEqual({verifiedTotal:0,missingFields:0,invalidFields:0});
    expect(verifiedRealizedMetrics(fills,1,100,2)).toEqual({net:100,r:2});
  });
  it('will not mislabel invalid legacy costs or overflow as verified economics',()=>{
    for(const invalid of [NaN,Infinity,-1]){
      const fills=[fill(invalid,0),fill(0,0)];
      expect(verifiedFillCostSummary(fills).verifiedTotal).toBeNull();
      expect(verifiedRealizedMetrics(fills,1,100,1)).toEqual({net:null,r:null});
    }
    const huge=[fill(1e308,1e308)];
    expect(verifiedFillCostSummary(huge).verifiedTotal).toBeNull();
  });
  it('does not transform invalid or unrepresentable native metrics into displayed results',()=>{
    const fills=[fill(1,1)];
    expect(verifiedRealizedMetrics(fills,1,Infinity,NaN)).toEqual({net:null,r:null});
    expect(verifiedRealizedMetrics(fills,1,null,null)).toEqual({net:null,r:null});
  });
});
