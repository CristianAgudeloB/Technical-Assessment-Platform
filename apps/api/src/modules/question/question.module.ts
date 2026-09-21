import { forwardRef, Module } from '@nestjs/common';
import { AssessmentModule } from '../assessment/assessment.module';
import { CreateQuestionUseCase } from './application/create-question.use-case';
import { GetQuestionUseCase } from './application/get-question.use-case';
import { ListAssessmentQuestionsUseCase } from './application/list-assessment-questions.use-case';
import { UpdateQuestionUseCase } from './application/update-question.use-case';
import { QUESTION_REPOSITORY } from './domain/question.repository';
import { PrismaQuestionRepository } from './infrastructure/prisma-question.repository';
import { AssessmentQuestionController } from './presentation/assessment-question.controller';
import { QuestionController } from './presentation/question.controller';
import { AssignmentModule } from '../assignment/assignment.module';

@Module({
  imports: [forwardRef(() => AssessmentModule), forwardRef(() => AssignmentModule)],
  controllers: [AssessmentQuestionController, QuestionController],
  providers: [
    CreateQuestionUseCase,
    GetQuestionUseCase,
    ListAssessmentQuestionsUseCase,
    UpdateQuestionUseCase,
    PrismaQuestionRepository,
    {
      provide: QUESTION_REPOSITORY,
      useExisting: PrismaQuestionRepository,
    },
  ],
  exports: [QUESTION_REPOSITORY],
})
export class QuestionModule {}
