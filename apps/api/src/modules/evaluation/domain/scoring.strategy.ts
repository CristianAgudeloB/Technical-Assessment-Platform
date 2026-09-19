export type ScorableTestResult = {
  passed: boolean;
};

export const SCORING_STRATEGY = Symbol('SCORING_STRATEGY');

export interface ScoringStrategy {
  calculate(results: readonly ScorableTestResult[]): number;
}
