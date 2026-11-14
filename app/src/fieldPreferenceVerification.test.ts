import {describe,expect,it} from 'vitest';
import {matchesPersistedPreferences} from './fieldPreferenceVerification';

describe('Field Manager persisted preference verification',()=>{
  it('requires an independent persisted value for every changed visibility control',()=>{
    expect(matchesPersistedPreferences('VISIBILITY',{'evidence.note':false,'review.note':true},
      {'review.note':true,'evidence.note':false})).toBe(true);
    expect(matchesPersistedPreferences('VISIBILITY',{'evidence.note':false},{'evidence.note':true})).toBe(false);
  });
  it('verifies Quick/Detailed placement and field order without depending on map insertion order',()=>{
    expect(matchesPersistedPreferences('PLACEMENT',{'a':'DETAILED_ONLY'},{'a':'QUICK_AND_DETAILED'})).toBe(false);
    expect(matchesPersistedPreferences('ORDER',{a:1,b:0},{b:0,a:1})).toBe(true);
    expect(matchesPersistedPreferences('ORDER',{a:1},{a:2})).toBe(false);
  });
  it('allows only equivalent absent/false optional overrides, never a missing Required flag',()=>{
    expect(matchesPersistedPreferences('REQUIREMENTS',{}, {'review.note':false})).toBe(true);
    expect(matchesPersistedPreferences('REQUIREMENTS',{'review.note':true},{'review.note':false})).toBe(false);
    expect(matchesPersistedPreferences('REQUIREMENTS',{}, {'review.note':true})).toBe(false);
  });
  it('compares editable field text semantically and rejects unconfirmed changes',()=>{
    expect(matchesPersistedPreferences('TEXT',{'plan.mainScenario':{label:'Main',help:''}},
      {'plan.mainScenario':{help:'',label:'Main'}})).toBe(true);
    expect(matchesPersistedPreferences('TEXT',{'plan.mainScenario':{label:'Main'}},
      {'plan.mainScenario':{label:'Old'}})).toBe(false);
  });
});