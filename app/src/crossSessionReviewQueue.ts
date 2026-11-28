import type { CrossSessionPendingReview } from './services/localApi';

/** A display-only filter. Server owns actual CLOSED + non-COMPLETED eligibility. */
export function filterCrossSessionPendingReviews(
  rows:readonly CrossSessionPendingReview[], search:string, max=12,
):CrossSessionPendingReview[] {
  const term=search.toLocaleLowerCase().trim();
  if(!Number.isInteger(max)||max<1)return [];
  // A complete known instrument symbol is an explicit instrument filter.
  // Otherwise search all readable identity fields, including notes and Zones.
  const exactInstrument=rows.some(row=>row.session.instrument_symbol.toLocaleLowerCase()===term);
  if(exactInstrument)return rows.filter(row=>row.session.instrument_symbol.toLocaleLowerCase()===term).slice(0,max);
  return rows.filter(row=>!term||[
    row.session.session_date,row.session.instrument_symbol,row.session.environment,row.direction,row.trade_id,
    row.identity?.decision_id,row.identity?.zone_label,row.identity?.decision_note,row.identity?.decision_occurred_at,
  ].some(value=>value?.toLocaleLowerCase().includes(term))).slice(0,max);
}
