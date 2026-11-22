import type {JournalTradeRow, MistakeSummary} from './services/localApi';

/** ISO-8601 Monday based on the journal's recorded session DATE, never the OS timezone. */
export function journalWeekStart(sessionDate:string):string|null{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate))return null;
  const day=new Date(sessionDate+'T00:00:00Z');
  if(!Number.isFinite(day.getTime())||day.toISOString().slice(0,10)!==sessionDate)return null;
  day.setUTCDate(day.getUTCDate()-((day.getUTCDay()+6)%7));
  return day.toISOString().slice(0,10);
}

export type WeeklyTradeBreakdown=Readonly<{
  label:string;
  tradeCount:number;
  closedCount:number;
  eligibleRCount:number;
  netR:number|null;
  ruleViolationCount:number;
}>;

/** All groups are descriptive. Keep R unknown when none of the closed
 * trades has a trusted denominator and complete known costs. */
export function weeklyTradeBreakdown(
  rows:readonly JournalTradeRow[],
  weekStart:string,
  groupBy:'instrument_symbol'|'decision_quality',
):WeeklyTradeBreakdown[]{
  const weekly=rows.filter(row=>journalWeekStart(row.session_date)===weekStart);
  const groups=new Map<string,JournalTradeRow[]>();
  for(const row of weekly){
    const raw=groupBy==='instrument_symbol'?row.instrument_symbol:row.decision_quality;
    const label=raw?.trim()||'Not recorded';
    const group=groups.get(label)||[];
    group.push(row);
    groups.set(label,group);
  }
  return [...groups].map(([label,items])=>{
    const closed=items.filter(item=>item.status==='CLOSED');
    const eligible=closed.filter(item=>item.realized_r!=null&&Number.isFinite(item.realized_r));
    return {
      label,tradeCount:items.length,closedCount:closed.length,eligibleRCount:eligible.length,
      netR:eligible.length?eligible.reduce((sum,item)=>sum+(item.realized_r as number),0):null,
      ruleViolationCount:items.filter(item=>item.rule_status==='VIOLATED').length,
    };
  }).sort((a,b)=>b.tradeCount-a.tradeCount||a.label.localeCompare(b.label));
}

/** A trade may have multiple saved decision-time level sources. Group counts
 * overlap by design and MUST NOT be added together as distinct trades.
 * Missing historical provenance snapshots cannot be interpreted as "none".
 */
export function weeklyLevelSourceBreakdown(
  rows:readonly JournalTradeRow[],weekStart:string,
):WeeklyTradeBreakdown[]{
  const groups=new Map<string,JournalTradeRow[]>();
  for(const row of rows){
    if(journalWeekStart(row.session_date)!==weekStart)continue;
    const labels=row.level_source_snapshot_missing
      ? ['Decision-time provenance unknown']
      : row.level_sources.length>0
        ? [...new Set(row.level_sources.map(label=>label.trim()).filter(Boolean))]
        : ['No source recorded at decision'];
    for(const label of labels.length?labels:['No source recorded at decision']){
      const group=groups.get(label)||[];
      group.push(row);groups.set(label,group);
    }
  }
  return [...groups].map(([label,items])=>{
    const closed=items.filter(row=>row.status==='CLOSED');
    const eligible=closed.filter(row=>row.realized_r!=null&&Number.isFinite(row.realized_r));
    return {
      label,tradeCount:items.length,closedCount:closed.length,
      eligibleRCount:eligible.length,
      netR:eligible.length?eligible.reduce((sum,row)=>sum+(row.realized_r as number),0):null,
      ruleViolationCount:items.filter(row=>row.rule_status==='VIOLATED').length,
    };
  }).sort((a,b)=>b.tradeCount-a.tradeCount||a.label.localeCompare(b.label));
}

/** A saved Setup definition is not proof that its market context actually
 * occurred. At-entry and retrospectively linked trades remain distinct.
 * Group identity uses immutable version ID, not potentially reused labels.
 */
