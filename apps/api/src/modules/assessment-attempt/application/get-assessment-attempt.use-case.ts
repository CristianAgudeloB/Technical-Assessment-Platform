import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../../shared/domain/errors/domain-errors';
import {
  ASSESSMENT_ATTEMPT_REPOSITORY,
  AssessmentAttemptRepository,
} from '../domain/assessment-attempt.repository';
import { AssessmentAttempt } from '../domain/assessment-attempt';

@Injectable()
export class GetAssessmentAttemptUseCase {
  constructor(
    @Inject(ASSESSMENT_ATTEMPT_REPOSITORY)
    private readonly attemptRepository: AssessmentAttemptRepository,
  ) {}

  async execute(assessmentId: string, attemptId: string, userId: string): Promise<AssessmentAttempt> {
    const attempt = await this.attemptRepository.findById(attemptId);

    if (!attempt || attempt.assessmentId !== assessmentId || attempt.userId !== userId) {
      throw new EntityNotFoundError('Assessment attempt', attemptId);
    }

    await this.attemptRepository.expireIfDue(attempt.id, new Date());
    return (await this.attemptRepository.findById(attempt.id)) ?? attempt;
  }
}
