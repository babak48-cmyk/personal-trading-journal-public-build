import type {JournalTradeRow, MistakeSummary} from './services/localApi';

/** ISO-8601 Monday based on the journal's recorded session DATE, never the OS timezone. */
export function journalWeekStart(sessionDate:string):string|null{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate))return null;
  const day=new Date(sessionDate+'T00:00:00Z');
  if(!Number.isFinite(day.getTime())||day.toISOString().slice(0,10)!==sessionDate)return null;
  day.setUTCDate(day.getUTCDate()-((day.getUTCDay()+6)%7));
  return day.toISOString().slice(0,10);
}

export type WeeklyLearningSnapshot=Readonly<{
  weekStart:string;
  tradeCount:number;
  closedCount:number;
  openCount:number;
  eligibleRCount:number;
  missingRCount:number;
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
    eligibleRCount:eligible.length,missingRCount,
    netR:eligible.length?eligible.reduce((total,row)=>total+(row.realized_r as number),0):null,
    ruleViolationCount:violated,uncheckedRuleCount:unchecked,mistakes,
    observation,action,scope:'FILTERED_TRADES_ONLY',
  };
}

export function journalWeeks(rows:readonly JournalTradeRow[]):string[]{
  return [...new Set(rows.map(row=>journalWeekStart(row.session_date)).filter((x):x is string=>x!==null))].sort().reverse();
}

export function weeklyLearningText(snapshot:WeeklyLearningSnapshot):string{
  return [
    'PTJ weekly learning — week of '+snapshot.weekStart,
    'Scope: filtered recorded trades ONLY; does not include NO_TRADE/MISSED decisions without trade records.',
    'Trades: '+snapshot.tradeCount+'; closed: '+snapshot.closedCount+'; open/other: '+snapshot.openCount+'.',
    'Net R eligible: '+snapshot.eligibleRCount+'/'+snapshot.closedCount+' closed; missing eligible R: '+snapshot.missingRCount+'.',
    'Sum of eligible net R: '+(snapshot.netR==null?'unknown':snapshot.netR.toFixed(2)+'R')+'.',
    'Rule violations: '+snapshot.ruleViolationCount+'; rule status unchecked: '+snapshot.uncheckedRuleCount+'.',
    'Most frequent recorded mistake: '+(snapshot.mistakes[0]?snapshot.mistakes[0].label+' ('+snapshot.mistakes[0].count+' trades)':'none recorded')+'.',
    'Suggested review action (not proven trading advice): '+snapshot.action,
    'Record an approved personal action separately; this read-only summary does not save a review event.',
  ].join('\n');
}
