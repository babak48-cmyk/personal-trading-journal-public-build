import { describe, expect, it } from 'vitest';
import { evidenceRequiredIssues, evidenceSelectionIssues, showAdvancedEvidenceRole } from './evidenceValidation';

describe('atomic Evidence capture required-field checks', () => {
  it('keeps both observation details optional by default', () => {
    expect(evidenceRequiredIssues({},null,'')).toEqual([]);
  });
  it('does not infer an explicit direction from the saved Neutral fallback',()=>{
    expect(evidenceRequiredIssues({'evidence.direction':true},null,'')).toEqual([{id:'evidence.direction',label:'Observed direction'}]);
    expect(evidenceRequiredIssues({'evidence.direction':true},null,'','NEUTRAL')).toEqual([]);
    expect(evidenceRequiredIssues({'evidence.direction':true},null,'','BUY')).toEqual([]);
    expect(evidenceRequiredIssues({'evidence.direction':true},null,'','SELL')).toEqual([]);
    expect(evidenceRequiredIssues({},null,'','')).toEqual([]);
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
  it.each([Number.NaN,Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY])(
    'rejects a non-finite observation price %s, whether optional or Required',price=>{
      const issue=[{id:'evidence.price',label:'Observed price'}];
      expect(evidenceRequiredIssues({},price,'valid note')).toEqual(issue);
      expect(evidenceRequiredIssues({'evidence.price':true},price,'valid note')).toEqual(issue);
    });
  it('allows a truly omitted optional observation price, but never invents one',()=>{
    expect(evidenceRequiredIssues({},null,'note')).toEqual([]);
    expect(evidenceRequiredIssues({'evidence.price':true},null,'note'))
      .toEqual([{id:'evidence.price',label:'Observed price'}]);
  });
  it('supports independent required settings without forcing the other input', () => {
    expect(evidenceRequiredIssues({'evidence.note':true},null,'Observed')).toEqual([]);
    expect(evidenceRequiredIssues({'evidence.price':true},null,'')).toEqual([{id:'evidence.price',label:'Observed price'}]);
  });
});

describe('Evidence type registry integrity before an atomic Quick save',()=>{
  const registry=['absorption','delta','big-trade'];
  it('requires at least one actually observed type',()=>{
    expect(evidenceSelectionIssues([],registry)).toEqual([{id:'evidence.selection',label:'Observed evidence type'}]);
  });
  it('allows distinct known selected types and no arbitrary count threshold',()=>{
    expect(evidenceSelectionIssues(['delta'],registry)).toEqual([]);
    expect(evidenceSelectionIssues(['delta','absorption','big-trade'],registry)).toEqual([]);
  });
  it('blocks stale, missing and repeated types rather than recording invented evidence',()=>{
    const issue=[{id:'evidence.selection',label:'Select valid, distinct observed evidence types'}];
    expect(evidenceSelectionIssues(['deleted-type'],registry)).toEqual(issue);
    expect(evidenceSelectionIssues(['delta','deleted-type'],registry)).toEqual(issue);
    expect(evidenceSelectionIssues(['delta','delta'],registry)).toEqual(issue);
    expect(evidenceSelectionIssues([''],registry)).toEqual(issue);
    expect(evidenceSelectionIssues([' '],registry)).toEqual(issue);
  });
  it('cannot capture against an empty registry, even if an old selection is in memory',()=>{
    expect(evidenceSelectionIssues(['delta'],[])).toHaveLength(1);
  });
  it('does not modify selected IDs or the loaded registry',()=>{
    const selected=['absorption','delta'];
    expect(evidenceSelectionIssues(selected,registry)).toEqual([]);
    expect(selected).toEqual(['absorption','delta']);
    expect(registry).toEqual(['absorption','delta','big-trade']);
  });
});

describe('Evidence classification survives Quick and Detailed view switches',()=>{
  it('keeps all classification options available in Detailed',()=>{
    expect(showAdvancedEvidenceRole(false,'GENERAL_OBSERVATION','ENTRY_CONFIRMATION')).toBe(true);
    expect(showAdvancedEvidenceRole(false,'GENERAL_OBSERVATION','INVALIDATION')).toBe(true);
  });
  it('keeps Quick compact for ordinary observations',()=>{
    expect(showAdvancedEvidenceRole(true,'GENERAL_OBSERVATION','ENTRY_CONFIRMATION')).toBe(false);
    expect(showAdvancedEvidenceRole(true,'SETUP_SUPPORT','INVALIDATION')).toBe(false);
  });
  it('displays the actual previously selected advanced role in Quick',()=>{
    expect(showAdvancedEvidenceRole(true,'ENTRY_CONFIRMATION','ENTRY_CONFIRMATION')).toBe(true);
    expect(showAdvancedEvidenceRole(true,'ENTRY_CONFIRMATION','INVALIDATION')).toBe(false);
    expect(showAdvancedEvidenceRole(true,'INVALIDATION','INVALIDATION')).toBe(true);
    expect(showAdvancedEvidenceRole(true,'INVALIDATION','ENTRY_CONFIRMATION')).toBe(false);
  });
});
