import {describe,expect,it} from 'vitest';
import {manualFillIssues,manualStopRevisionIssues} from './tradeFillValidation';

const sample={action:'EXIT' as const,price:6025.25,quantity:1,openQuantity:2,tickSize:0.25};
const ids=(input:Parameters<typeof manualFillIssues>[0])=>manualFillIssues(input).map(i=>i.id);

describe('Package B: safe pre-write manual ENTRY and EXIT fills',()=>{
  it('accepts an aligned partial exit and the remaining close without assuming execution',()=>{
    expect(manualFillIssues(sample)).toEqual([]);
    expect(manualFillIssues({...sample,quantity:2})).toEqual([]);
    expect(manualFillIssues({...sample,action:'ENTRY',quantity:3})).toEqual([]);
  });
  it('does not depend on ES; supports GC and an instrument that can quote a negative price',()=>{
    expect(ids({...sample,tickSize:0.1,price:3510.3})).toEqual([]);
    expect(ids({...sample,tickSize:0.01,price:-2.5})).toEqual([]);
  });
  it('rejects off-tick prices and bad instrument snapshots before mutating IPC',()=>{
    expect(ids({...sample,price:6025.3})).toContain('fill.price');
    for(const tickSize of [0,NaN,Infinity,-0.25])
      expect(ids({...sample,tickSize})).toContain('fill.price');
    for(const price of [null,NaN,Infinity,-Infinity])
      expect(ids({...sample,price})).toContain('fill.price');
  });
  it('rejects invalid quantity and exit greater than remaining contracts',()=>{
    for(const quantity of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])
      expect(ids({...sample,quantity})).toContain('fill.quantity');
    expect(ids({...sample,quantity:3})).toContain('fill.quantity');
    expect(ids({...sample,openQuantity:0})).toContain('fill.quantity');
    expect(ids({...sample,openQuantity:1.5})).toContain('fill.quantity');
    expect(ids({...sample,action:'ENTRY',openQuantity:0,quantity:1})).toEqual([]);
  });
  it('reports both price and quantity issues in one click',()=>{
    expect(ids({...sample,price:6025.3,quantity:3})).toEqual(['fill.price','fill.quantity']);
  });
});

describe('Package B: manual stop revision saves an auditable, tick-valid price',()=>{
  it('accepts tick-aligned new stops for ES, GC, and a valid negative-price instrument',()=>{
    expect(manualStopRevisionIssues(6020.25,0.25)).toEqual([]);
    expect(manualStopRevisionIssues(3512.4,0.1)).toEqual([]);
    expect(manualStopRevisionIssues(-1.25,0.25)).toEqual([]);
  });
  it('rejects off-tick, blank, non-finite or invalid snapshot before any save',()=>{
    expect(manualStopRevisionIssues(6020.3,0.25)[0]?.id).toBe('management.stop');
    for(const stop of [null,NaN,Infinity,-Infinity])
      expect(manualStopRevisionIssues(stop,0.25)[0]?.id).toBe('management.stop');
    for(const tick of [0,NaN,Infinity,-1])
      expect(manualStopRevisionIssues(6020.25,tick)[0]?.id).toBe('management.stop');
  });
});
