import { Module } from '@nestjs/common';
import { AssessmentAttemptModule } from '../assessment-attempt/assessment-attempt.module';
import { QuestionModule } from '../question/question.module';
import { SubmissionModule } from '../submission/submission.module';
import { GetAssessmentResultUseCase } from './application/get-assessment-result.use-case';
import { AssessmentResultController } from './presentation/assessment-result.controller';

@Module({
  imports: [AssessmentAttemptModule, QuestionModule, SubmissionModule],
  controllers: [AssessmentResultController],
  providers: [GetAssessmentResultUseCase],
})
export class AssessmentResultModule {}
