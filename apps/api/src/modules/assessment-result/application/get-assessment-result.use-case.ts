import { Inject, Injectable } from '@nestjs/common';
import {
  AssessmentAttemptNotForAssessmentError,
  EntityNotFoundError,
} from '../../../shared/domain/errors/domain-errors';
import {
  ASSESSMENT_ATTEMPT_REPOSITORY,
  AssessmentAttemptRepository,
} from '../../assessment-attempt/domain/assessment-attempt.repository';
import { AssessmentAttemptStatus } from '../../assessment-attempt/domain/assessment-attempt';
import { calculateAssessmentProgress } from '../../evaluation/application/calculate-assessment-progress';
import { QUESTION_REPOSITORY, QuestionRepository } from '../../question/domain/question.repository';
import { SUBMISSION_REPOSITORY, SubmissionRepository } from '../../submission/domain/submission.repository';

export type AssessmentResultResponse = {
  assessmentId: string;
  attemptId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';
  score: number;
  totalQuestions: number;
  completedQuestions: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  questionsPending: number;
  timeConsumedSeconds: number;
  startedAt: Date;
  expiresAt: Date;
  questions: Array<{
    id: string;
    position: number;
    title: string;
    score: number;
    submissionId: string | null;
    submissionScore: number | null;
    state: 'PENDING' | 'ACCEPTED' | 'INCORRECT';
  }>;
};

@Injectable()
export class GetAssessmentResultUseCase {
  constructor(
    @Inject(ASSESSMENT_ATTEMPT_REPOSITORY)
    private readonly attemptRepository: AssessmentAttemptRepository,
    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
    @Inject(SUBMISSION_REPOSITORY)
    private readonly submissionRepository: SubmissionRepository,
  ) {}

  async execute(assessmentId: string, attemptId: string): Promise<AssessmentResultResponse> {
    const initialAttempt = await this.attemptRepository.findById(attemptId);

    if (!initialAttempt) {
      throw new EntityNotFoundError('Assessment attempt', attemptId);
    }

    if (initialAttempt.assessmentId !== assessmentId) {
      throw new AssessmentAttemptNotForAssessmentError(attemptId, assessmentId);
    }

    await this.attemptRepository.expireIfDue(initialAttempt.id, new Date());
    const attempt = (await this.attemptRepository.findById(initialAttempt.id)) ?? initialAttempt;
    const [questions, submissions] = await Promise.all([
      this.questionRepository.findByAssessmentId(assessmentId),
      this.submissionRepository.findEvaluatedByAttemptId(attempt.id),
    ]);
    const progress = calculateAssessmentProgress(questions, submissions);
    const timeConsumedSeconds = calculateTimeConsumedSeconds(attempt, submissions, progress.questionsPending);

    await this.attemptRepository.updateSummary(attempt.id, {
      score: progress.score,
      completedQuestions: progress.completedQuestions,
      questionsCorrect: progress.questionsCorrect,
      questionsIncorrect: progress.questionsIncorrect,
      timeConsumedSeconds,
    });

    return {
      assessmentId,
      attemptId: attempt.id,
      status:
        attempt.status === AssessmentAttemptStatus.EXPIRED
          ? 'EXPIRED'
          : progress.questionsPending === 0
            ? 'COMPLETED'
            : 'IN_PROGRESS',
      score: progress.score,
      totalQuestions: progress.totalQuestions,
      completedQuestions: progress.completedQuestions,
      questionsCorrect: progress.questionsCorrect,
      questionsIncorrect: progress.questionsIncorrect,
      questionsPending: progress.questionsPending,
      timeConsumedSeconds,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      questions: questions.map((question) => {
        const submission = progress.latestSubmissionByQuestion.get(question.id);
        const submissionScore = submission?.score ?? null;

        return {
          id: question.id,
          position: question.position,
          title: question.title,
          score: question.score,
          submissionId: submission?.id ?? null,
          submissionScore,
          state: submissionScore === null ? 'PENDING' : submissionScore === 100 ? 'ACCEPTED' : 'INCORRECT',
        };
      }),
    };
  }
}

function calculateTimeConsumedSeconds(
  attempt: { startedAt: Date; expiresAt: Date; expiredAt: Date | null; status: AssessmentAttemptStatus },
  submissions: Array<{ submittedAt: Date | null }>,
  questionsPending: number,
): number {
  const lastSubmissionAt = submissions.reduce<Date | null>(
    (latest, submission) =>
      !submission.submittedAt || (latest && latest >= submission.submittedAt) ? latest : submission.submittedAt,
    null,
  );
  const endedAt =
    attempt.status === AssessmentAttemptStatus.EXPIRED
      ? attempt.expiredAt ?? attempt.expiresAt
      : questionsPending === 0 && lastSubmissionAt
        ? lastSubmissionAt
        : new Date();

  return Math.max(
    0,
    Math.floor((Math.min(endedAt.getTime(), attempt.expiresAt.getTime()) - attempt.startedAt.getTime()) / 1_000),
  );
}
