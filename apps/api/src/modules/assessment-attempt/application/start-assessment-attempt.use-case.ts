import { Inject, Injectable } from '@nestjs/common';
import {
  AssessmentNotPublishedError,
  EntityNotFoundError,
} from '../../../shared/domain/errors/domain-errors';
import { AssessmentStatus } from '../../assessment/domain/assessment';
import {
  ASSESSMENT_REPOSITORY,
  AssessmentRepository,
} from '../../assessment/domain/assessment.repository';
import {
  ASSESSMENT_ATTEMPT_REPOSITORY,
  AssessmentAttemptRepository,
} from '../domain/assessment-attempt.repository';
import { AssessmentAttempt } from '../domain/assessment-attempt';

@Injectable()
export class StartAssessmentAttemptUseCase {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
    @Inject(ASSESSMENT_ATTEMPT_REPOSITORY)
    private readonly attemptRepository: AssessmentAttemptRepository,
  ) {}

  async execute(assessmentId: string): Promise<AssessmentAttempt> {
    const assessment = await this.assessmentRepository.findById(assessmentId);

    if (!assessment) {
      throw new EntityNotFoundError('Assessment', assessmentId);
    }

    if (assessment.status !== AssessmentStatus.PUBLISHED) {
      throw new AssessmentNotPublishedError(assessment.id);
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + assessment.durationMinutes * 60_000);

    return this.attemptRepository.create({ assessmentId, startedAt, expiresAt });
  }
}
