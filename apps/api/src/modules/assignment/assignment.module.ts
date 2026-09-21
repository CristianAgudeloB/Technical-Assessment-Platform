import { forwardRef, Module } from '@nestjs/common';
import { AssessmentModule } from '../assessment/assessment.module';
import { AssignAssessmentUseCase } from './application/assign-assessment.use-case';
import { UnassignAssessmentUseCase } from './application/unassign-assessment.use-case';
import { ListCandidateAssignmentsUseCase } from './application/list-candidate-assignments.use-case';
import { ListCandidatesUseCase } from './application/list-candidates.use-case';
import { ASSESSMENT_ASSIGNMENT_REPOSITORY } from './domain/assessment-assignment.repository';
import { PrismaAssessmentAssignmentRepository } from './infrastructure/prisma-assessment-assignment.repository';
import { AssignmentController } from './presentation/assignment.controller';

@Module({
  imports: [forwardRef(() => AssessmentModule)],
  controllers: [AssignmentController],
  providers: [
    AssignAssessmentUseCase,
    UnassignAssessmentUseCase,
    ListCandidateAssignmentsUseCase,
    ListCandidatesUseCase,
    PrismaAssessmentAssignmentRepository,
    {
      provide: ASSESSMENT_ASSIGNMENT_REPOSITORY,
      useExisting: PrismaAssessmentAssignmentRepository,
    },
  ],
  exports: [ASSESSMENT_ASSIGNMENT_REPOSITORY],
})
export class AssignmentModule {}
