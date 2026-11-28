import {describe,expect,it} from 'vitest';
import {verifiedFillCorrectionReadback,verifiedFillCorrectionPreview} from './fillCorrectionReadback';
import type {
  CorrectionHistoryEvent, FillCorrectionInput, FillCorrectionReceipt, TradeDetail,
} from './services/localApi';

const input:FillCorrectionInput={
  execution_id:'fill-1',field:'fees',expected_effective:2,replacement:3,reason:'Correct fee entry',
};
const receipt:FillCorrectionReceipt={
  correction_id:'c1',execution_id:'fill-1',field:'fees',revision:1,
  previous:2,replacement:3,recorded_at_utc:'2026-11-23T11:01:00Z',
};
const event:CorrectionHistoryEvent={
  ...receipt,reason:input.reason,actor:'USER',expected_prior_correction_id:null,
};
const fresh={metrics:{trade_id:'trade-1'},fills:[{
  execution_id:'fill-1',action:'EXIT',side:'SELL',price:6900,quantity:1,
  commission:1,fees:3,
}]} as TradeDetail;
const valid=()=>verifiedFillCorrectionReadback('trade-1',input,receipt,[event],fresh);

describe('Fill correction must be independently read back',()=>{
  it('accepts only matching receipt, unique event and effective persisted value',()=>{
    expect(valid()).toBe(true);
    expect(verifiedFillCorrectionReadback('other',input,receipt,[event],fresh)).toBe(false);
    expect(verifiedFillCorrectionReadback('trade-1',input,receipt,[],fresh)).toBe(false);
    expect(verifiedFillCorrectionReadback('trade-1',input,receipt,[event,event],fresh)).toBe(false);
    expect(verifiedFillCorrectionReadback('trade-1',input,{...receipt,execution_id:'wrong'},[event],fresh)).toBe(false);
    expect(verifiedFillCorrectionReadback('trade-1',input,receipt,[{...event,field:'price'}],fresh)).toBe(false);
    expect(verifiedFillCorrectionReadback('trade-1',input,receipt,[{...event,revision:2}],fresh)).toBe(false);
    expect(verifiedFillCorrectionReadback('trade-1',input,receipt,[{...event,reason:'Other'}],fresh)).toBe(false);
    expect(verifiedFillCorrectionReadback('trade-1',input,receipt,[event],{
      ...fresh,fills:[{...fresh.fills[0],fees:2}],
    })).toBe(false);
    expect(verifiedFillCorrectionReadback('trade-1',input,receipt,[event],{
      ...fresh,fills:[],
    })).toBe(false);
  });
  it('preserves UNKNOWN as null and works for price, quantity and commissions',()=>{
    const unknownInput:FillCorrectionInput={...input,field:'commission',expected_effective:2,replacement:null};
    const unknownReceipt:FillCorrectionReceipt={...receipt,field:'commission',replacement:null};
    const unknownEvent:CorrectionHistoryEvent={...event,field:'commission',replacement:null};
    const unknownFresh={...fresh,fills:[{...fresh.fills[0],commission:null}]};
    expect(verifiedFillCorrectionReadback('trade-1',unknownInput,unknownReceipt,[unknownEvent],unknownFresh)).toBe(true);
    for(const field of ['price','quantity'] as const){
      const replacement=field==='price'?6910:2;
      const previous=field==='price'?6900:1;
      const request={...input,field,expected_effective:previous,replacement};
      const result={...receipt,field,previous,replacement};
      const history={...event,field,previous,replacement};
      expect(verifiedFillCorrectionReadback('trade-1',request,result,[history],{
        ...fresh,fills:[{...fresh.fills[0],[field]:replacement}],
      })).toBe(true);
    }
  });
});

it('requires confirmation of the exact proposed field, value, reason and prior revision',()=>{
 const impact={gross_realized_pnl:100,net_realized_pnl:95,realized_r:1,open_quantity:0,unknown_cost_fields:0};
 const preview={trade_id:'trade-1',execution_id:'fill-1',field:input.field,original:2,current_effective:2,proposed_effective:3,expected_revision:0,reason:input.reason,before:impact,after:impact,explicit_confirmation_required:true};
 expect(verifiedFillCorrectionPreview('trade-1',input,preview)).toBe(true);
 expect(verifiedFillCorrectionPreview('trade-1',input,{...preview,field:'commission'})).toBe(false);
 expect(verifiedFillCorrectionPreview('trade-1',input,{...preview,proposed_effective:null})).toBe(false);
 expect(verifiedFillCorrectionPreview('trade-1',input,{...preview,reason:'Different reason'})).toBe(false);
 expect(verifiedFillCorrectionPreview('trade-1',input,{...preview,expected_revision:-1})).toBe(false);
 expect(verifiedFillCorrectionPreview('trade-1',input,{...preview,explicit_confirmation_required:false})).toBe(false);
 expect(verifiedFillCorrectionReadback('trade-1',input,receipt,[event],fresh,0)).toBe(true);
 expect(verifiedFillCorrectionReadback('trade-1',input,receipt,[event],fresh,1)).toBe(false);
});
