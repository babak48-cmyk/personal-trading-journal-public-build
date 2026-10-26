import { describe, expect, it } from 'vitest';
import { grossPnl, initialRiskDollars, isTickAligned, realizedR, ticksBetween } from './tradeMath';

describe('ES calculations', () => {
  it('calculates 12 ticks and $150 risk for a 1-lot 3-point ES stop', () => {
    expect(ticksBetween(6025.25, 6022.25, 0.25)).toBe(12);
    expect(initialRiskDollars(6025.25, 6022.25, 1, 50)).toBe(150);
  });

  it('calculates short risk symmetrically', () => {
    expect(initialRiskDollars(6025.25, 6028.25, 2, 50)).toBe(300);
  });

  it('calculates P&L across partial exits', () => {
    const pnl = grossPnl('LONG', [{ price: 6025, quantity: 3 }], [
      { price: 6027, quantity: 1 },
      { price: 6028, quantity: 1 },
      { price: 6024, quantity: 1 }
    ], 50);
    expect(pnl).toBe(200);
  });

  it('uses net P&L for canonical realized R', () => {
    expect(realizedR(335, 450)).toBeCloseTo(0.7444444444, 8);
  });

  it('validates ES tick alignment', () => {
    expect(isTickAligned(6025.25, 0.25)).toBe(true);
    expect(isTickAligned(6025.13, 0.25)).toBe(false);
  });
});
