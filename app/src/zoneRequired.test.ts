import { describe, expect, it } from 'vitest';
import { zoneRequiredIssues, zoneRangeOrderIssue } from './zoneRequired';
import type { CandidateDraftInput } from './services/localApi';
import { fieldConnectionReport, isFieldPresented } from './fieldInventory';

const draft=():CandidateDraftInput=>({
  label:'', directional_intent:'LONG', trend_relationship:'UNCLEAR',
  price_mode:'RANGE', price_from:7400, price_to:7402, identified_when:'PRE_SESSION',
  required_conditions:[], invalidation_conditions:[], sources:[],
});

describe('Shared initial/live Zone required-field gate',()=>{
  it('allows incomplete optional draft fields when no user requirement is configured',()=>{
    expect(zoneRequiredIssues(draft(),'candidate-0',{})).toEqual([]);
  });
  it('identifies all configured required fields with lifecycle-specific focus ids',()=>{
    const required={'candidate.label':true,'candidate.sources':true,
      'candidate.requiredConditions':true,'candidate.invalidationConditions':true};
    const issues=zoneRequiredIssues(draft(),'liveCandidate',required);
    expect(issues.map(x=>x.id)).toEqual([
      'liveCandidate.label','liveCandidate.sources',
      'liveCandidate.requiredConditions','liveCandidate.invalidationConditions'
    ]);
    expect(zoneRequiredIssues(draft(),'candidate-2',required).every(x=>x.id.startsWith('candidate-2.'))).toBe(true);
  });
  it('retains valid planning values and never demands observed evidence',()=>{
    const candidate={...draft(),label:'Value high',trend_relationship:'COUNTERTREND' as const,
      required_conditions:['Reclaim'],invalidation_conditions:['Break of level'],
      sources:[{source_type_id:'validated-source'}]};
    expect(zoneRequiredIssues(candidate,'liveCandidate',{'candidate.label':true,
      'candidate.sources':true,
      'candidate.requiredConditions':true,'candidate.invalidationConditions':true})).toEqual([]);
  });
  it('reports missing price geometry without invalidating an unspecified draft price',()=>{
    expect(zoneRequiredIssues({...draft(),price_from:null,price_to:null},'candidate-0',{}).map(x=>x.id))
      .toEqual(['candidate-0.priceFrom','candidate-0.priceTo']);
    expect(zoneRequiredIssues({...draft(),price_mode:'SINGLE',reference_price:null},'liveCandidate',{}).map(x=>x.id))
      .toEqual(['liveCandidate.price']);
    expect(zoneRequiredIssues({...draft(),price_mode:'UNSPECIFIED'},'liveCandidate',{})).toEqual([]);
  });
  it('allows valid zero-valued prices as numeric data',()=>{
    expect(zoneRequiredIssues({...draft(),price_from:0,price_to:1},'liveCandidate',{})).toEqual([]);
  });
});

describe('System-locked trend/psychology semantics',()=>{
  it('protects trend classification and conditional psychology from user visibility overrides',()=>{
    for(const id of ['candidate.trendRelationship','psychology.state','psychology.stage']){
      expect(fieldConnectionReport().find(x=>x.id===id)?.status).toBe('PROTECTED');
      expect(isFieldPresented(id,true,{[id]:false},{[id]:'DETAILED_ONLY'},{})).toBe(true);
    }
  });
  it('does not elevate an unsupported trend requirement override',()=>{
    expect(zoneRequiredIssues(draft(),'liveCandidate',{'candidate.trendRelationship':true})).toEqual([]);
  });
});


describe('Shared price range order validation',()=>{
  it('prevents an inverted range in live and initial Zones',()=>{
    const invalid={...draft(),price_from:7402,price_to:7400};
    expect(zoneRangeOrderIssue(invalid)).toContain('7402');
    expect(zoneRangeOrderIssue(invalid)).toContain('7400');
  });
  it('accepts valid and equal boundaries and defers missing geometry to required-field checks',()=>{
    expect(zoneRangeOrderIssue(draft())).toBeNull();
    expect(zoneRangeOrderIssue({...draft(),price_from:7400,price_to:7400})).toBeNull();
    expect(zoneRangeOrderIssue({...draft(),price_from:null,price_to:7400})).toBeNull();
    expect(zoneRangeOrderIssue({...draft(),price_mode:'UNSPECIFIED'})).toBeNull();
  });
});
