import { describe, expect, it } from 'vitest';
import { SESSION_REVIEW_REFLECTION_IDS, sessionReviewRequiredIssues, type SessionReviewReflections } from './sessionReviewValidation';

const empty = Object.fromEntries(SESSION_REVIEW_REFLECTION_IDS.map(id=>[id,''])) as Record<keyof SessionReviewReflections,string>;

describe('Session Review completion requirements', () => {
  it('leaves all reflections optional by default', () => {
    expect(sessionReviewRequiredIssues({},empty)).toEqual([]);
  });
  it.each(SESSION_REVIEW_REFLECTION_IDS)('reports missing required %s with a usable label', id => {
    const issues=sessionReviewRequiredIssues({[id]:true},empty);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe(id);
    expect(issues[0].label.length).toBeGreaterThan(3);
  });
  it('treats whitespace-only answers as missing, and accepts genuine text', () => {
    const id='sessionReview.wentWell';
    expect(sessionReviewRequiredIssues({[id]:true},{...empty,[id]:'  \n  '})).toHaveLength(1);
    expect(sessionReviewRequiredIssues({[id]:true},{...empty,[id]:'I kept my risk limit'})).toEqual([]);
  });
  it('accepts actual select ratings, but not the blank placeholder when required', () => {
    const id='sessionReview.discipline';
    expect(sessionReviewRequiredIssues({[id]:true},{...empty,[id]:''})).toHaveLength(1);
    expect(sessionReviewRequiredIssues({[id]:true},{...empty,[id]:'GOOD'})).toEqual([]);
  });
  it('reports only required unanswered fields, not optional ones', () => {
    expect(sessionReviewRequiredIssues({
      'sessionReview.wentWell':true,
      'sessionReview.biggestMistake':true,
    },{...empty,'sessionReview.wentWell':'Followed plan'}).map(issue=>issue.id))
      .toEqual(['sessionReview.biggestMistake']);
  });
});