export function weeklySetupVersionBreakdown(
  rows:readonly JournalTradeRow[], weekStart:string,
):WeeklyTradeBreakdown[]{
  const groups=new Map<string,{label:string;items:JournalTradeRow[]}>();
  for(const row of rows){
    if(journalWeekStart(row.session_date)!==weekStart)continue;
    const origin=row.setup_version_id
      ? row.setup_attribution==='RETROSPECTIVE'?'Retrospective':'At entry'
      : 'Not recorded';
    const name=row.setup_version_name?.trim()||'Unnamed / legacy setup';
    const label=row.setup_version_id
      ? name+' · '+(row.setup_version_number==null?'version unknown':'v'+row.setup_version_number)+' · '+origin
      : 'No recorded Setup version';
    const key=row.setup_version_id?origin+':'+row.setup_version_id:'NONE';
    const group=groups.get(key)||{label,items:[]};
    group.items.push(row);groups.set(key,group);
  }
  return [...groups.values()].map(({label,items})=>{
    const closed=items.filter(row=>row.status==='CLOSED');
    const eligible=closed.filter(row=>row.realized_r!=null&&Number.isFinite(row.realized_r));
    return {label,tradeCount:items.length,closedCount:closed.length,
      eligibleRCount:eligible.length,
      netR:eligible.length?eligible.reduce((sum,row)=>sum+(row.realized_r as number),0):null,
      ruleViolationCount:items.filter(row=>row.rule_status==='VIOLATED').length};
  }).sort((a,b)=>b.tradeCount-a.tradeCount||a.label.localeCompare(b.label));
}

/** Version definition text, not observed session market conditions.
 * Retrospective links are kept separate from known-at-entry versions.
 */
export function weeklyDefinedContextBreakdown(
  rows:readonly JournalTradeRow[],weekStart:string,
):WeeklyTradeBreakdown[]{
  const groups=new Map<string,JournalTradeRow[]>();
  for(const row of rows){
    if(journalWeekStart(row.session_date)!==weekStart)continue;
    const context=row.setup_defined_market_context?.trim()||'Setup context not recorded';
    const scope=row.setup_attribution==='RETROSPECTIVE'?' (retrospective)':row.setup_version_id?' (at entry)':' (no linked version)';
    const key=context+scope;
    const group=groups.get(key)||[];group.push(row);groups.set(key,group);
  }
  return [...groups.entries()].map(([label,items])=>{
    const closed=items.filter(row=>row.status==='CLOSED');
    const eligible=closed.filter(row=>row.realized_r!=null&&Number.isFinite(row.realized_r));
    return {label,tradeCount:items.length,closedCount:closed.length,
      eligibleRCount:eligible.length,
      netR:eligible.length?eligible.reduce((sum,row)=>sum+(row.realized_r as number),0):null,
      ruleViolationCount:items.filter(row=>row.rule_status==='VIOLATED').length};
  }).sort((a,b)=>b.tradeCount-a.tradeCount||a.label.localeCompare(b.label));
}

export type WeeklyLearningSnapshot=Readonly<{
  weekStart:string;
  tradeCount:number;
  closedCount:number;
  openCount:number;
  eligibleRCount:number;
  missingRCount:number;
  correctedTradeCount:number;
  netR:number|null;
  ruleViolationCount:number;
  uncheckedRuleCount:number;
  mistakes:readonly {id:string;label:string;count:number}[];
  observation:string;
  action:string;
  /** This only covers trades returned by the current journal filters. */
  scope:'FILTERED_TRADES_ONLY';
}>;

/** Read-only descriptive review of recorded trades, not a strategy signal or a
 * statistical edge. Does not count NO_TRADE/MISSED decisions that lack trades. */
export function weeklyLearningSnapshot(
  rows:readonly JournalTradeRow[],
  weekStart:string,
  mistakeCatalog:readonly MistakeSummary[]=[],
):WeeklyLearningSnapshot{
  const weekly=rows.filter(row=>journalWeekStart(row.session_date)===weekStart);
  const closed=weekly.filter(row=>row.status==='CLOSED');
  const eligible=closed.filter(row=>row.realized_r!=null&&Number.isFinite(row.realized_r));
  const missingRCount=closed.length-eligible.length;
  // Count distinct trades with persisted corrections, not correction events.
  // Revisions of the same Fill never inflate weekly sample size.
  const correctedTradeCount=weekly.filter(row=>
    Number.isInteger(row.audited_correction_count) && (row.audited_correction_count??0)>0
  ).length;
  const count=new Map<string,number>();
  weekly.forEach(row=>new Set(row.mistakes||[]).forEach(id=>count.set(id,(count.get(id)||0)+1)));
  const labels=new Map(mistakeCatalog.map(m=>[m.mistake_type_id,m.label]));
  const mistakes=[...count].map(([id,n])=>({id,label:labels.get(id)||id,count:n}))
    .sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)||a.id.localeCompare(b.id));
  const violated=weekly.filter(row=>row.rule_status==='VIOLATED').length;
  const unchecked=weekly.filter(row=>row.rule_status==='UNCHECKED').length;
  const action=violated>0
    ? 'Review the recorded rule-violation trades and choose one specific rule to follow next week.'
    : mistakes.length>0
      ? 'Review the recorded "'+mistakes[0].label+'" cases and choose one observable process change for next week.'
      : missingRCount>0
        ? 'Review closed trades missing eligible net R; check cost and initial-risk records before interpreting performance.'
        : unchecked>0
          ? 'Review unchecked rule-adherence records before drawing process conclusions.'
          : 'Review representative decisions and write one concrete improvement for the next session.';
  const observation=weekly.length===0
    ? 'No trades in this selected week under the current filters.'
    : 'Descriptive sample only: '+weekly.length+' trades, '+closed.length+' closed, '+eligible.length+' eligible for net R; no causal trading edge is inferred.';
  return {
    weekStart,tradeCount:weekly.length,closedCount:closed.length,openCount:weekly.length-closed.length,
    eligibleRCount:eligible.length,missingRCount,correctedTradeCount,
    netR:eligible.length?eligible.reduce((total,row)=>total+(row.realized_r as number),0):null,
    ruleViolationCount:violated,uncheckedRuleCount:unchecked,mistakes,
    observation,action,scope:'FILTERED_TRADES_ONLY',
  };
}

