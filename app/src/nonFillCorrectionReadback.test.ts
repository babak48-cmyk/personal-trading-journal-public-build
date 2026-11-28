import {describe,it,expect} from 'vitest';
import {verifiedRiskCorrectionReadback,verifiedSourceTypeReadback,verifiedSourcePriceReadback} from './nonFillCorrectionReadback';
import type {TradeDetail,HistoricalSourceReadout} from './services/localApi';
const base={correction_id:'audit-1',revision:1,reason:'Historical entry error',recorded_at_utc:'2026-11-28T00:00:00Z',actor:'LOCAL_USER',expected_prior_correction_id:null};
const riskInput={risk_snapshot_id:'risk',expected_effective:100,expected_revision:0,replacement:150,reason:base.reason};
const riskEvent={...base,risk_snapshot_id:'risk',original_risk_dollars:100,previous_risk_dollars:100,replacement_risk_dollars:150};
const trade={metrics:{trade_id:'trade',initial_risk_dollars:150},risk_snapshots:[{risk_snapshot_id:'risk',snapshot_type:'INITIAL',risk_dollars:150}]} as TradeDetail;
const source={candidate_source_id:'source',effective_source_type_id:'new',revision:1,effective_source_price:101,price_correction_revision:1} as HistoricalSourceReadout;
const typeInput={candidate_source_id:'source',expected_effective_type_id:'old',expected_revision:0,replacement_type_id:'new',reason:base.reason};
const typeEvent={...base,candidate_source_id:'source',original_source_type_id:'old',previous_source_type_id:'old',replacement_source_type_id:'new'};
const priceInput={candidate_source_id:'source',expected_effective_price:null,expected_revision:0,replacement_price:101,reason:base.reason};
const priceEvent={...base,candidate_source_id:'source',original_source_price:null,previous_source_price:null,replacement_source_price:101};
describe('non-Fill audited correction independent readback',()=>{
 it('requires exact risk owner, effective snapshot and immutable receipt',()=>{
  expect(verifiedRiskCorrectionReadback('trade',riskInput,riskEvent,[riskEvent],trade)).toBe(true);
  expect(verifiedRiskCorrectionReadback('other',riskInput,riskEvent,[riskEvent],trade)).toBe(false);
  expect(verifiedRiskCorrectionReadback('trade',riskInput,riskEvent,[{...riskEvent,reason:'wrong'}],trade)).toBe(false);
  expect(verifiedRiskCorrectionReadback('trade',riskInput,riskEvent,[riskEvent,riskEvent],trade)).toBe(false);
  expect(verifiedRiskCorrectionReadback('trade',riskInput,riskEvent,[riskEvent],{...trade,risk_snapshots:[]})).toBe(false);
 });
 it('requires the matching source classification event and revision',()=>{
  expect(verifiedSourceTypeReadback(typeInput,typeEvent,[typeEvent],[source])).toBe(true);
  expect(verifiedSourceTypeReadback(typeInput,typeEvent,[{...typeEvent,candidate_source_id:'other'}],[source])).toBe(false);
  expect(verifiedSourceTypeReadback(typeInput,typeEvent,[typeEvent],[{...source,revision:2}])).toBe(false);
 });
 it('preserves unknown historical price and refuses mismatched receipts',()=>{
  expect(verifiedSourcePriceReadback(priceInput,priceEvent,[priceEvent],[source])).toBe(true);
  expect(verifiedSourcePriceReadback(priceInput,priceEvent,[{...priceEvent,previous_source_price:0}],[source])).toBe(false);
  expect(verifiedSourcePriceReadback(priceInput,{...priceEvent,replacement_source_price:102},[priceEvent],[source])).toBe(false);
  expect(verifiedSourcePriceReadback(priceInput,priceEvent,[priceEvent],[{...source,effective_source_price:102}])).toBe(false);
 });
});
