import type { MistakeType, RuleItem, TradeReview, TradeRuleCheck } from './services/localApi';
import { completedReviewReadOnlyRows } from './completedReviewReadOnly';

type Props = Readonly<{
  review: TradeReview;
  ruleCheck: TradeRuleCheck | null;
  rules: readonly RuleItem[];
  mistakes: readonly MistakeType[];
}>;

/** A completed review is never reopened for editing. This surface reads persisted values only. */
export function CompletedReviewReadOnly({ review, ruleCheck, rules, mistakes }: Props) {
  if (review.status !== 'COMPLETED') return null;
  return (
    <section aria-label="Completed trade review — read only" className="completedReviewReadOnly">
      <p className="subtle">Review completed and locked. The saved assessment below is read-only.</p>
      <dl className="formGrid">
        {completedReviewReadOnlyRows(review, ruleCheck, rules, mistakes).map(row => (
          <div className="decisionHistory" key={row.label}>
            <dt><strong>{row.label}</strong></dt>
            <dd style={{ marginInlineStart: 0, overflowWrap: 'anywhere' }}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
