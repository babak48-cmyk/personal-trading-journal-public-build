import type {
  CorrectionHistoryEvent, FillCorrectionInput, FillCorrectionReceipt, FillCorrectionPreview, TradeDetail,
} from './services/localApi';

/** A successful IPC return is NOT proof of the durable effective Fill value.
 * Require exact receipt, immutable audit-event, and fresh Trade readback identity.
 * An invalid result leaves the UI locked pending a manual history re-read.
 */
export function verifiedFillCorrectionReadback(
  tradeId:string,
  input:FillCorrectionInput,
  receipt:FillCorrectionReceipt,
  audit:readonly CorrectionHistoryEvent[],
  fresh:TradeDetail,
  expectedPriorRevision?:number,
):boolean {
  if(!tradeId || !receipt.correction_id || fresh.metrics.trade_id!==tradeId ||
     receipt.execution_id!==input.execution_id || receipt.field!==input.field ||
     receipt.previous!==input.expected_effective ||
     receipt.replacement!==input.replacement ||
     !Number.isSafeInteger(receipt.revision) || receipt.revision<=0 ||
     (expectedPriorRevision!==undefined&&receipt.revision!==expectedPriorRevision+1))return false;

  const events=audit.filter(event=>event.correction_id===receipt.correction_id);
  if(events.length!==1)return false;
  const event=events[0];
  if(event.execution_id!==input.execution_id || event.field!==input.field ||
     event.previous!==input.expected_effective ||
     event.replacement!==input.replacement ||
     event.revision!==receipt.revision ||
     event.reason!==input.reason ||
     event.recorded_at_utc!==receipt.recorded_at_utc)return false;

  const fill=fresh.fills.find(row=>row.execution_id===input.execution_id);
  if(!fill)return false;
  return (fill[input.field]??null)===input.replacement;
}

/** The preview is an explicit confirmation of this exact replacement, not a generic permission to edit. */
export function verifiedFillCorrectionPreview(tradeId:string,input:FillCorrectionInput,preview:FillCorrectionPreview):boolean {
  return preview.trade_id===tradeId&&preview.execution_id===input.execution_id&&preview.field===input.field&&
    preview.current_effective===input.expected_effective&&preview.proposed_effective===input.replacement&&
    preview.reason===input.reason&&preview.explicit_confirmation_required===true&&
    Number.isSafeInteger(preview.expected_revision)&&preview.expected_revision>=0;
}
