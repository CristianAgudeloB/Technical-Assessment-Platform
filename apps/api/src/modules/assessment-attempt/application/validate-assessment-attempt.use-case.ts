import { Inject, Injectable } from '@nestjs/common';
import {
  AssessmentAttemptCompletedError,
  AssessmentAttemptExpiredError,
  AssessmentAttemptNotForAssessmentError,
  AssessmentAssignmentUnavailableError,
  EntityNotFoundError,
} from '../../../shared/domain/errors/domain-errors';
import {
  ASSESSMENT_ASSIGNMENT_REPOSITORY,
  AssessmentAssignmentRepository,
} from '../../assignment/domain/assessment-assignment.repository';
import {
  ASSESSMENT_ATTEMPT_REPOSITORY,
  AssessmentAttemptRepository,
} from '../domain/assessment-attempt.repository';
import { AssessmentAttempt, AssessmentAttemptStatus } from '../domain/assessment-attempt';

@Injectable()
export class ValidateAssessmentAttemptUseCase {
  constructor(
    @Inject(ASSESSMENT_ATTEMPT_REPOSITORY)
    private readonly attemptRepository: AssessmentAttemptRepository,
    @Inject(ASSESSMENT_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: AssessmentAssignmentRepository,
  ) {}

  async assertActive(attemptId: string, assessmentId: string, userId: string): Promise<AssessmentAttempt> {
    const attempt = await this.attemptRepository.findById(attemptId);

    if (!attempt) {
      throw new EntityNotFoundError('Assessment attempt', attemptId);
    }

    if (attempt.assessmentId !== assessmentId) {
      throw new AssessmentAttemptNotForAssessmentError(attemptId, assessmentId);
    }

    if (attempt.userId !== userId) {
      throw new EntityNotFoundError('Assessment attempt', attemptId);
    }

    if (!(await this.assignmentRepository.findAvailable(userId, assessmentId))) {
      throw new AssessmentAssignmentUnavailableError(assessmentId);
    }

    const now = new Date();
    if (attempt.status === AssessmentAttemptStatus.EXPIRED || attempt.expiresAt <= now) {
      await this.attemptRepository.expireIfDue(attempt.id, now);
      throw new AssessmentAttemptExpiredError(attempt.id);
    }

    if (attempt.status === AssessmentAttemptStatus.COMPLETED) {
      throw new AssessmentAttemptCompletedError(attempt.id);
    }

    return attempt;
  }

  async reserveSubmissionSlot(
    attemptId: string,
    assessmentId: string,
    userId: string,
    maximum: number,
  ): Promise<boolean> {
    await this.assertActive(attemptId, assessmentId, userId);
    return this.attemptRepository.reserveSubmissionSlot(attemptId, maximum, new Date());
  }

  releaseSubmissionSlot(attemptId: string): Promise<void> {
    return this.attemptRepository.releaseSubmissionSlot(attemptId);
  }
}
