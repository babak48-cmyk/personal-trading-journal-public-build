import type { MistakeType, RuleItem, TradeReview, TradeRuleCheck } from './services/localApi';

export type CompletedReviewReadOnlyRow = Readonly<{ label: string; value: string }>;

const known = (value: string | null | undefined): string =>
  value && value.trim() ? value.replaceAll('_', ' ') : 'Not recorded';

const yesNo = (value: boolean | null | undefined): string =>
  value === true ? 'Yes' : value === false ? 'No' : 'Not recorded';

/** Present persisted values only. Never infer quality from realized P&L or a missing response. */
export function completedReviewReadOnlyRows(
  review: TradeReview,
  ruleCheck: TradeRuleCheck | null,
  rules: readonly RuleItem[],
  mistakes: readonly MistakeType[],
): CompletedReviewReadOnlyRow[] {
  const rows: CompletedReviewReadOnlyRow[] = [
    { label: 'Decision quality', value: known(review.decision_quality) },
    { label: 'Execution', value: known(review.execution_quality) },
    { label: 'Management', value: known(review.management_quality) },
    { label: 'Exit reason', value: known(review.exit_reason_code) },
    { label: 'Emotion affected trade', value: yesNo(review.emotion_affected) },
  ];
  if (review.emotion_affected === true) {
    rows.push(
      { label: 'Psychology state', value: known(review.psychology_state) },
      { label: 'Affected stage', value: known(review.psychology_stage) },
      { label: 'Intensity (1–5)', value: review.psychology_intensity == null ? 'Not recorded' : String(review.psychology_intensity) },
    );
  }
  rows.push({ label: 'Rule broken', value: ruleCheck ? yesNo(ruleCheck.any_violation) : 'Not recorded' });
  if (ruleCheck?.any_violation === true) {
    rows.push({
      label: 'Violated rule versions',
      value: ruleCheck.violated_rule_version_ids.length
        ? ruleCheck.violated_rule_version_ids.map(id => {
            const rule = rules.find(item => item.rule_version_id === id);
            return rule ? `${rule.label} (${rule.version_label})` : `Rule version ${id}`;
          }).join(', ')
        : 'Not recorded',
    });
    rows.push({ label: 'Rule note', value: known(ruleCheck.note) });
  }
  rows.push({
    label: 'Mistakes',
    value: review.mistake_type_ids.length
      ? review.mistake_type_ids.map(id => mistakes.find(item => item.mistake_type_id === id)?.label ?? `Mistake ${id}`).join(', ')
      : 'None recorded',
  });
  rows.push(
    { label: 'Exit note', value: known(review.exit_reason_note) },
    { label: 'Review note', value: known(review.note) },
    { label: 'Completed at', value: known(review.completed_at) },
  );
  return rows;
}
