import {describe,expect,it} from 'vitest';
import {journalWeekStart,journalWeeks,weeklyLearningSnapshot,weeklyLearningText,weeklyTradeBreakdown,weeklyLevelSourceBreakdown,weeklyDecisionAwareAction,weeklySetupVersionBreakdown,weeklyDefinedContextBreakdown} from './weeklyLearning';
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
    expect(weeklyLearningText(s)).toContain('Decision-only events: unavailable in this trade-only summary.');
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
  it('reports distinct audited-correction trades without inflating R sample or trading outcomes',()=>{
    const data=[
      row('a','2026-11-09',{audited_correction_count:3,realized_r:1.25}),
      row('b','2026-11-10',{audited_correction_count:1,realized_r:null}),
      row('c','2026-11-11',{audited_correction_count:0,realized_r:-1}),
      row('d','2026-11-02',{audited_correction_count:4,realized_r:9}),
    ];
    const snap=weeklyLearningSnapshot(data,'2026-11-09');
    expect(snap.correctedTradeCount).toBe(2);
    expect(snap.eligibleRCount).toBe(2);
    expect(snap.missingRCount).toBe(1);
    expect(snap.netR).toBeCloseTo(.25);
    expect(weeklyLearningText(snap)).toContain('Audited-correction affected trades: 2');
    expect(weeklyLearningText(snap)).toContain('original event records');
  });
  it('reports overlapping level provenance without inventing missing snapshots or double counting within one group',()=>{
    const records=[
      row('a','2026-11-09',{level_sources:['Prior Day High','Hourly POC','Hourly POC'],realized_r:1.5}),
      row('b','2026-11-10',{level_sources:['Prior Day High'],realized_r:null}),
      row('c','2026-11-11',{level_sources:[],level_source_snapshot_missing:true,realized_r:-1}),
      row('d','2026-11-11',{level_sources:[],realized_r:0}),
      row('outside','2026-11-02',{level_sources:['Prior Day High'],realized_r:55}),
    ];
    const groups=weeklyLevelSourceBreakdown(records,'2026-11-09');
    expect(groups).toEqual([
      {label:'Prior Day High',tradeCount:2,closedCount:2,eligibleRCount:1,netR:1.5,ruleViolationCount:0},
      {label:'Decision-time provenance unknown',tradeCount:1,closedCount:1,eligibleRCount:1,netR:-1,ruleViolationCount:0},
      {label:'Hourly POC',tradeCount:1,closedCount:1,eligibleRCount:1,netR:1.5,ruleViolationCount:0},
      {label:'No source recorded at decision',tradeCount:1,closedCount:1,eligibleRCount:1,netR:0,ruleViolationCount:0},
    ]);
    expect(groups.reduce((sum,g)=>sum+g.tradeCount,0)).toBe(5); // 4 distinct weekly trades
    expect(weeklyLearningText(weeklyLearningSnapshot(records,'2026-11-09'),groups)).toContain('Decision-time level source groups (overlapping; do not sum');
    expect(weeklyLearningText(weeklyLearningSnapshot(records,'2026-11-09'),groups)).toContain('Prior Day High [2 linked trades, 1/2 R eligible');
    expect(weeklyLevelSourceBreakdown(records,'2026-10-05')).toEqual([]);
  });
  it('uses decision-only MISSED reasons for one cautious weekly action when trade process has no priority issue',()=>{
    const snap=weeklyLearningSnapshot([row('a','2026-11-09',{realized_r:1})],'2026-11-09');
    const reasons=[
      {decision_type:'MISSED',reason_code:'HESITATION',decision_count:3},
      {decision_type:'MISSED',reason_code:'[FREE_TEXT_ONLY]',decision_count:10},
      {decision_type:'NO_TRADE',reason_code:'NO_CONFIRMATION',decision_count:8}
    ];
    const action=weeklyDecisionAwareAction(snap,4,reasons);
    expect(action).toContain('4 recorded MISSED');
    expect(action).toContain('3 with reason HESITATION');
    expect(action).toContain('verify opportunity validity');
    expect(action).not.toContain('10 with reason');
    expect(weeklyLearningText(snap,[],{missed:4,noTrade:8,action})).toContain('NO_TRADE 8; MISSED 4');
    expect(weeklyLearningText(snap,[],{missed:4,noTrade:8,action})).toContain(action);
  });
  it('keeps known process or missing-cost data quality concerns ahead of missed-decision suggestions',()=>{
    const violation=weeklyLearningSnapshot([row('a','2026-11-09',{rule_status:'VIOLATED'})],'2026-11-09');
    const reason=[{decision_type:'MISSED',reason_code:'HESITATION',decision_count:3}];
    expect(weeklyDecisionAwareAction(violation,3,reason)).toBe(violation.action);
    const unknownR=weeklyLearningSnapshot([row('a','2026-11-09',{realized_r:null})],'2026-11-09');
    expect(weeklyDecisionAwareAction(unknownR,3,reason)).toBe(unknownR.action);
    const zero=weeklyLearningSnapshot([],'2026-11-09');
    expect(weeklyDecisionAwareAction(zero,0,reason)).toBe(zero.action);
    expect(weeklyDecisionAwareAction(zero,1,[{decision_type:'MISSED',reason_code:'[NO_REASON]',decision_count:1}])).toContain('verify whether each opportunity was actually valid');
  });
  it('groups immutable Setup version IDs, separating entry snapshots from retrospective attribution',()=>{
    const trades=[
      row('entry','2026-11-09',{setup_version_id:'v1',setup_version_name:'Rejection',setup_version_number:1,setup_attribution:'AT_ENTRY',setup_defined_market_context:'TREND',realized_r:1}),
      row('retrospective','2026-11-10',{setup_version_id:'v1',setup_version_name:'Rejection',setup_version_number:1,setup_attribution:'RETROSPECTIVE',setup_defined_market_context:'TREND',realized_r:-2}),
      row('second','2026-11-11',{setup_version_id:'v2',setup_version_name:'Rejection',setup_version_number:2,setup_attribution:'AT_ENTRY',setup_defined_market_context:'RANGE',realized_r:null}),
      row('unknown','2026-11-12',{setup_version_id:null,setup_attribution:'NOT_RECORDED',realized_r:0}),
      row('otherweek','2026-11-02',{setup_version_id:'v1',setup_attribution:'AT_ENTRY',realized_r:99}),
    ];
    const bySetup=weeklySetupVersionBreakdown(trades,'2026-11-09');
    expect(bySetup).toHaveLength(4);
    expect(bySetup.find(g=>g.label==='Rejection · v1 · At entry')).toMatchObject({tradeCount:1,netR:1,eligibleRCount:1});
    expect(bySetup.find(g=>g.label==='Rejection · v1 · Retrospective')).toMatchObject({tradeCount:1,netR:-2,eligibleRCount:1});
    expect(bySetup.find(g=>g.label==='Rejection · v2 · At entry')).toMatchObject({tradeCount:1,netR:null,eligibleRCount:0});
    expect(bySetup.find(g=>g.label==='No recorded Setup version')).toMatchObject({tradeCount:1,netR:0});
    const byContext=weeklyDefinedContextBreakdown(trades,'2026-11-09');
    expect(byContext).toHaveLength(4);
    expect(byContext.find(g=>g.label==='TREND (at entry)')).toMatchObject({tradeCount:1,netR:1});
    expect(byContext.find(g=>g.label==='TREND (retrospective)')).toMatchObject({tradeCount:1,netR:-2});
    expect(byContext.find(g=>g.label==='Setup context not recorded (no linked version)')).toMatchObject({tradeCount:1,netR:0});
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
