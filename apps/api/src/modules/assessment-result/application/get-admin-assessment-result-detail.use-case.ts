import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../../shared/domain/errors/domain-errors';
import {
  ASSESSMENT_ATTEMPT_REPOSITORY,
  AssessmentAttemptRepository,
} from '../../assessment-attempt/domain/assessment-attempt.repository';
import { ExecutionStatus } from '../../execution/domain/code-execution.port';
import {
  QUESTION_REPOSITORY,
  QuestionRepository,
} from '../../question/domain/question.repository';
import {
  SUBMISSION_REPOSITORY,
  SubmissionRepository,
} from '../../submission/domain/submission.repository';
import {
  TEST_RESULT_REPOSITORY,
  TestResultRepository,
} from '../../submission/domain/test-result.repository';

export type AdminAssessmentResultDetail = {
  id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  score: number | null;
  questionsCorrect: number;
  questionsIncorrect: number;
  completedQuestions: number;
  timeConsumedSeconds: number | null;
  startedAt: Date;
  completedAt: Date | null;
  expiredAt: Date | null;
  candidate: { id: string; displayName: string; email: string };
  assessment: { id: string; name: string };
  totalQuestions: number;
  questions: Array<{
    id: string;
    position: number;
    title: string;
    score: number;
    submission: null | {
      id: string;
      language: string;
      sourceCode: string;
      score: number | null;
      submittedAt: Date | null;
      tests: Array<{
        position: number;
        isHidden: boolean;
        input: string;
        expectedOutput: string;
        stdout: string | null;
        status: ExecutionStatus;
        executionTimeMs: number | null;
        memoryKb: number | null;
      }>;
    };
  }>;
};

@Injectable()
export class GetAdminAssessmentResultDetailUseCase {
  constructor(
    @Inject(ASSESSMENT_ATTEMPT_REPOSITORY)
    private readonly attemptRepository: AssessmentAttemptRepository,
    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
    @Inject(SUBMISSION_REPOSITORY)
    private readonly submissionRepository: SubmissionRepository,
    @Inject(TEST_RESULT_REPOSITORY)
    private readonly testResultRepository: TestResultRepository,
  ) {}

  async execute(attemptId: string): Promise<AdminAssessmentResultDetail> {
    const attempt = await this.attemptRepository.findResultForAdmin(attemptId);
    if (!attempt) throw new EntityNotFoundError('Assessment attempt', attemptId);

    const [questions, submissions] = await Promise.all([
      this.questionRepository.findByAssessmentId(attempt.assessment.id),
      this.submissionRepository.findEvaluatedByAttemptId(attempt.id),
    ]);
    const latestSubmissionByQuestion = new Map<string, typeof submissions[number]>();
    for (const submission of submissions) {
      if (!latestSubmissionByQuestion.has(submission.questionId)) {
        latestSubmissionByQuestion.set(submission.questionId, submission);
      }
    }

    const testsBySubmission = new Map(
      await Promise.all(
        [...latestSubmissionByQuestion.values()].map(async (submission) => [
          submission.id,
          await this.testResultRepository.findBySubmissionId(submission.id),
        ] as const),
      ),
    );

    return {
      ...attempt,
      totalQuestions: questions.length,
      questions: questions.map((question) => {
        const submission = latestSubmissionByQuestion.get(question.id);
        const tests = submission ? testsBySubmission.get(submission.id) ?? [] : [];

        return {
          id: question.id,
          position: question.position,
          title: question.title,
          score: question.score,
          submission: submission
            ? {
                id: submission.id,
                language: submission.language,
                sourceCode: submission.sourceCode,
                score: submission.score,
                submittedAt: submission.submittedAt,
                tests: tests.map((test) => {
                  const testCase = question.testCases.find(({ id }) => id === test.testCaseId);
                  return {
                    position: testCase?.position ?? 0,
                    isHidden: testCase?.isHidden ?? false,
                    input: testCase?.input ?? '',
                    expectedOutput: testCase?.expectedOutput ?? '',
                    stdout: test.stdout,
                    status: test.status,
                    executionTimeMs: test.executionTimeMs,
                    memoryKb: test.memoryKb,
                  };
                }),
              }
            : null,
        };
      }),
    };
  }
}
