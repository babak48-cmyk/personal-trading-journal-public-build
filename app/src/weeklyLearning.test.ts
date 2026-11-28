import {describe,expect,it} from 'vitest';
import {journalWeekStart,journalWeeks,weeklyLearningSnapshot,weeklyLearningText,weeklyTradeBreakdown,weeklyLevelSourceBreakdown,weeklyDecisionAwareAction,weeklySetupVersionBreakdown,weeklyDefinedContextBreakdown,weeklyThreePartReview,weeklyObservedEvidenceBreakdown,weeklyTradeReadiness,weeklySessionBreakdown,weeklyWeekdayBreakdown,weeklyDecisionHourBreakdown,localDecisionHour,weeklyMoneyBreakdown,weeklyMoneyText,weeklyTradeNumberBreakdown} from './weeklyLearning';
import type {JournalTradeRow} from './services/localApi';
const row=(id:string,date:string,patch:Partial<JournalTradeRow>={}):JournalTradeRow=>({
  trade_id:id,session_id:'s-'+id,session_date:date,instrument_symbol:'ES',direction:'LONG',
  status:'CLOSED',rule_status:'FOLLOWED',level_sources:[],mistakes:[],realized_r:1,
  net_realized_pnl:100,open_quantity:0,...patch,
});
describe('weekly learning uses only observed local journal trade rows',()=>{
  it('fails closed on missing Trade rows even when independently loaded MISSED decisions supply weeks',()=>{
    // The week count can be positive exclusively because decision-only data
    // succeeded; it cannot justify a zero-Trade weekly report or save action.
    expect(weeklyTradeReadiness(false,'Trade analytics unavailable: database read failed',1))
      .toBe('TRADE_UNAVAILABLE');
    expect(weeklyTradeReadiness(false,'Trade read failed',0))
      .toBe('TRADE_UNAVAILABLE');
    expect(weeklyTradeReadiness(true,'Trade read failed',1)).toBe('LOADING');
    expect(weeklyTradeReadiness(false,'',1)).toBe('READY');
    expect(weeklyTradeReadiness(false,'',0)).toBe('EMPTY');
  });

  it('groups only explicit zoned Decision timestamps, preserving DST and timezone identity',()=>{
    expect(localDecisionHour('2026-11-09T00:30:00Z','Australia/Sydney')).toBe('11');
    expect(localDecisionHour('2026-06-09T00:30:00Z','Australia/Sydney')).toBe('10');
    expect(localDecisionHour('2026-11-09T00:30:00Z','UTC')).toBe('00');
    expect(localDecisionHour('2026-11-09T11:30:00+11:00','Australia/Sydney')).toBe('11');
    expect(localDecisionHour('2026-11-09T00:30:00','Australia/Sydney')).toBeNull();
    expect(localDecisionHour('2026-11-09','Australia/Sydney')).toBeNull();
    expect(localDecisionHour('unknown','Australia/Sydney')).toBeNull();
    expect(localDecisionHour('2026-02-30T00:30:00Z','Australia/Sydney')).toBeNull();
    expect(localDecisionHour('2026-11-09T00:30:00Z','Invalid/Zone')).toBeNull();
    expect(localDecisionHour('2026-11-09T00:30:00Z',null)).toBeNull();

    const records=[
      row('sydney','2026-11-09',{decision_occurred_at:'2026-11-09T00:30:00Z',session_timezone_id:'Australia/Sydney',realized_r:2}),
      row('sydney-loss','2026-11-09',{decision_occurred_at:'2026-11-09T00:45:00Z',session_timezone_id:'Australia/Sydney',realized_r:-1}),
      row('utc','2026-11-09',{decision_occurred_at:'2026-11-09T00:30:00Z',session_timezone_id:'UTC',realized_r:null}),
      row('missing','2026-11-09',{decision_occurred_at:null,session_timezone_id:'Australia/Sydney',realized_r:99,rule_status:'VIOLATED'}),
      row('legacy-unknown-zone','2026-11-09',{decision_occurred_at:'2026-11-09T00:30:00Z',session_timezone_id:null,realized_r:100}),
      row('outside','2026-11-02',{decision_occurred_at:'2026-11-09T00:30:00Z',session_timezone_id:'UTC',realized_r:999}),
    ];
    expect(weeklyDecisionHourBreakdown(records,'2026-11-09')).toEqual([
      {label:'Australia/Sydney · 11:00–11:59',tradeCount:2,closedCount:2,eligibleRCount:2,netR:1,ruleViolationCount:0},
      {label:'UTC · 00:00–00:59',tradeCount:1,closedCount:1,eligibleRCount:0,netR:null,ruleViolationCount:0},
      {label:'Unknown recorded Decision time / Session zone',tradeCount:2,closedCount:2,eligibleRCount:0,netR:null,ruleViolationCount:1},
    ]);
  });

  it('derives weekday only from valid recorded Session dates across Monday-Sunday',()=>{
    const data=[
      row('mon','2026-11-09',{realized_r:2}),
      row('mon-unknown','2026-11-09',{realized_r:null,rule_status:'VIOLATED'}),
      row('sun','2026-11-15',{realized_r:null}),
      row('outside','2026-11-08',{realized_r:90}),
      row('invalid','2026-02-30',{realized_r:99}),
    ];
    expect(weeklyWeekdayBreakdown(data,'2026-11-09')).toEqual([
      {label:'Monday',tradeCount:2,closedCount:2,eligibleRCount:1,netR:2,ruleViolationCount:1},
      {label:'Sunday',tradeCount:1,closedCount:1,eligibleRCount:0,netR:null,ruleViolationCount:0},
    ]);
    expect(weeklyWeekdayBreakdown([],'2026-11-09')).toEqual([]);
  });
  it('keeps separate session IDs on the same date, and unknown net R distinct from zero',()=>{
    const records=[
      row('one','2026-11-09',{session_id:'session-A',realized_r:1}),
      row('two','2026-11-09',{session_id:'session-A',realized_r:null,rule_status:'VIOLATED'}),
      row('three','2026-11-09',{session_id:'session-B',realized_r:null}),
      row('four','2026-11-10',{session_id:'session-C',status:'OPEN',realized_r:null}),
      row('outside','2026-11-02',{session_id:'session-A',realized_r:99}),
    ];
    const grouped=weeklySessionBreakdown(records,'2026-11-09');
    expect(grouped).toHaveLength(3);
    expect(grouped.find(group=>group.label.includes('session-A'))).toMatchObject({
      tradeCount:2,closedCount:2,eligibleRCount:1,netR:1,ruleViolationCount:1,
    });
    expect(grouped.find(group=>group.label.includes('session-B'))).toMatchObject({
      tradeCount:1,closedCount:1,eligibleRCount:0,netR:null,
    });
    expect(grouped.find(group=>group.label.includes('session-C'))).toMatchObject({
      tradeCount:1,closedCount:0,eligibleRCount:0,netR:null,
    });
    expect(weeklySessionBreakdown(records,'2026-10-26')).toEqual([]);
  });
  it('groups LONG and SHORT independently without imputing missing R or crossing weeks',()=>{
    const data=[
      row('long-known','2026-11-09',{direction:'LONG',realized_r:1.25}),
      row('long-unknown','2026-11-10',{direction:'LONG',realized_r:null,rule_status:'VIOLATED'}),
      row('short-known','2026-11-11',{direction:'SHORT',realized_r:-0.5}),
      row('short-open','2026-11-12',{direction:'SHORT',status:'OPEN',realized_r:null}),
      row('outside','2026-11-02',{direction:'SHORT',realized_r:80})
    ];
    expect(weeklyTradeBreakdown(data,'2026-11-09','direction')).toEqual([
      {label:'LONG',tradeCount:2,closedCount:2,eligibleRCount:1,netR:1.25,ruleViolationCount:1},
      {label:'SHORT',tradeCount:2,closedCount:1,eligibleRCount:1,netR:-0.5,ruleViolationCount:0},
    ]);
    expect(weeklyTradeBreakdown([row('unknown','2026-11-09',{direction:'LONG',realized_r:null})],'2026-11-09','direction')[0].netR).toBeNull();
  });
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
    expect(weeklyLearningText(snap)).toContain('Audited-correction affected trades (all four families; each Trade counted once): 2');
    expect(weeklyLearningText(snap)).toContain('original event records');
  });
  it('counts all four historical correction families by trade and immutable event without duplicate trades',()=>{
    const data=[
      row('all','2026-11-09',{
        audited_correction_count:4,audited_initial_risk_correction_count:2,
        audited_source_type_correction_count:3,audited_source_price_correction_count:2,realized_r:1
      }),
      row('risk-only','2026-11-10',{audited_correction_count:0,audited_initial_risk_correction_count:1,realized_r:null}),
      row('source-only','2026-11-11',{audited_source_price_correction_count:1,realized_r:-1}),
      row('uncorrected','2026-11-12',{audited_correction_count:0,realized_r:0}),
      row('outside','2026-11-02',{audited_correction_count:99,audited_source_type_correction_count:50})
    ];
    const w=weeklyLearningSnapshot(data,'2026-11-09');
    expect(w).toMatchObject({
      tradeCount:4,closedCount:4,correctedTradeCount:3,
      fillCorrectedTradeCount:1,initialRiskCorrectedTradeCount:2,
      sourceTypeCorrectedTradeCount:1,sourcePriceCorrectedTradeCount:2,
      fillCorrectionEventCount:4,initialRiskCorrectionEventCount:3,
      sourceTypeCorrectionEventCount:3,sourcePriceCorrectionEventCount:3,
      eligibleRCount:3,missingRCount:1,netR:0,
    });
    const report=weeklyLearningText(w);
    expect(report).toContain('Audited-correction affected trades (all four families; each Trade counted once): 3');
    expect(report).toContain('Initial Risk: 2 trade(s) / 3 event(s)');
    expect(report).toContain('Level Source price: 2 trade(s) / 3 event(s)');
    expect(report).toContain('Category-specific trade counts may overlap');
    const old=weeklyLearningSnapshot([row('legacy','2026-11-09',{audited_correction_count:1})],'2026-11-09');
    expect(old.correctedTradeCount).toBe(1);
    expect(old.sourcePriceCorrectionEventCount).toBe(0);
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
  it('separates observed-at-Decision evidence from later records and respects overlapping source groups',()=>{
    const data=[
      row('a','2026-11-09',{evidence_observed_at_decision:['ENTRY_CONFIRMATION: DOM','SETUP_SUPPORT: Delta','ENTRY_CONFIRMATION: DOM'],realized_r:1}),
      row('b','2026-11-10',{evidence_observed_at_decision:['ENTRY_CONFIRMATION: DOM'],realized_r:null}),
      row('c','2026-11-11',{evidence_observed_at_decision:[],evidence_post_decision_count:2,realized_r:-1}),
      row('outside','2026-11-02',{evidence_observed_at_decision:['ENTRY_CONFIRMATION: DOM'],realized_r:99}),
    ];
    const results=weeklyObservedEvidenceBreakdown(data,'2026-11-09');
    expect(results).toEqual([
      {label:'ENTRY_CONFIRMATION: DOM',tradeCount:2,closedCount:2,eligibleRCount:1,netR:1,ruleViolationCount:0},
      {label:'Evidence recorded after Decision (not entry confirmation)',tradeCount:1,closedCount:1,eligibleRCount:1,netR:-1,ruleViolationCount:0},
      {label:'No timestamp-verified evidence at Decision',tradeCount:1,closedCount:1,eligibleRCount:1,netR:-1,ruleViolationCount:0},
      {label:'SETUP_SUPPORT: Delta',tradeCount:1,closedCount:1,eligibleRCount:1,netR:1,ruleViolationCount:0},
    ]);
    expect(results.reduce((sum,r)=>sum+r.tradeCount,0)).toBe(5);
    expect(weeklyObservedEvidenceBreakdown(data,'2026-10-26')).toEqual([]);
  });
  it('distinguishes absent at-Decision evidence, later evidence, and unknown timing without inventing confirmation',()=>{
    const records=[
      row('none','2026-11-09',{evidence_observed_at_decision:[],evidence_post_decision_count:0,evidence_unknown_timing_count:0,realized_r:1}),
      row('later','2026-11-10',{evidence_observed_at_decision:[],evidence_post_decision_count:2,evidence_unknown_timing_count:0,realized_r:-1}),
      row('unknown','2026-11-11',{evidence_observed_at_decision:[],evidence_post_decision_count:0,evidence_unknown_timing_count:1,realized_r:null}),
      row('mixed','2026-11-12',{evidence_observed_at_decision:['CONTRADICTING_EVIDENCE: Delta'],evidence_post_decision_count:1,evidence_unknown_timing_count:1,realized_r:2}),
      row('outside','2026-11-02',{evidence_observed_at_decision:[],evidence_post_decision_count:9,evidence_unknown_timing_count:9}),
    ];
    const groups=weeklyObservedEvidenceBreakdown(records,'2026-11-09');
    const get=(label:string)=>groups.find(g=>g.label===label);
    expect(get('No timestamp-verified evidence at Decision')).toMatchObject({
      tradeCount:3,closedCount:3,eligibleRCount:2,netR:0,
    });
    expect(get('Evidence recorded after Decision (not entry confirmation)')).toMatchObject({
      tradeCount:2,closedCount:2,eligibleRCount:2,netR:1,
    });
    expect(get('Evidence with unknown timing (not verified at Decision)')).toMatchObject({
      tradeCount:2,closedCount:2,eligibleRCount:1,netR:2,
    });
    expect(get('CONTRADICTING_EVIDENCE: Delta')).toMatchObject({
      tradeCount:1,netR:2,
    });
    expect(groups.reduce((sum,g)=>sum+g.tradeCount,0)).toBe(8);
    expect(weeklyObservedEvidenceBreakdown(records,'2026-10-26')).toEqual([]);
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
    expect(bySetup.find(g=>g.label==='Rejection · v1 · At entry · ID v1')).toMatchObject({tradeCount:1,netR:1,eligibleRCount:1});
    expect(bySetup.find(g=>g.label==='Rejection · v1 · Retrospective · ID v1')).toMatchObject({tradeCount:1,netR:-2,eligibleRCount:1});
    expect(bySetup.find(g=>g.label==='Rejection · v2 · At entry · ID v2')).toMatchObject({tradeCount:1,netR:null,eligibleRCount:0});
    expect(bySetup.find(g=>g.label==='No recorded Setup version')).toMatchObject({tradeCount:1,netR:0});
    const byContext=weeklyDefinedContextBreakdown(trades,'2026-11-09');
    expect(byContext).toHaveLength(4);
    expect(byContext.find(g=>g.label==='TREND (at entry)')).toMatchObject({tradeCount:1,netR:1});
    expect(byContext.find(g=>g.label==='TREND (retrospective)')).toMatchObject({tradeCount:1,netR:-2});
    expect(byContext.find(g=>g.label==='Setup context not recorded (no linked version)')).toMatchObject({tradeCount:1,netR:0});
  });
  it('gives a factual three-part weekly review and never calls a Setup proven profitable',()=>{
    const snap=weeklyLearningSnapshot([
      row('a','2026-11-09',{setup_version_id:'v1',setup_version_name:'Rejection',setup_version_number:1,setup_attribution:'AT_ENTRY',realized_r:2}),
      row('b','2026-11-10',{setup_version_id:'v1',setup_version_name:'Rejection',setup_version_number:1,setup_attribution:'AT_ENTRY',realized_r:null}),
      row('c','2026-11-11',{setup_version_id:'v2',setup_version_name:'Other',setup_version_number:1,setup_attribution:'RETROSPECTIVE',realized_r:5})
    ],'2026-11-09');
    const groups=weeklySetupVersionBreakdown([
      row('a','2026-11-09',{setup_version_id:'v1',setup_version_name:'Rejection',setup_version_number:1,setup_attribution:'AT_ENTRY',realized_r:2}),
      row('b','2026-11-10',{setup_version_id:'v1',setup_version_name:'Rejection',setup_version_number:1,setup_attribution:'AT_ENTRY',realized_r:null}),
      row('c','2026-11-11',{setup_version_id:'v2',setup_version_name:'Other',setup_version_number:1,setup_attribution:'RETROSPECTIVE',realized_r:5})
    ],'2026-11-09');
    const report=weeklyThreePartReview(snap,groups,2,'Verify the missing costs next week.');
    expect(report.setupCandidate).toContain('Rejection · v1 · At entry · ID v1 (2 trades; 1/2');
    expect(report.setupCandidate).not.toContain('Other');
    expect(report.setupCandidate).toContain('not evidence it is the best or repeatable');
    expect(report.recordedConcern).toContain('lack eligible R');
    expect(report.nextAction).toBe('Verify the missing costs next week.');
    const empty=weeklyThreePartReview(weeklyLearningSnapshot([],'2026-11-09'),[],0,'Investigate');
    expect(empty.setupCandidate).toContain('Do not infer a best setup');
  });
  it('keeps unavailable decision-only MISSED counts UNKNOWN rather than zero in the three-part review',()=>{
    const snapshot=weeklyLearningSnapshot([row('only-trade','2026-11-09',{realized_r:1})],'2026-11-09');
    const notLoaded=weeklyThreePartReview(snapshot,[],null,'Investigate recorded trades');
    const verifiedZero=weeklyThreePartReview(snapshot,[],0,'Investigate recorded trades');
    expect(notLoaded.recordedConcern).toContain('MISSED counts unavailable');
    expect(notLoaded.recordedConcern).toContain('not treat missing decision data as zero');
    expect(verifiedZero.recordedConcern).toContain('No ranked process issue identified');
    expect(notLoaded.recordedConcern).not.toBe(verifiedZero.recordedConcern);
    const higherPriority=weeklyLearningSnapshot([row('violation','2026-11-09',{rule_status:'VIOLATED'})],'2026-11-09');
    expect(weeklyThreePartReview(higherPriority,[],null,'Check a recorded rule').recordedConcern)
      .toContain('recorded rule violations');
  });
  it('reports largest positive and negative known R only on closed R-eligible trades',()=>{
    const data=[
      row('positive','2026-11-09',{realized_r:2.75}),
      row('positive-small','2026-11-10',{realized_r:0.25}),
      row('negative','2026-11-11',{realized_r:-1.5}),
      row('negative-small','2026-11-12',{realized_r:-0.5}),
      row('breakeven','2026-11-13',{realized_r:0}),
      row('unknown','2026-11-13',{realized_r:null}),
      row('open','2026-11-14',{status:'OPEN',realized_r:999}),
      row('outside','2026-11-02',{realized_r:-999}),
    ];
    const snapshot=weeklyLearningSnapshot(data,'2026-11-09');
    expect(snapshot).toMatchObject({eligibleRCount:5,missingRCount:1,largestWinnerR:2.75,largestLoserR:-1.5});
    expect(weeklyLearningText(snapshot)).toContain('Largest known closed winner: 2.75R; largest known closed loser: -1.50R');
    const onlyWins=weeklyLearningSnapshot([row('win','2026-11-09',{realized_r:0.5})],'2026-11-09');
    expect(onlyWins.largestLoserR).toBeNull();
    const noEligible=weeklyLearningSnapshot([row('missing','2026-11-09',{realized_r:null})],'2026-11-09');
    expect(noEligible).toMatchObject({largestWinnerR:null,largestLoserR:null,netR:null});
    expect(weeklyLearningText(noEligible)).toContain('Largest known closed winner: not recorded; largest known closed loser: not recorded');
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

describe('weekly monetary outcomes preserve coverage and currency',()=>{
  it('separates currencies and missing costs, excludes open and other weeks',()=>{
    const date='2026-11-23';
    const result=weeklyMoneyBreakdown([
      row('es',date,{pnl_currency:'USD',gross_realized_pnl:100,net_realized_pnl:96}),
      row('gc',date,{pnl_currency:'USD',gross_realized_pnl:50,net_realized_pnl:null}),
      row('zero',date,{pnl_currency:'USD',gross_realized_pnl:0,net_realized_pnl:0}),
      row('aud',date,{pnl_currency:'AUD',gross_realized_pnl:80,net_realized_pnl:75}),
      row('legacy',date,{pnl_currency:null,gross_realized_pnl:999,net_realized_pnl:999}),
      row('open',date,{status:'OPEN',pnl_currency:'USD',gross_realized_pnl:999}),
      row('prior','2026-11-16',{pnl_currency:'USD',gross_realized_pnl:999}),
    ],date);
    expect(result).toEqual([
      {currency:'AUD',closedCount:1,grossCount:1,netCount:1,costCount:1,gross:80,net:75,costs:5},
      {currency:'USD',closedCount:3,grossCount:3,netCount:2,costCount:2,gross:150,net:96,costs:4},
      {currency:null,closedCount:1,grossCount:1,netCount:1,costCount:1,gross:null,net:null,costs:null}
    ]);
    expect(weeklyMoneyText(result)).toContain('Unknown historical currency (totals withheld)');
  });
  it('never manufactures a zero from a missing monetary sample',()=>{
    expect(weeklyMoneyBreakdown([row('missing','2026-11-23',{pnl_currency:'USD',gross_realized_pnl:null,net_realized_pnl:null})],'2026-11-23')[0]).toEqual({currency:'USD',closedCount:1,grossCount:0,netCount:0,costCount:0,gross:null,net:null,costs:null});
  });
});

describe('weekly trade number uses complete native Session ordinals',()=>{
  it('retains filtered gaps and independent sessions, and does not invent missing numbers',()=>{
    const rows=[
      row('a','2026-11-09',{session_id:'one',session_trade_number:3,realized_r:-2,rule_status:'VIOLATED'}),
      row('b','2026-11-09',{session_id:'two',session_trade_number:3,realized_r:null}),
      row('c','2026-11-10',{session_trade_number:1,realized_r:2}),
      row('d','2026-11-10',{session_trade_number:null,realized_r:null}),
      row('e','2026-11-10',{session_trade_number:0,status:'OPEN',realized_r:99}),
      row('f','2026-11-16',{session_trade_number:2,realized_r:99}),
    ];
    expect(weeklyTradeNumberBreakdown(rows,'2026-11-09')).toEqual([
      {label:'Trade #1',tradeCount:1,closedCount:1,eligibleRCount:1,netR:2,ruleViolationCount:0},
      {label:'Trade #3',tradeCount:2,closedCount:2,eligibleRCount:1,netR:-2,ruleViolationCount:1},
      {label:'Unknown trade number',tradeCount:2,closedCount:1,eligibleRCount:0,netR:null,ruleViolationCount:0},
    ]);
    expect(weeklyTradeNumberBreakdown([rows[0]],'2026-11-09')[0].label).toBe('Trade #3');
  });
});
