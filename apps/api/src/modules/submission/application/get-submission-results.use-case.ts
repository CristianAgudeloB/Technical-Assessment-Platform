import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError, SubmissionResultsNotAvailableError } from '../../../shared/domain/errors/domain-errors';
import { QUESTION_REPOSITORY, QuestionRepository } from '../../question/domain/question.repository';
import { SUBMISSION_REPOSITORY, SubmissionRepository } from '../domain/submission.repository';
import { TEST_RESULT_REPOSITORY, TestResultRepository } from '../domain/test-result.repository';

export type SubmissionResultsResponse = {
  submissionId: string;
  assessmentId: string;
  question: {
    id: string;
    title: string;
    position: number;
  };
  language: string;
  score: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  timeConsumedMs: number;
  testResults: Array<{
    id: string;
    testCaseId: string;
    position: number;
    isHidden: boolean;
    status: string;
    passed: boolean;
    stdout: string | null;
    stderr: string | null;
    compileOutput: string | null;
    executionTimeMs: number | null;
    memoryKb: number | null;
  }>;
};

@Injectable()
export class GetSubmissionResultsUseCase {
  constructor(
    @Inject(SUBMISSION_REPOSITORY)
    private readonly submissionRepository: SubmissionRepository,
    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
    @Inject(TEST_RESULT_REPOSITORY)
    private readonly testResultRepository: TestResultRepository,
  ) {}

  async execute(submissionId: string): Promise<SubmissionResultsResponse> {
    const submission = await this.submissionRepository.findById(submissionId);

    if (!submission) {
      throw new EntityNotFoundError('Submission', submissionId);
    }

    if (submission.status !== 'EVALUATED' || submission.score === null) {
      throw new SubmissionResultsNotAvailableError(submission.id);
    }

    const question = await this.questionRepository.findById(submission.questionId);

    if (!question) {
      throw new EntityNotFoundError('Question', submission.questionId);
    }

    const storedResults = await this.testResultRepository.findBySubmissionId(submission.id);
    const testCaseById = new Map(question.testCases.map((testCase) => [testCase.id, testCase]));
    const testResults = storedResults.map((result) => {
      const testCase = testCaseById.get(result.testCaseId);

      return {
        id: result.id,
        testCaseId: result.testCaseId,
        position: testCase?.position ?? 0,
        isHidden: testCase?.isHidden ?? true,
        status: result.status,
        passed: result.status === 'ACCEPTED',
        stdout: testCase?.isHidden ? null : result.stdout,
        stderr: testCase?.isHidden ? null : result.stderr,
        compileOutput: testCase?.isHidden ? null : result.compileOutput,
        executionTimeMs: result.executionTimeMs,
        memoryKb: result.memoryKb,
      };
    });
    const passedTests = testResults.filter((result) => result.passed).length;
    const totalTests = testResults.length;

    return {
      submissionId: submission.id,
      assessmentId: question.assessmentId,
      question: {
        id: question.id,
        title: question.title,
        position: question.position,
      },
      language: submission.language,
      score: submission.score,
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      questionsCorrect: totalTests > 0 && passedTests === totalTests ? 1 : 0,
      questionsIncorrect: totalTests > 0 && passedTests !== totalTests ? 1 : 0,
      timeConsumedMs: testResults.reduce(
        (total, result) => total + (result.executionTimeMs ?? 0),
        0,
      ),
      testResults,
    };
  }
}
