import { forwardRef, Module } from '@nestjs/common';
import { CreateAssessmentUseCase } from './application/create-assessment.use-case';
import { GetAssessmentUseCase } from './application/get-assessment.use-case';
import { ListAssessmentsUseCase } from './application/list-assessments.use-case';
import { PublishAssessmentUseCase } from './application/publish-assessment.use-case';
import { QuestionModule } from '../question/question.module';
import { ASSESSMENT_REPOSITORY } from './domain/assessment.repository';
import { PrismaAssessmentRepository } from './infrastructure/prisma-assessment.repository';
import { AssessmentController } from './presentation/assessment.controller';

@Module({
  imports: [forwardRef(() => QuestionModule)],
  controllers: [AssessmentController],
  providers: [
    CreateAssessmentUseCase,
    GetAssessmentUseCase,
    ListAssessmentsUseCase,
    PublishAssessmentUseCase,
    PrismaAssessmentRepository,
    {
      provide: ASSESSMENT_REPOSITORY,
      useExisting: PrismaAssessmentRepository,
    },
  ],
  exports: [ASSESSMENT_REPOSITORY],
})
export class AssessmentModule {}
