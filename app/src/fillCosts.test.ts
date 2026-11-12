import {describe,it,expect} from 'vitest';
import {parseOptionalFillCost,fillCostCoverage} from './fillCosts';
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
