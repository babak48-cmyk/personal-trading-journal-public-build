import {describe,it,expect} from 'vitest';
import {executionAccountingCautions} from './executionAccountingCautions';
import type {ExecutionFill} from './services/localApi';
const fill=(action:'ENTRY'|'EXIT'):ExecutionFill=>({execution_id:action,action,side:'BUY',price:100,quantity:1});
describe('risk accounting reconciliation flags',()=>{
  it('does not flag ordinary entry then exit',()=>expect(executionAccountingCautions([fill('ENTRY'),fill('EXIT')])).toEqual([]));
  it('does not flag scaling in before all exits',()=>expect(executionAccountingCautions([fill('ENTRY'),fill('ENTRY'),fill('EXIT'),fill('EXIT')])).toEqual([]));
  it('flags a new entry after any exit, only once',()=>{
    expect(executionAccountingCautions([fill('ENTRY'),fill('EXIT'),fill('ENTRY'),fill('EXIT'),fill('ENTRY')])).toHaveLength(1);
  });
  it('does not infer profit or mutate recorded fills',()=>{
    const data=[fill('ENTRY'),fill('EXIT'),fill('ENTRY')];
    const copy=JSON.stringify(data);
    executionAccountingCautions(data);
    expect(JSON.stringify(data)).toBe(copy);
  });
});
