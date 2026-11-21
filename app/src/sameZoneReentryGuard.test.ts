import {describe,expect,it} from 'vitest';
import {sameZoneReentryIssue} from './sameZoneReentryGuard';

const base={sessionId:'A',sessionStatus:'ACTIVE',tradeSessionId:'A',
 tradeStatus:'CLOSED',tradeZoneId:'zone-1',zoneId:'zone-1',zoneStatus:'WATCHING'};

describe('independent same-Zone re-entry preflight',()=>{
  it('permits a fresh Decision for a CLOSED trade in a live Zone of same active Session',()=>{
    for(const zoneStatus of ['PLANNED','WATCHING','REACHED','VALID'])
      expect(sameZoneReentryIssue({...base,zoneStatus})).toBeNull();
  });
  it('never opens another attempt in a CLOSED or draft session',()=>{
    for(const sessionStatus of ['CLOSED','DRAFT','ARCHIVED',null])
      expect(sameZoneReentryIssue({...base,sessionStatus})).not.toBeNull();
  });
  it('prevents an attempt from an OPEN Trade or another Session',()=>{
    expect(sameZoneReentryIssue({...base,tradeStatus:'OPEN'})).not.toBeNull();
    expect(sameZoneReentryIssue({...base,tradeSessionId:'B'})).not.toBeNull();
    expect(sameZoneReentryIssue({...base,sessionId:null})).not.toBeNull();
  });
  it('never revives cancelled/invalidated or missing old Zone from history',()=>{
    for(const zoneStatus of ['CANCELLED','INVALIDATED','RETIRED',null])
      expect(sameZoneReentryIssue({...base,zoneStatus})).not.toBeNull();
    expect(sameZoneReentryIssue({...base,zoneId:null})).not.toBeNull();
    expect(sameZoneReentryIssue({...base,zoneId:'zone-2'})).not.toBeNull();
    expect(sameZoneReentryIssue({...base,tradeZoneId:null})).not.toBeNull();
  });
});
