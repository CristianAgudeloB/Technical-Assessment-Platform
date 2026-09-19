import { Inject, Injectable } from '@nestjs/common';
import {
  AssessmentAttemptExpiredError,
  AssessmentAttemptNotForAssessmentError,
} from '../../../shared/domain/errors/domain-errors';
import { EntityNotFoundError } from '../../../shared/domain/errors/domain-errors';
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
  ) {}

  async assertActive(attemptId: string, assessmentId: string): Promise<AssessmentAttempt> {
    const attempt = await this.attemptRepository.findById(attemptId);

    if (!attempt) {
      throw new EntityNotFoundError('Assessment attempt', attemptId);
    }

    if (attempt.assessmentId !== assessmentId) {
      throw new AssessmentAttemptNotForAssessmentError(attemptId, assessmentId);
    }

    const now = new Date();
    if (attempt.status === AssessmentAttemptStatus.EXPIRED || attempt.expiresAt <= now) {
      await this.attemptRepository.expireIfDue(attempt.id, now);
      throw new AssessmentAttemptExpiredError(attempt.id);
    }

    return attempt;
  }

  async reserveSubmissionSlot(
    attemptId: string,
    assessmentId: string,
    maximum: number,
  ): Promise<boolean> {
    await this.assertActive(attemptId, assessmentId);
    return this.attemptRepository.reserveSubmissionSlot(attemptId, maximum, new Date());
  }

  releaseSubmissionSlot(attemptId: string): Promise<void> {
    return this.attemptRepository.releaseSubmissionSlot(attemptId);
  }
}
