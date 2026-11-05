import { describe, expect, it } from 'vitest';
import { evidenceRequiredIssues } from './evidenceValidation';

describe('atomic Evidence capture required-field checks', () => {
  it('keeps both observation details optional by default', () => {
    expect(evidenceRequiredIssues({},null,'')).toEqual([]);
  });
  it('identifies every missing user-required input before the batch save', () => {
    expect(evidenceRequiredIssues({'evidence.price':true,'evidence.note':true},null,'  ')).toEqual([
      {id:'evidence.price',label:'Observed price'},
      {id:'evidence.note',label:'Evidence note'},
    ]);
  });
  it('treats zero as a present numeric price and preserves a valid note', () => {
    expect(evidenceRequiredIssues({'evidence.price':true,'evidence.note':true},0,'Absorption observed')).toEqual([]);
  });
  it('supports independent required settings without forcing the other input', () => {
    expect(evidenceRequiredIssues({'evidence.note':true},null,'Observed')).toEqual([]);
    expect(evidenceRequiredIssues({'evidence.price':true},null,'')).toEqual([{id:'evidence.price',label:'Observed price'}]);
  });
});
