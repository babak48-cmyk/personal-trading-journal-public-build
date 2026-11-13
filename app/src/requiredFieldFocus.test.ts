import {describe,expect,it} from 'vitest';
import {openRequiredFieldDisclosures,type DisclosureNode} from './requiredFieldFocus';
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
