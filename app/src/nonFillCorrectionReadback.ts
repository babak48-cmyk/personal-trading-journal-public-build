import type {TradeDetail, InitialRiskCorrectionRequest, InitialRiskCorrectionEvent, HistoricalSourceReadout, SourceTypeCorrectionRequest, SourceTypeCorrectionEvent, SourcePriceCorrectionRequest, SourcePriceCorrectionEvent} from './services/localApi';

type AuditIdentity={correction_id:string;revision:number;reason:string;recorded_at_utc:string;actor:string;expected_prior_correction_id:string|null};
/** Require a unique independently read audit event, exact receipt and intended revision. */
function matchesEvent<T extends AuditIdentity>(receipt:T,audit:readonly T[],revision:number,reason:string,fields:readonly (keyof T)[]):boolean {
  if(!receipt.correction_id||!receipt.recorded_at_utc||!Number.isSafeInteger(revision)||revision<1||receipt.revision!==revision||receipt.reason!==reason)return false;
  const matches=audit.filter(e=>e.correction_id===receipt.correction_id);
  return matches.length===1&&(['correction_id','revision','reason','recorded_at_utc','actor','expected_prior_correction_id',...fields] as (keyof T)[]).every(k=>matches[0][k]===receipt[k]);
}
export function verifiedRiskCorrectionReadback(tradeId:string,input:InitialRiskCorrectionRequest,receipt:InitialRiskCorrectionEvent,audit:readonly InitialRiskCorrectionEvent[],fresh:TradeDetail):boolean {
  const snapshots=fresh.risk_snapshots.filter(x=>x.risk_snapshot_id===input.risk_snapshot_id&&x.snapshot_type==='INITIAL');
  return fresh.metrics.trade_id===tradeId&&fresh.metrics.initial_risk_dollars===input.replacement&&snapshots.length===1&&snapshots[0].risk_dollars===input.replacement&&receipt.risk_snapshot_id===input.risk_snapshot_id&&receipt.previous_risk_dollars===input.expected_effective&&receipt.replacement_risk_dollars===input.replacement&&matchesEvent(receipt,audit,input.expected_revision+1,input.reason,['risk_snapshot_id','original_risk_dollars','previous_risk_dollars','replacement_risk_dollars']);
}
export function verifiedSourceTypeReadback(input:SourceTypeCorrectionRequest,receipt:SourceTypeCorrectionEvent,audit:readonly SourceTypeCorrectionEvent[],sources:readonly HistoricalSourceReadout[]):boolean {
  const rows=sources.filter(x=>x.candidate_source_id===input.candidate_source_id);
  return rows.length===1&&rows[0].effective_source_type_id===input.replacement_type_id&&rows[0].revision===input.expected_revision+1&&receipt.candidate_source_id===input.candidate_source_id&&receipt.previous_source_type_id===input.expected_effective_type_id&&receipt.replacement_source_type_id===input.replacement_type_id&&matchesEvent(receipt,audit,input.expected_revision+1,input.reason,['candidate_source_id','original_source_type_id','previous_source_type_id','replacement_source_type_id']);
}
export function verifiedSourcePriceReadback(input:SourcePriceCorrectionRequest,receipt:SourcePriceCorrectionEvent,audit:readonly SourcePriceCorrectionEvent[],sources:readonly HistoricalSourceReadout[]):boolean {
  const rows=sources.filter(x=>x.candidate_source_id===input.candidate_source_id);
  return rows.length===1&&rows[0].effective_source_price===input.replacement_price&&rows[0].price_correction_revision===input.expected_revision+1&&receipt.candidate_source_id===input.candidate_source_id&&receipt.previous_source_price===input.expected_effective_price&&receipt.replacement_source_price===input.replacement_price&&matchesEvent(receipt,audit,input.expected_revision+1,input.reason,['candidate_source_id','original_source_price','previous_source_price','replacement_source_price']);
}
