import type {JournalTradeRow} from './services/localApi';

/** A read-only, manual-review candidate from one existing recorded Trade.
 * It is NOT a saved/versioned Setup Playbook and never invents prerequisites,
 * indicators, entry triggers, regime, or proven edge from P&L.
 */
export function setupPlaybookCandidate(row:JournalTradeRow):string {
  if(row.status!=='CLOSED')throw new Error('A Playbook candidate requires a closed recorded Trade.');
  const clean=(v:string)=>v.replace(/[\r\n\t]+/g,' ').trim()||'Not recorded';
  const sources=row.level_source_snapshot_missing
    ? 'UNKNOWN: decision-time source snapshot missing'
    : row.level_sources.length?row.level_sources.map(clean).join('; '):'Not recorded';
  return [
    'PTJ — Setup Playbook candidate (DRAFT ONLY; NOT a validated edge)',
    'Source Trade ID: '+row.trade_id,
    'Source Session ID: '+row.session_id,
    'Trade date / instrument / side: '+clean(row.session_date)+' / '+clean(row.instrument_symbol)+' / '+clean(row.direction),
    'Source Zone label: '+clean(row.candidate_label??''),
    'Decision-time level sources: '+sources,
    'Recorded decision quality: '+clean(row.decision_quality??''),
    'Recorded rule status: '+clean(row.rule_status),
    'Recorded mistakes: '+(row.mistakes.length?row.mistakes.map(clean).join('; '):'None recorded'),
    'Net R: '+(row.realized_r!=null&&Number.isFinite(row.realized_r)?row.realized_r.toFixed(2)+' R':'UNKNOWN (do not assume zero)'),
    'Audited correction events: '+(row.audited_correction_count??0),
    'Setup identity / version: NOT YET DEFINED — human review required',
    'Market context / regime: NOT RECORDED in this candidate summary',
    'Prerequisite conditions: NOT RECORDED — do not infer',
    'Trigger at decision time: NOT RECORDED — inspect original observation timeline',
    'Supporting evidence: NOT RECORDED here — inspect source timestamps/screenshots',
    'Contrary / veto evidence: NOT RECORDED — do not infer absence',
    'Thesis invalidation: NOT RECORDED — do not invent from the stop',
    'Action: Review evidence and plan snapshots, then explicitly approve a versioned Setup definition.',
    'This text is a read-only draft based on the saved record; it does not update a Trade, a Setup or the database.',
  ].join('\n');
}
