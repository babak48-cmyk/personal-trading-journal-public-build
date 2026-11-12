import { FIELD_DEFINITION_BY_ID, isUserRequired, type RequirementOverrides } from './fieldDefinitions';

/** Stage-specific completion gate. Draft reviews may remain incomplete. */
export const SESSION_REVIEW_REFLECTION_IDS = [
  'sessionReview.wentWell',
  'sessionReview.nextImprovement',
  'sessionReview.wentPoorly',
  'sessionReview.bestDecision',
  'sessionReview.biggestMistake',
  'sessionReview.marketLearning',
  'sessionReview.overall',
  'sessionReview.planQuality',
  'sessionReview.discipline',
] as const;
export type SessionReviewReflectionId = (typeof SESSION_REVIEW_REFLECTION_IDS)[number];
export type SessionReviewReflections = Readonly<Record<SessionReviewReflectionId,string>>;
export type SessionReviewRequiredIssue = Readonly<{id:SessionReviewReflectionId;label:string}>;

/** Whitespace-only answers do not meet a user-defined Required setting. */
export function sessionReviewRequiredIssues(
  overrides:RequirementOverrides,
  answers:SessionReviewReflections,
):SessionReviewRequiredIssue[]{
  return SESSION_REVIEW_REFLECTION_IDS.filter(id=>isUserRequired(id,overrides)&&!answers[id].trim())
    .map(id=>({id,label:FIELD_DEFINITION_BY_ID[id].label}));
}
