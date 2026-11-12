import {describe,it,expect} from 'vitest';
import {analyticsInstrumentOptions} from './analyticsInstrumentOptions';
describe('Analytics instrument filter stability',()=>{
  it('does not hide GC after current results are filtered to ES',()=>{
    expect(analyticsInstrumentOptions(['ES','GC'],['ES'],[],'ES')).toEqual(['ES','GC']);
  });
  it('preserves historical retired instrument and selected snapshot',()=>{
    expect(analyticsInstrumentOptions(['ES'],[],['GC'],'NQ')).toEqual(['ES','GC','NQ']);
  });
  it('deduplicates and ignores empty labels without mutating source',()=>{
    const sources=[' ES ','GC','ES',' '];const before=[...sources];
    expect(analyticsInstrumentOptions(sources,[],[],'')).toEqual(['ES','GC']);
    expect(sources).toEqual(before);
  });
});
