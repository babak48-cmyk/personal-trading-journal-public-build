import {describe,expect,it} from 'vitest';
import {customFieldFocusId} from './customFieldStage';
import {openRequiredFieldDisclosures,type DisclosureNode} from './requiredFieldFocus';

describe('Owner-scoped Required custom field navigation safety',()=>{
  it('distinguishes same custom field across two Trades and Review stage',()=>{
    const field='custom-uuid-field';
    const a=customFieldFocusId('trade','trade-A',field);
    const b=customFieldFocusId('trade','trade-B',field);
    const review=customFieldFocusId('post-trade-review','trade-A',field);
    expect(new Set([a,b,review]).size).toBe(3);
    expect(review).toContain('post-trade-review-trade-A');
    expect(a).toContain('trade-trade-A');
  });
  it('opens nested owner disclosure without touching unrelated trade panels',()=>{
    const tradeB:DisclosureNode={tagName:'DETAILS',parentElement:null,open:false};
    const tradeA:DisclosureNode={tagName:'DETAILS',parentElement:null,open:false};
    const stageA:DisclosureNode={tagName:'DETAILS',parentElement:tradeA,open:false};
    const fieldA:DisclosureNode={tagName:'DIV',parentElement:stageA};
    expect(openRequiredFieldDisclosures(fieldA)).toBe(2);
    expect(stageA.open).toBe(true);
    expect(tradeA.open).toBe(true);
    expect(tradeB.open).toBe(false);
  });
});