/** Draws on original NO_TRADE/MISSED aggregates only when the higher-priority
 * executed-trade integrity/process action has no specific trigger.
 * A MISSED label is not proof the opportunity was valid or profitable.
 */
export function weeklyDecisionAwareAction(
  snapshot:WeeklyLearningSnapshot,
  missedCount:number,
  reasonGroups:readonly {decision_type:string;reason_code:string;decision_count:number}[],
):string{
  if(snapshot.ruleViolationCount>0||snapshot.mistakes.length>0||
     snapshot.missingRCount>0||snapshot.uncheckedRuleCount>0)return snapshot.action;
  if(!Number.isInteger(missedCount)||missedCount<=0)return snapshot.action;
  const missedReasons=reasonGroups.filter(row=>
    row.decision_type==='MISSED'&&row.reason_code!=='[NO_REASON]'&&
    row.reason_code!=='[FREE_TEXT_ONLY]'&&
    Number.isInteger(row.decision_count)&&row.decision_count>0);
  const ranked=[...missedReasons].sort((a,b)=>b.decision_count-a.decision_count||
    a.reason_code.localeCompare(b.reason_code));
  if(!ranked.length){
    return 'Review '+missedCount+' recorded MISSED decision(s); verify whether each opportunity was actually valid, then choose one observable improvement.';
  }
  const reason=ranked[0];
  return 'Review '+missedCount+' recorded MISSED decision(s), including '+
    reason.decision_count+' with reason '+reason.reason_code+
    '; verify opportunity validity before choosing one actionable prevention step.';
}

export function journalWeeks(rows:readonly JournalTradeRow[]):string[]{
  return [...new Set(rows.map(row=>journalWeekStart(row.session_date)).filter((x):x is string=>x!==null))].sort().reverse();
}

export function weeklyLearningText(snapshot:WeeklyLearningSnapshot,levelSources:readonly WeeklyTradeBreakdown[]=[],decisionContext?:{missed:number;noTrade:number;action:string}):string{
  return [
    'PTJ weekly learning — week of '+snapshot.weekStart,
    'Scope: trade metrics use filtered recorded trades only. Decision-only counts, when present, use date/instrument filters and are NOT limited by trade-only filters.',
    'Trades: '+snapshot.tradeCount+'; closed: '+snapshot.closedCount+'; open/other: '+snapshot.openCount+'.',
    'Net R eligible: '+snapshot.eligibleRCount+'/'+snapshot.closedCount+' closed; missing eligible R: '+snapshot.missingRCount+'.',
    'Sum of eligible net R: '+(snapshot.netR==null?'unknown':snapshot.netR.toFixed(2)+'R')+'.',
    'Audited-correction affected trades: '+snapshot.correctedTradeCount+
      '. Reported results use effective values; original event records and reasons remain in the audit history.',
    'Rule violations: '+snapshot.ruleViolationCount+'; rule status unchecked: '+snapshot.uncheckedRuleCount+'.',
    'Most frequent recorded mistake: '+(snapshot.mistakes[0]?snapshot.mistakes[0].label+' ('+snapshot.mistakes[0].count+' trades)':'none recorded')+'.',
    'Decision-time level source groups (overlapping; do not sum group samples/R): '+(levelSources.length?levelSources.map(g=>g.label+' ['+g.tradeCount+' linked trades, '+g.eligibleRCount+'/'+g.closedCount+' R eligible, '+(g.netR===null?'R unknown':g.netR.toFixed(2)+'R')+']').join('; '):'none in the selected week')+'.',
    'Decision-only events: '+(decisionContext?'NO_TRADE '+decisionContext.noTrade+'; MISSED '+decisionContext.missed+'.':'unavailable in this trade-only summary.') ,
    'Suggested review action (not proven trading advice): '+(decisionContext?.action??snapshot.action),
    'Record an approved personal action separately; this read-only summary does not save a review event.',
  ].join('\n');
}
