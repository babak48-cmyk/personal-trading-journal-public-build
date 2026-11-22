import {describe,it,expect} from 'vitest';
import {decisionTimestampDisplay} from './decisionTimestamp';

describe('saved decision timestamp display, never an event correction',()=>{
  it('converts the same instant to explicit UTC and local time without changing raw',()=>{
    const raw='2026-11-22T09:47:59+00:00';
    const t=decisionTimestampDisplay(raw,'en-GB','Australia/Sydney');
    expect(t.raw).toBe(raw);
    expect(t.utc).toBe('2026-11-22T09:47:59.000Z');
    expect(t.local).toContain('20:47:59');
    expect(t.valid).toBe(true);
  });
  it('does not assume a time zone for ambiguous or invalid legacy events',()=>{
    for(const s of ['2026-11-22T09:47:59','2026-11-22 09:47:59','not-a-time']){
      expect(decisionTimestampDisplay(s)).toMatchObject({raw:s,valid:false,local:'Unavailable'});
    }
  });
  it('preserves the documented three-hour difference between two UTC events',()=>{
    const a=decisionTimestampDisplay('2026-11-22T09:47:59Z');
    const b=decisionTimestampDisplay('2026-11-22T06:48:28Z');
    expect(a.valid&&b.valid).toBe(true);
    expect(Date.parse(a.utc)-Date.parse(b.utc)).toBe(10771000);
    // A display conversion cannot repair or explain this clock delta.
  });
});
