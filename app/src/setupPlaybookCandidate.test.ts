import {describe,it,expect} from 'vitest';
import {setupPlaybookCandidate} from './setupPlaybookCandidate';
import type {JournalTradeRow} from './services/localApi';
const row:JournalTradeRow={
 trade_id:'trade-001',session_id:'session-001',session_date:'2026-11-16',
 instrument_symbol:'ES',direction:'LONG',status:'CLOSED',candidate_label:'Zone A',
 decision_quality:'B',rule_status:'FOLLOWED',level_sources:['VWAP'],mistakes:[],
 realized_r:null,net_realized_pnl:null,open_quantity:0,audited_correction_count:2
};
describe('setup playbook candidate is source-only and not a trading edge',()=>{
 it('preserves historical ID and unknown R without inventing setup parameters',()=>{
  const x=setupPlaybookCandidate(row);
  expect(x).toContain('trade-001');
  expect(x).toContain('decision-time level sources: VWAP');
  expect(x).toContain('Net R: UNKNOWN');
  expect(x).toContain('Audited correction events: 2');
  expect(x).toContain('Thesis invalidation: NOT RECORDED');
  expect(x).toContain('NOT a validated edge');
  expect(row.realized_r).toBeNull();
 });
 it('rejects open trades and does not fabricate missing source provenance',()=>{
  expect(()=>setupPlaybookCandidate({...row,status:'OPEN'})).toThrow(/closed/);
  expect(setupPlaybookCandidate({...row,level_sources:[],level_source_snapshot_missing:true})).toContain('UNKNOWN: decision-time source snapshot missing');
 });
});
