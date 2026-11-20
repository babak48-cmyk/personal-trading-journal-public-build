import {describe,expect,it} from 'vitest';
import {reconcileActiveSession,isCurrentSessionLoad} from './sessionLifecycleSync';
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

describe('Late async Session selection reads never overwrite another owner',()=>{
  it('discards a late Draft A read after confirming the user opened Session B',async()=>{
    let generation=1;
    let resolveDraft!: (value:string)=>void;
    const deferredDraft=new Promise<string>(resolve=>{resolveDraft=resolve;});
    const selectedFields:string[]=[];
    const resumeDraft=async()=>{
      const requested=generation;
      const value=await deferredDraft;
      if(isCurrentSessionLoad(requested,generation))selectedFields.push(value);
    };
    const work=resumeDraft();
    generation++; // the user selected another Session before the read returned
    selectedFields.push('session-B');
    resolveDraft('session-A');
    await work;
    expect(selectedFields).toEqual(['session-B']);
  });
  it('rejects stale confirmed Plan, Timeline and Decision history responses',()=>{
    expect(isCurrentSessionLoad(4,5)).toBe(false);
    expect(isCurrentSessionLoad(4,4)).toBe(true);
    expect(isCurrentSessionLoad(5,4)).toBe(false);
    expect(isCurrentSessionLoad(0,0)).toBe(false);
    expect(isCurrentSessionLoad(-1,-1)).toBe(false);
  });
  it('invalidates delayed previous-Session restoration when New session starts',async()=>{
    let generation=8;
    let finish!: (value:string)=>void;
    const delayed=new Promise<string>(resolve=>{finish=resolve;});
    let shown='new draft';
    const restore=async()=>{
      const requested=generation;
      const value=await delayed;
      if(isCurrentSessionLoad(requested,generation))shown=value;
    };
    const work=restore();
    generation++; // starts another Session
    finish('old session plan');
    await work;
    expect(shown).toBe('new draft');
  });
});

describe('Late Draft save acknowledgements cannot alter the next Session',()=>{
  it('does not advance a different Session when the previous Draft save succeeds late',async()=>{
    let generation=11;
    let resolveSave!:()=>void;
    const write=new Promise<void>(done=>{resolveSave=done;});
    let draftStep=1;
    let draftDirty=true;
    const pending=async()=>{
      const ownerGeneration=generation;
      await write;
      if(!isCurrentSessionLoad(ownerGeneration,generation))return;
      draftStep=2;
      draftDirty=false;
    };
    const inFlight=pending();
    generation++;
    resolveSave();
    await inFlight;
    expect({draftStep,draftDirty}).toEqual({draftStep:1,draftDirty:true});
  });
  it('does not switch the active owner when old Session setup save resolves after a change',async()=>{
    let generation=21;
    let resolveSave!:(id:string)=>void;
    const write=new Promise<string>(done=>{resolveSave=done;});
    let selectedOwner='session-B';
    const saveSetup=async()=>{
      const ownerGeneration=generation;
      const savedOwner=await write;
      if(isCurrentSessionLoad(ownerGeneration,generation))selectedOwner=savedOwner;
    };
    const inFlight=saveSetup();
    generation++;
    resolveSave('session-A');
    await inFlight;
    expect(selectedOwner).toBe('session-B');
  });
});
