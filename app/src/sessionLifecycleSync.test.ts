import {describe,expect,it} from 'vitest';
import {reconcileActiveSession} from './sessionLifecycleSync';
import {quickValidationRoute} from './quickValidationRoute';
import {customFieldFocusId} from './customFieldStage';

type Session={session_id:string;status:'DRAFT'|'ACTIVE'|'CLOSED';instrument_symbol:string};
const draft:Session={session_id:'session-A',status:'DRAFT',instrument_symbol:'ES'};
const confirmed:Session={...draft,status:'ACTIVE'};
const other:Session={session_id:'session-B',status:'ACTIVE',instrument_symbol:'GC'};

describe('Canonical Session lifecycle after immutable Plan confirmation',()=>{
  it('uses persisted Session status, never a guessed status from a Plan object',()=>{
    const result=reconcileActiveSession(draft,[other,confirmed],'session-A');
    expect(result).toEqual(confirmed);
    expect(result?.status).toBe('ACTIVE');
    expect(draft.status).toBe('DRAFT');
  });
  it('does not let an in-flight earlier Session refresh overwrite a newer active Session',()=>{
    expect(reconcileActiveSession(other,[confirmed,other],'session-A')).toBe(other);
  });
  it('preserves active state when its canonical row is missing instead of fabricating ACTIVE',()=>{
    expect(reconcileActiveSession(draft,[other],'session-A')).toBe(draft);
    expect(reconcileActiveSession(null,[confirmed],'session-A')).toBeNull();
  });
  it('accepts subsequent canonical CLOSED lifecycle without resurrecting DRAFT',()=>{
    const closed={...confirmed,status:'CLOSED' as const};
    expect(reconcileActiveSession(confirmed,[closed],'session-A')).toEqual(closed);
  });
  it('moves required-field focus from Draft steps into confirmed Quick Plan',()=>{
    const draftRoute=quickValidationRoute('plan.mainScenario',draft.status==='DRAFT',false);
    expect(draftRoute).toMatchObject({notebookPage:null,draftStep:1,draftPlanPage:1});
    const nowConfirmed=reconcileActiveSession(draft,[confirmed],'session-A')!;
    expect(quickValidationRoute('plan.mainScenario',nowConfirmed.status==='DRAFT',true).notebookPage).toBe('PLAN');
    const custom=customFieldFocusId('session','session-A','readiness');
    expect(quickValidationRoute(custom,nowConfirmed.status==='DRAFT',true).notebookPage).toBe('PLAN');
  });
  it('does not rewrite another instrument or identity by matching on row position',()=>{
    expect(reconcileActiveSession(draft,[other,confirmed],'session-A')?.instrument_symbol).toBe('ES');
    expect(reconcileActiveSession(other,[confirmed,other],'session-B')).toBe(other);
  });
});
