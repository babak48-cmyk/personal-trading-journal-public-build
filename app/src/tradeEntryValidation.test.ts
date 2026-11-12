import {describe,it,expect} from 'vitest';
import {tradeEntryIssues} from './tradeEntryValidation';

describe('Trade entry: missing fields appear on click rather than disabling the button',()=>{
  it('reports all required missing inputs at once',()=>{
    expect(tradeEntryIssues(null,null,0,null,true).map(x=>x.id)).toEqual([
      'trade.entryPrice','trade.stopPrice','trade.quantity','trade.plannedTarget'
    ]);
  });
  it('accepts complete entry including the explicit numeric zero where no business rule excludes it',()=>{
    expect(tradeEntryIssues(0,0,1,0,true)).toEqual([]);
  });
  it('does not require an optional target',()=>{
    expect(tradeEntryIssues(6025.25,6022.25,2,null,false)).toEqual([]);
  });
  it.each([0,-1,1.5,NaN,Infinity])('rejects non-positive, fractional or invalid quantity %s',(qty)=>{
    expect(tradeEntryIssues(6025.25,6022.25,qty,null,false).map(x=>x.id)).toContain('trade.quantity');
  });
  it('does not accept non-finite price or target',()=>{
    expect(tradeEntryIssues(NaN,Infinity,1,NaN,true).map(x=>x.id)).toEqual([
      'trade.entryPrice','trade.stopPrice','trade.plannedTarget'
    ]);
  });
});
