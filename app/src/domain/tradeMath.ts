export type Side = 'LONG' | 'SHORT';
export type Fill = { price: number; quantity: number };

export function ticksBetween(a: number, b: number, tickSize: number): number {
  if (tickSize <= 0) throw new Error('tickSize must be > 0');
  return Math.abs(a - b) / tickSize;
}

export function initialRiskDollars(
  entryPrice: number,
  stopPrice: number,
  quantity: number,
  pointValue: number
): number {
  if (quantity <= 0) throw new Error('quantity must be > 0');
  if (pointValue <= 0) throw new Error('pointValue must be > 0');
  return Math.abs(entryPrice - stopPrice) * pointValue * quantity;
}

export function weightedAverage(fills: Fill[]): number | null {
  const qty = fills.reduce((sum, fill) => sum + fill.quantity, 0);
  if (qty <= 0) return null;
  return fills.reduce((sum, fill) => sum + fill.price * fill.quantity, 0) / qty;
}

export function grossPnl(
  side: Side,
  entryFills: Fill[],
  exitFills: Fill[],
  pointValue: number
): number | null {
  const entryQty = entryFills.reduce((sum, f) => sum + f.quantity, 0);
  const exitQty = exitFills.reduce((sum, f) => sum + f.quantity, 0);
  if (entryQty <= 0 || exitQty <= 0 || exitQty > entryQty) return null;
  const entry = weightedAverage(entryFills);
  if (entry === null) return null;
  const direction = side === 'LONG' ? 1 : -1;
  return exitFills.reduce(
    (sum, fill) => sum + (fill.price - entry) * direction * fill.quantity * pointValue,
    0
  );
}

export function realizedR(netPnl: number, initialRisk: number): number | null {
  if (initialRisk <= 0) return null;
  return netPnl / initialRisk;
}

export function isTickAligned(price: number, tickSize: number, tolerance = 1e-8): boolean {
  if (tickSize <= 0) return false;
  const units = price / tickSize;
  return Math.abs(units - Math.round(units)) <= tolerance;
}
