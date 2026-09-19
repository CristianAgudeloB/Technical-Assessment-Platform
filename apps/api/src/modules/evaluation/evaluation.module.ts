import { Module } from '@nestjs/common';
import { EvaluateExecutionResultUseCase } from './application/evaluate-execution-result.use-case';
import { PercentageScoringStrategy } from './application/percentage-scoring.strategy';
import { SCORING_STRATEGY } from './domain/scoring.strategy';

@Module({
  providers: [
    EvaluateExecutionResultUseCase,
    PercentageScoringStrategy,
    {
      provide: SCORING_STRATEGY,
      useExisting: PercentageScoringStrategy,
    },
  ],
  exports: [EvaluateExecutionResultUseCase, SCORING_STRATEGY],
})
export class EvaluationModule {}
