import { Inject, Injectable } from '@nestjs/common';
import {
  AssignmentAvailabilityWindowError,
  AssessmentNotPublishedError,
  EntityNotFoundError,
} from '../../../shared/domain/errors/domain-errors';
import { ASSESSMENT_REPOSITORY, AssessmentRepository } from '../../assessment/domain/assessment.repository';
import { AssessmentStatus } from '../../assessment/domain/assessment';
import { USER_REPOSITORY, UserRepository } from '../../auth/domain/user.repository';
import { UserRole } from '../../auth/domain/user';
import {
  ASSESSMENT_ASSIGNMENT_REPOSITORY,
  AssessmentAssignmentRepository,
} from '../domain/assessment-assignment.repository';
import { AssessmentAssignment } from '../domain/assessment-assignment';

@Injectable()
export class AssignAssessmentUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
    @Inject(ASSESSMENT_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: AssessmentAssignmentRepository,
  ) {}

  async execute(
    candidateId: string,
    assessmentId: string,
    availableFrom: Date,
    availableUntil: Date,
  ): Promise<AssessmentAssignment> {
    if (availableFrom >= availableUntil) {
      throw new AssignmentAvailabilityWindowError();
    }

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

    if (assessment.status !== AssessmentStatus.PUBLISHED) {
      throw new AssessmentNotPublishedError(assessmentId);
    }

    return this.assignmentRepository.assign({
      userId: candidateId,
      assessmentId,
      availableFrom,
      availableUntil,
    });
  }
}
