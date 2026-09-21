import { Module } from '@nestjs/common';
import { ExecutionModule } from '../execution/execution.module';
import { AssessmentAttemptModule } from '../assessment-attempt/assessment-attempt.module';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { QuestionModule } from '../question/question.module';
import { CreateSubmissionUseCase } from './application/create-submission.use-case';
import { ExecuteSubmissionUseCase } from './application/execute-submission.use-case';
import { GetSubmissionResultsUseCase } from './application/get-submission-results.use-case';
import { RunCodeUseCase } from './application/run-code.use-case';
import { SUBMISSION_REPOSITORY } from './domain/submission.repository';
import { TEST_RESULT_REPOSITORY } from './domain/test-result.repository';
import { PrismaSubmissionRepository } from './infrastructure/prisma-submission.repository';
import { PrismaTestResultRepository } from './infrastructure/prisma-test-result.repository';
import { SubmissionController } from './presentation/submission.controller';
import { CodeRunController } from './presentation/code-run.controller';
import { CodeQualityModule } from '../code-quality/code-quality.module';

@Module({
  imports: [QuestionModule, ExecutionModule, EvaluationModule, AssessmentAttemptModule, CodeQualityModule],
  controllers: [SubmissionController, CodeRunController],
  providers: [
    CreateSubmissionUseCase,
    ExecuteSubmissionUseCase,
    GetSubmissionResultsUseCase,
    RunCodeUseCase,
    PrismaSubmissionRepository,
    PrismaTestResultRepository,
    {
      provide: SUBMISSION_REPOSITORY,
      useExisting: PrismaSubmissionRepository,
    },
    {
      provide: TEST_RESULT_REPOSITORY,
      useExisting: PrismaTestResultRepository,
    },
  ],
  exports: [SUBMISSION_REPOSITORY, TEST_RESULT_REPOSITORY],
})
export class SubmissionModule {}
