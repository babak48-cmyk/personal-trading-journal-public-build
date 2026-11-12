import { describe,expect,it } from 'vitest';
import { planRevisionEvidenceIssues } from './planRevisionValidation';

describe('Plan Revision evidence summary required semantics',()=>{
  it('stays optional by default in both existing plan-revision paths',()=>{
    expect(planRevisionEvidenceIssues({},'')).toEqual([]);
  });
  it('requires an actual nonblank summary only when the trader enables Required',()=>{
    const enabled={'planRevision.evidence':true};
    expect(planRevisionEvidenceIssues(enabled,'  \n ')).toEqual([
      {id:'planRevision.evidence',label:'New evidence summary for plan revision'},
    ]);
    expect(planRevisionEvidenceIssues(enabled,'Rejection thesis invalidated after price accepted above zone')).toEqual([]);
  });
  it('does not make historical notes or unchanged optional entries required',()=>{
    expect(planRevisionEvidenceIssues({'planRevision.evidence':false},'')).toEqual([]);
  });
});
