import {describe,expect,it} from 'vitest';
import {openRequiredFieldDisclosures,isCurrentRequiredFocus,type RequiredFocusContext,type DisclosureNode} from './requiredFieldFocus';
describe('Required/Conditional Quick focus across nested accordions',()=>{
  it('opens every enclosing details group, not just closest',()=>{
    const root:DisclosureNode={tagName:'DIV',parentElement:null};
    const outer:DisclosureNode={tagName:'DETAILS',parentElement:root,open:false};
    const middle:DisclosureNode={tagName:'DIV',parentElement:outer};
    const inner:DisclosureNode={tagName:'DETAILS',parentElement:middle,open:false};
    const label:DisclosureNode={tagName:'LABEL',parentElement:inner};
    expect(openRequiredFieldDisclosures(label)).toBe(2);
    expect(outer.open).toBe(true);
    expect(inner.open).toBe(true);
    expect(openRequiredFieldDisclosures(label)).toBe(0);
  });
  it('preserves already open groups and unrelated siblings',()=>{
    const outer:DisclosureNode={tagName:'DETAILS',parentElement:null,open:true};
    const unrelated:DisclosureNode={tagName:'DETAILS',parentElement:null,open:false};
    const nested:DisclosureNode={tagName:'DETAILS',parentElement:outer,open:false};
    const target:DisclosureNode={tagName:'SELECT',parentElement:nested};
    expect(openRequiredFieldDisclosures(target)).toBe(1);
    expect(outer.open).toBe(true);
    expect(unrelated.open).toBe(false);
    expect(nested.open).toBe(true);
  });
  it('leaves non-disclosure controls alone and does not create values',()=>{
    const root:DisclosureNode={tagName:'FORM',parentElement:null};
    const target:DisclosureNode={tagName:'INPUT',parentElement:root};
    expect(openRequiredFieldDisclosures(target)).toBe(0);
  });
});

describe('Required focus retry ownership',()=>{
 const destination:RequiredFocusContext={sessionId:'s1',generation:4,page:'PLAN',draftStep:2,draftPlanPage:0,draftZonePage:1,zoneId:'z1',quickMode:true,evidenceId:null,decisionId:null,tradeId:'t1',sessionReviewId:'r1',reviewGeneration:7};
 it('allows the current request at its intended destination',()=>{
  expect(isCurrentRequiredFocus(5,5,destination,{...destination})).toBe(true);
 });
 it('cancels a superseded request even at the same destination',()=>{
  expect(isCurrentRequiredFocus(5,6,destination,destination)).toBe(false);
 });
 it.each([
  {sessionId:'s2'},{generation:5},{page:'REVIEW'},{draftStep:1},
  {draftPlanPage:1},{draftZonePage:0},{zoneId:'z2'},{quickMode:false},
  {evidenceId:'e2'},{decisionId:'d2'},
  {tradeId:'t2'},{sessionReviewId:'r2'},{reviewGeneration:8},
 ])('cancels a retry after destination ownership changes: %j',(change)=>{
  expect(isCurrentRequiredFocus(5,5,destination,{...destination,...change})).toBe(false);
 });
});
