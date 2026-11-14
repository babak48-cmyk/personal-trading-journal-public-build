import {describe,it,expect} from 'vitest';
import {isUniqueActiveCustomLabel,normalizedCustomLabel} from './customFieldLabelSafety';

describe('custom-field and option label collision protection',()=>{
  const known=[{id:'a',label:'  Prior   Day  ',active:true},{id:'b',label:'Retired',active:false}];
  it('normalizes whitespace and case without changing the stored source label',()=>{
    expect(normalizedCustomLabel('  Prior    Day  ')).toBe('prior day');
    expect(isUniqueActiveCustomLabel('prior day',known)).toBe(false);
    expect(isUniqueActiveCustomLabel('PRIOR DAY',known)).toBe(false);
    expect(known[0].label).toBe('  Prior   Day  ');
  });
  it('accepts renaming to your own label and allows inactive historical duplicates',()=>{
    expect(isUniqueActiveCustomLabel('prior day',known,'a')).toBe(true);
    expect(isUniqueActiveCustomLabel('Retired',known)).toBe(true);
    expect(isUniqueActiveCustomLabel('Different',known)).toBe(true);
    expect(isUniqueActiveCustomLabel('  ',known)).toBe(false);
  });
});
