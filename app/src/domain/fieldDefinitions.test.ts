import { describe, expect, it } from 'vitest';
import { FIELD_DEFINITIONS, isUserRequired, requirementLabel } from '../fieldDefinitions';

describe('field requirement registry',()=>{
  it('keeps system required fields locked',()=>{
    const date=FIELD_DEFINITIONS.find(x=>x.id==='session.date');
    expect(date?.systemLocked).toBe(true);
    expect(requirementLabel('session.date',{})).toBe('Required');
    expect(isUserRequired('session.date',{'session.date':true})).toBe(false);
  });

  it('promotes optional fields through user overrides',()=>{
    expect(requirementLabel('plan.mainScenario',{})).toBe('Optional');
    expect(requirementLabel('plan.mainScenario',{'plan.mainScenario':true})).toBe('Required by you');
    expect(isUserRequired('plan.mainScenario',{'plan.mainScenario':true})).toBe(true);
  });

  it('preserves conditional requirement semantics',()=>{
    expect(requirementLabel('decision.reason',{})).toBe('Conditional');
    expect(requirementLabel('psychology.state',{})).toBe('Conditional');
  });
});


describe('contextual help registry',()=>{
  it('provides short help and an example for every registered field',()=>{
    for(const def of FIELD_DEFINITIONS){
      expect(def.helpShort.trim().length).toBeGreaterThan(0);
      expect(def.helpExample.trim().length).toBeGreaterThan(0);
    }
  });

  it('explains countertrend explicitly',()=>{
    const trend=FIELD_DEFINITIONS.find(x=>x.id==='candidate.trendRelationship');
    expect(trend?.optionHelp?.COUNTERTREND).toMatch(/against the prevailing trend/i);
  });

  it('keeps decision quality independent from P&L',()=>{
    const dq=FIELD_DEFINITIONS.find(x=>x.id==='decision.quality');
    expect(dq?.helpShort).toMatch(/independent/i);
    expect(dq?.helpLong).toMatch(/P&L/i);
  });

  it('contains a concrete Need to see example',()=>{
    const need=FIELD_DEFINITIONS.find(x=>x.id==='candidate.requiredConditions');
    expect(need?.helpExample).toMatch(/absorption/i);
    expect(need?.helpExample).toMatch(/delta/i);
  });
});
