import {describe,it,expect} from 'vitest';
import {customAdminEditDisabled,customAdminRefreshDisabled} from './customAdminRecovery';
describe('Custom field uncertain-write recovery',()=>{
  it('keeps Refresh enabled when a write is uncertain, while blocking new edits',()=>{
    const busy=false,uncertain=true;
    expect(customAdminRefreshDisabled(busy)).toBe(false);
    expect(customAdminEditDisabled(busy,uncertain)).toBe(true);
  });
  it('blocks Refresh while another request is running',()=>{
    expect(customAdminRefreshDisabled(true)).toBe(true);
    expect(customAdminEditDisabled(true,false)).toBe(true);
  });
});
