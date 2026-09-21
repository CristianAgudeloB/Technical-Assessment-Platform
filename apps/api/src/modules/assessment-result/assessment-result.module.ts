import { Module } from '@nestjs/common';
import { AssessmentAttemptModule } from '../assessment-attempt/assessment-attempt.module';
import { QuestionModule } from '../question/question.module';
import { SubmissionModule } from '../submission/submission.module';
import { GetAssessmentResultUseCase } from './application/get-assessment-result.use-case';
import { GetAdminAssessmentResultDetailUseCase } from './application/get-admin-assessment-result-detail.use-case';
import { ListAdminAssessmentResultsUseCase } from './application/list-admin-assessment-results.use-case';
import { AdminAssessmentResultController } from './presentation/admin-assessment-result.controller';
import { AssessmentResultController } from './presentation/assessment-result.controller';

@Module({
  imports: [AssessmentAttemptModule, QuestionModule, SubmissionModule],
  controllers: [AssessmentResultController, AdminAssessmentResultController],
  providers: [GetAssessmentResultUseCase, GetAdminAssessmentResultDetailUseCase, ListAdminAssessmentResultsUseCase],
})
export class AssessmentResultModule {}
