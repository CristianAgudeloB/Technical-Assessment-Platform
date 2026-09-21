import { Inject, Injectable } from '@nestjs/common';
import {
  ASSESSMENT_ATTEMPT_REPOSITORY,
  AssessmentAttemptRepository,
} from '../../assessment-attempt/domain/assessment-attempt.repository';
import {
  AdminAssessmentResult,
  AssessmentAttemptStatus,
} from '../../assessment-attempt/domain/assessment-attempt';
import { calculateAssessmentProgress } from '../../evaluation/application/calculate-assessment-progress';
import { QUESTION_REPOSITORY, QuestionRepository } from '../../question/domain/question.repository';
import { SUBMISSION_REPOSITORY, SubmissionRepository } from '../../submission/domain/submission.repository';

@Injectable()
export class ListAdminAssessmentResultsUseCase {
  constructor(
    @Inject(ASSESSMENT_ATTEMPT_REPOSITORY)
    private readonly attemptRepository: AssessmentAttemptRepository,
    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
    @Inject(SUBMISSION_REPOSITORY)
    private readonly submissionRepository: SubmissionRepository,
  ) {}

  async execute(): Promise<AdminAssessmentResult[]> {
    const results = await this.attemptRepository.findResultsForAdmin();

    await Promise.all(results.map((result) => this.completeFinishedAttempt(result)));

    return this.attemptRepository.findResultsForAdmin();
  }

  private async completeFinishedAttempt(result: AdminAssessmentResult): Promise<void> {
    if (result.status !== AssessmentAttemptStatus.ACTIVE) {
      return;
    }

    const [attempt, questions, submissions] = await Promise.all([
      this.attemptRepository.findById(result.id),
      this.questionRepository.findByAssessmentId(result.assessment.id),
      this.submissionRepository.findEvaluatedByAttemptId(result.id),
    ]);

    if (!attempt || attempt.status !== AssessmentAttemptStatus.ACTIVE || questions.length === 0) {
      return;
    }

    const progress = calculateAssessmentProgress(questions, submissions);
    if (progress.questionsPending > 0) {
      return;
    }

    const completedAt = latestSubmissionAt(submissions) ?? attempt.updatedAt;
    await this.attemptRepository.complete(result.id, completedAt, {
      score: progress.score,
      completedQuestions: progress.completedQuestions,
      questionsCorrect: progress.questionsCorrect,
      questionsIncorrect: progress.questionsIncorrect,
      timeConsumedSeconds: elapsedSeconds(attempt.startedAt, completedAt, attempt.expiresAt),
    });
  }
}

function latestSubmissionAt(submissions: Array<{ submittedAt: Date | null }>): Date | null {
  return submissions.reduce<Date | null>(
    (latest, submission) =>
      !submission.submittedAt || (latest && latest >= submission.submittedAt) ? latest : submission.submittedAt,
    null,
  );
}

function elapsedSeconds(startedAt: Date, endedAt: Date, expiresAt: Date): number {
  return Math.max(0, Math.floor((Math.min(endedAt.getTime(), expiresAt.getTime()) - startedAt.getTime()) / 1_000));
}
