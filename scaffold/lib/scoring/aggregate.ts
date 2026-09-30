export interface ScoredRequirement {
  /** 0-100 AI score for one requirement. */
  score: number;
  /** User-adjustable importance weight for that requirement, >= 0. */
  weight: number;
}

/**
 * Weighted-average aggregate score across an applicant's per-requirement scores.
 * A requirement weighted 0 contributes nothing (effectively excluded). If every
 * requirement is weighted 0 (or there are no requirements at all), falls back to
 * a plain average of the scores (or 0 for an empty list) rather than dividing by zero.
 */
export function aggregateScore(scores: ScoredRequirement[]): number {
  if (scores.length === 0) return 0;

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) {
    return scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  }

  const weightedSum = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
  return weightedSum / totalWeight;
}
