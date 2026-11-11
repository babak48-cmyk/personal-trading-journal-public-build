import { describe,expect,it } from 'vitest';
import { tradePositionDisclosure } from './tradeMetricsDisclosure';

describe('Net P&L disclosure for partial positions',()=>{
  it('explicitly distinguishes total incurred fill costs from allocated closed-position costs',()=>{
    const d=tradePositionDisclosure(1,1);
    expect(d.label).toContain('all costs incurred');
    expect(d.explanation).toContain('NOT prorated');
    expect(d.explanation).toContain('entry costs');
    expect(d.explanation).toContain('original trade risk');
  });
  it('keeps ordinary realized wording for fully closed trades',()=>{
    const d=tradePositionDisclosure(0,2);
    expect(d.label).toBe('Net realized P&L (verified costs)');
    expect(d.explanation).toBeNull();
  });
  it('does not imply a realized result before any exit',()=>{
    expect(tradePositionDisclosure(2,0).explanation).toBeNull();
  });
});
