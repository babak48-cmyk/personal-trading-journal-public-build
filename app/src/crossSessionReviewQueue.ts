import type { CrossSessionPendingReview } from './services/localApi';

/** A display-only filter. Server owns actual CLOSED + non-COMPLETED eligibility. */
export function filterCrossSessionPendingReviews(
  rows:readonly CrossSessionPendingReview[], search:string, max=12,
):CrossSessionPendingReview[] {
  const term=search.toLocaleLowerCase().trim();
  if(!Number.isInteger(max)||max<1)return [];
  return rows.filter(row=>!term||[
    row.session.session_date,row.session.instrument_symbol,row.session.environment,row.direction,row.trade_id,
  ].some(value=>value.toLocaleLowerCase().includes(term))).slice(0,max);
}
