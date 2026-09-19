import { Injectable } from '@nestjs/common';
import {
  ScorableTestResult,
  ScoringStrategy,
} from '../domain/scoring.strategy';

@Injectable()
export class PercentageScoringStrategy implements ScoringStrategy {
  calculate(results: readonly ScorableTestResult[]): number {
    if (results.length === 0) {
      return 0;
    }

    const passed = results.filter((result) => result.passed).length;
    return Math.round((passed / results.length) * 10_000) / 100;
  }
}
