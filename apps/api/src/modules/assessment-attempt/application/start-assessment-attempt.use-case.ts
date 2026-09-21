import { Inject, Injectable } from '@nestjs/common';
import {
  AssessmentAssignmentUnavailableError,
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
import {
  ASSESSMENT_ASSIGNMENT_REPOSITORY,
  AssessmentAssignmentRepository,
} from '../../assignment/domain/assessment-assignment.repository';

@Injectable()
export class StartAssessmentAttemptUseCase {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
    @Inject(ASSESSMENT_ATTEMPT_REPOSITORY)
    private readonly attemptRepository: AssessmentAttemptRepository,
    @Inject(ASSESSMENT_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: AssessmentAssignmentRepository,
  ) {}

  async execute(assessmentId: string, userId: string): Promise<AssessmentAttempt> {
    const assessment = await this.assessmentRepository.findById(assessmentId);

    if (!assessment) {
      throw new EntityNotFoundError('Assessment', assessmentId);
    }

    if (assessment.status !== AssessmentStatus.PUBLISHED) {
      throw new AssessmentNotPublishedError(assessment.id);
    }

    if (!(await this.assignmentRepository.findAvailable(userId, assessmentId))) {
      throw new AssessmentAssignmentUnavailableError(assessmentId);
    }

    const existingAttempt = await this.attemptRepository.findLatestActiveByAssessmentAndUser(
      assessmentId,
      userId,
    );

    if (existingAttempt && existingAttempt.expiresAt > new Date()) {
      return existingAttempt;
    }

    if (existingAttempt) {
      await this.attemptRepository.expireIfDue(existingAttempt.id, new Date());
    }

    const completedAttempt = await this.attemptRepository.findLatestCompletedByAssessmentAndUser(
      assessmentId,
      userId,
    );
    if (completedAttempt) {
      return completedAttempt;
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + assessment.durationMinutes * 60_000);

    return this.attemptRepository.create({ assessmentId, userId, startedAt, expiresAt });
  }
}
