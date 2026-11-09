import {describe,expect,it} from 'vitest';
import {journalWeekStart,journalWeeks,weeklyLearningSnapshot,weeklyLearningText,weeklyTradeBreakdown} from './weeklyLearning';
import type {JournalTradeRow} from './services/localApi';
const row=(id:string,date:string,patch:Partial<JournalTradeRow>={}):JournalTradeRow=>({
  trade_id:id,session_id:'s-'+id,session_date:date,instrument_symbol:'ES',direction:'LONG',
  status:'CLOSED',rule_status:'FOLLOWED',level_sources:[],mistakes:[],realized_r:1,
  net_realized_pnl:100,open_quantity:0,...patch,
});
describe('weekly learning uses only observed local journal trade rows',()=>{
  it('groups ISO Monday weeks independent of local clock and rejects invalid calendar dates',()=>{
    expect(journalWeekStart('2026-11-09')).toBe('2026-11-09');
    expect(journalWeekStart('2026-11-15')).toBe('2026-11-09');
    expect(journalWeekStart('2026-11-08')).toBe('2026-11-02');
    expect(journalWeekStart('2026-02-30')).toBeNull();
    expect(journalWeeks([row('a','2026-11-09'),row('b','2026-11-08')])).toEqual(['2026-11-09','2026-11-02']);
  });
  it('separates unverified cost/risk R from known outcomes, keeps open trades out of eligible R',()=>{
    const data=[row('a','2026-11-09',{realized_r:2}),row('b','2026-11-10',{realized_r:null}),
      row('c','2026-11-11',{status:'OPEN',realized_r:null,open_quantity:1}),
      row('d','2026-11-02',{realized_r:99})];
    const s=weeklyLearningSnapshot(data,'2026-11-09');
    expect(s).toMatchObject({tradeCount:3,closedCount:2,openCount:1,eligibleRCount:1,missingRCount:1,netR:2,scope:'FILTERED_TRADES_ONLY'});
    expect(weeklyLearningText(s)).toContain('does not include NO_TRADE/MISSED');
  });
  it('counts each mistake at most once per trade, preserves rule status as different from profit',()=>{
    const s=weeklyLearningSnapshot([
      row('a','2026-11-09',{mistakes:['m1','m1','m2'],rule_status:'VIOLATED',realized_r:1}),
      row('b','2026-11-10',{mistakes:['m1'],rule_status:'UNCHECKED',realized_r:-1}),
    ],'2026-11-09',[{mistake_type_id:'m1',label:'Late entry',count:500}]);
    expect(s).toMatchObject({netR:0,ruleViolationCount:1,uncheckedRuleCount:1});
    expect(s.mistakes).toEqual([{id:'m1',label:'Late entry',count:2},{id:'m2',label:'m2',count:1}]);
    expect(s.action).toContain('rule-violation');
  });
  it('compares instruments without mixing time windows or treating missing R as zero',()=>{
    const data=[
      row('es1','2026-11-09',{instrument_symbol:'ES',realized_r:2,rule_status:'VIOLATED'}),
      row('es2','2026-11-10',{instrument_symbol:'ES',realized_r:null}),
      row('gc1','2026-11-11',{instrument_symbol:'GC',realized_r:null}),
      row('gc2','2026-11-02',{instrument_symbol:'GC',realized_r:999}),
    ];
    expect(weeklyTradeBreakdown(data,'2026-11-09','instrument_symbol')).toEqual([
      {label:'ES',tradeCount:2,closedCount:2,eligibleRCount:1,netR:2,ruleViolationCount:1},
      {label:'GC',tradeCount:1,closedCount:1,eligibleRCount:0,netR:null,ruleViolationCount:0},
    ]);
  });
  it('keeps missing decision quality distinct from reviewed outcomes and counts only valid R',()=>{
    const data=[
      row('q1','2026-11-09',{decision_quality:'A',realized_r:-1}),
      row('q2','2026-11-09',{decision_quality:'A',realized_r:null}),
      row('q3','2026-11-09',{decision_quality:'C',realized_r:3}),
      row('q4','2026-11-09',{decision_quality:null,status:'OPEN',realized_r:null}),
    ];
    expect(weeklyTradeBreakdown(data,'2026-11-09','decision_quality')).toEqual([
      {label:'A',tradeCount:2,closedCount:2,eligibleRCount:1,netR:-1,ruleViolationCount:0},
      {label:'C',tradeCount:1,closedCount:1,eligibleRCount:1,netR:3,ruleViolationCount:0},
      {label:'Not recorded',tradeCount:1,closedCount:0,eligibleRCount:0,netR:null,ruleViolationCount:0},
    ]);
  });
  it('never represents no eligible R or an empty week as zero profit',()=>{
    const s=weeklyLearningSnapshot([row('a','2026-11-10',{realized_r:null})],'2026-11-09');
    expect(s.netR).toBeNull();
    expect(weeklyLearningText(s)).toContain('Sum of eligible net R: unknown');
    const blank=weeklyLearningSnapshot([],'2026-11-09');
    expect(blank.tradeCount).toBe(0);
    expect(blank.netR).toBeNull();
    expect(blank.observation).toContain('No trades');
  });
});
