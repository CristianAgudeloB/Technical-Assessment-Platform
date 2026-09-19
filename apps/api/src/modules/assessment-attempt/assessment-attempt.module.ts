import { Module } from '@nestjs/common';
import { AssessmentModule } from '../assessment/assessment.module';
import { GetAssessmentAttemptUseCase } from './application/get-assessment-attempt.use-case';
import { StartAssessmentAttemptUseCase } from './application/start-assessment-attempt.use-case';
import { ValidateAssessmentAttemptUseCase } from './application/validate-assessment-attempt.use-case';
import { ASSESSMENT_ATTEMPT_REPOSITORY } from './domain/assessment-attempt.repository';
import { PrismaAssessmentAttemptRepository } from './infrastructure/prisma-assessment-attempt.repository';
import { AssessmentAttemptController } from './presentation/assessment-attempt.controller';

@Module({
  imports: [AssessmentModule],
  controllers: [AssessmentAttemptController],
  providers: [
    GetAssessmentAttemptUseCase,
    StartAssessmentAttemptUseCase,
    ValidateAssessmentAttemptUseCase,
    PrismaAssessmentAttemptRepository,
    {
      provide: ASSESSMENT_ATTEMPT_REPOSITORY,
      useExisting: PrismaAssessmentAttemptRepository,
    },
  ],
  exports: [ASSESSMENT_ATTEMPT_REPOSITORY, ValidateAssessmentAttemptUseCase],
})
export class AssessmentAttemptModule {}
