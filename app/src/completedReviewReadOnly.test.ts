import { describe, expect, it } from 'vitest';
import { completedReviewReadOnlyRows } from './completedReviewReadOnly';
import type { TradeReview, TradeRuleCheck } from './services/localApi';

const completed = (trade_id: string, overrides: Partial<TradeReview> = {}): TradeReview => ({
  review_id: 'review-' + trade_id,
  trade_id,
  status: 'COMPLETED',
  decision_quality: 'A',
  execution_quality: 'GOOD',
  management_quality: 'GOOD',
  exit_reason_code: 'STOP',
  emotion_affected: false,
  mistake_type_ids: [],
  completed_at: '2026-11-22T12:00:00Z',
  ...overrides,
});
const check = (trade_id: string, any_violation: boolean): TradeRuleCheck => ({
  trade_rule_check_id: 'check-' + trade_id,
  trade_id,
  any_violation,
  violated_rule_version_ids: any_violation ? ['rule-v1'] : [],
  checked_at: '2026-11-22T12:00:00Z',
});

const asMap = (trade: TradeReview, rule: TradeRuleCheck | null = null) =>
  Object.fromEntries(completedReviewReadOnlyRows(trade, rule, [], []).map(x => [x.label, x.value]));

describe('completed trade Review read-only presentation', () => {
  it('keeps process quality independent from trade financial outcome', () => {
    const good = asMap(completed('losing'));
    const weak = asMap(completed('winning', { decision_quality: 'C', management_quality: 'NEEDS_IMPROVEMENT', exit_reason_code: 'TARGET' }));
    expect(good['Decision quality']).toBe('A');
    expect(weak['Decision quality']).toBe('C');
    expect(weak['Management']).toBe('NEEDS IMPROVEMENT');
    expect(weak['Exit reason']).toBe('TARGET');
  });
  it('does not convert absent answers into No, Good or zeros', () => {
    const result = asMap(completed('trade', {
      execution_quality: null, management_quality: null, exit_reason_code: null,
      decision_quality: null, emotion_affected: null, completed_at: null,
    }));
    expect(result['Emotion affected trade']).toBe('Not recorded');
    expect(result['Rule broken']).toBe('Not recorded');
    expect(result['Execution']).toBe('Not recorded');
    expect(result['Completed at']).toBe('Not recorded');
  });
  it('reveals conditional psychology only for an affirmative emotion response', () => {
    const yes = asMap(completed('trade', {emotion_affected: true, psychology_state: 'FEAR', psychology_stage: 'ENTRY', psychology_intensity: 4}));
    expect(yes['Intensity (1–5)']).toBe('4');
    expect(yes['Affected stage']).toBe('ENTRY');
    expect(asMap(completed('trade'))['Intensity (1–5)']).toBeUndefined();
  });
  it('uses persisted rule and mistake references rather than guessed labels', () => {
    const result = Object.fromEntries(completedReviewReadOnlyRows(
      completed('trade', { mistake_type_ids: ['m1'] }),
      check('trade', true),
      [{ rule_id: 'r1', rule_version_id: 'rule-v1', code: 'DISCIPLINE', label: 'Stay within risk', scope: 'TRADE', version_label: 'v1' }],
      [{ mistake_type_id: 'm1', code: 'EARLY', label: 'Early Entry', mistake_group: 'ENTRY' }],
    ).map(x => [x.label, x.value]));
    expect(result['Rule broken']).toBe('Yes');
    expect(result['Violated rule versions']).toBe('Stay within risk (v1)');
    expect(result['Mistakes']).toBe('Early Entry');
  });
  it('does not leak fields from previously selected trade into another trade', () => {
    expect(asMap(completed('first', { decision_quality: 'C' }))['Decision quality']).toBe('C');
    expect(asMap(completed('second', { decision_quality: 'A' }))['Decision quality']).toBe('A');
  });
});
