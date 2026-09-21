import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { AssessmentAttemptModule } from './modules/assessment-attempt/assessment-attempt.module';
import { AssessmentResultModule } from './modules/assessment-result/assessment-result.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { QuestionModule } from './modules/question/question.module';
import { SubmissionModule } from './modules/submission/submission.module';
import { PrismaModule } from './shared/infrastructure/database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AssignmentModule } from './modules/assignment/assignment.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AssignmentModule,
    AssessmentModule,
    AssessmentAttemptModule,
    AssessmentResultModule,
    QuestionModule,
    SubmissionModule,
    ExecutionModule,
    EvaluationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
