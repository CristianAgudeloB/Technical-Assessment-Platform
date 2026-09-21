import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../../shared/domain/errors/domain-errors';
import { ASSESSMENT_REPOSITORY, AssessmentRepository } from '../../assessment/domain/assessment.repository';
import { UserRole } from '../../auth/domain/user';
import { USER_REPOSITORY, UserRepository } from '../../auth/domain/user.repository';
import {
  ASSESSMENT_ASSIGNMENT_REPOSITORY,
  AssessmentAssignmentRepository,
} from '../domain/assessment-assignment.repository';

@Injectable()
export class UnassignAssessmentUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
    @Inject(ASSESSMENT_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: AssessmentAssignmentRepository,
  ) {}

  async execute(candidateId: string, assessmentId: string): Promise<void> {
    const [candidate, assessment] = await Promise.all([
      this.userRepository.findById(candidateId),
      this.assessmentRepository.findById(assessmentId),
    ]);

    if (!candidate || candidate.role !== UserRole.CANDIDATE) {
      throw new EntityNotFoundError('Candidate', candidateId);
    }

    if (!assessment) {
      throw new EntityNotFoundError('Assessment', assessmentId);
    }

    await this.assignmentRepository.unassign(candidateId, assessmentId);
  }
}
