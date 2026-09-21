import { Inject, Injectable } from '@nestjs/common';
import {
  ASSESSMENT_ATTEMPT_REPOSITORY,
  AssessmentAttemptRepository,
} from '../domain/assessment-attempt.repository';
import { AssessmentAttempt } from '../domain/assessment-attempt';

@Injectable()
export class GetCurrentAssessmentAttemptUseCase {
  constructor(
    @Inject(ASSESSMENT_ATTEMPT_REPOSITORY)
    private readonly attemptRepository: AssessmentAttemptRepository,
  ) {}

  async execute(assessmentId: string, userId: string): Promise<AssessmentAttempt | null> {
    const attempt = await this.attemptRepository.findLatestActiveByAssessmentAndUser(
      assessmentId,
      userId,
    );

    if (attempt && attempt.expiresAt <= new Date()) {
      await this.attemptRepository.expireIfDue(attempt.id, new Date());
    } else if (attempt) {
      return attempt;
    }

    return this.attemptRepository.findLatestCompletedByAssessmentAndUser(assessmentId, userId);
  }
}
