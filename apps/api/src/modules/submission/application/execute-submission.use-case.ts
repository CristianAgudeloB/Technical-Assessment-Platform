import { Inject, Injectable } from '@nestjs/common';
import {
  CODE_EXECUTION_PORT,
  CodeExecutionPort,
  ExecutionProviderError,
  ExecutionResult,
  ExecutionStatus,
} from '../../execution/domain/code-execution.port';
import { EvaluateExecutionResultUseCase } from '../../evaluation/application/evaluate-execution-result.use-case';
import {
  SCORING_STRATEGY,
  ScoringStrategy,
} from '../../evaluation/domain/scoring.strategy';
import {
  QUESTION_REPOSITORY,
  QuestionRepository,
} from '../../question/domain/question.repository';
import {
  EntityNotFoundError,
  NoTestCasesConfiguredError,
  SubmissionNotExecutableError,
} from '../../../shared/domain/errors/domain-errors';
import {
  SUBMISSION_REPOSITORY,
  SubmissionRepository,
} from '../domain/submission.repository';
import {
  TEST_RESULT_REPOSITORY,
  TestResultRepository,
} from '../domain/test-result.repository';
import { ValidateAssessmentAttemptUseCase } from '../../assessment-attempt/application/validate-assessment-attempt.use-case';
import {
  ASSESSMENT_ATTEMPT_REPOSITORY,
  AssessmentAttemptRepository,
} from '../../assessment-attempt/domain/assessment-attempt.repository';
import { calculateAssessmentProgress } from '../../evaluation/application/calculate-assessment-progress';
import { AnalyzeSubmissionQualityUseCase } from '../../code-quality/application/analyze-submission-quality.use-case';

export type NormalizedTestResult = {
  id: string;
  testCaseId: string;
  position: number;
  isHidden: boolean;
  status: ExecutionStatus;
  passed: boolean;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  message: string | null;
  executionTimeMs: number | null;
  memoryKb: number | null;
};

export type ExecuteSubmissionResult = {
  submissionId: string;
  questionId: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  score: number;
  testResults: NormalizedTestResult[];
};

@Injectable()
export class ExecuteSubmissionUseCase {
  constructor(
    @Inject(SUBMISSION_REPOSITORY)
    private readonly submissionRepository: SubmissionRepository,
    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
    @Inject(CODE_EXECUTION_PORT)
    private readonly codeExecution: CodeExecutionPort,
    @Inject(TEST_RESULT_REPOSITORY)
    private readonly testResultRepository: TestResultRepository,
    @Inject(ASSESSMENT_ATTEMPT_REPOSITORY)
    private readonly assessmentAttemptRepository: AssessmentAttemptRepository,
    @Inject(SCORING_STRATEGY)
    private readonly scoringStrategy: ScoringStrategy,
    private readonly evaluateExecutionResult: EvaluateExecutionResultUseCase,
    private readonly validateAssessmentAttempt: ValidateAssessmentAttemptUseCase,
    private readonly analyzeSubmissionQuality: AnalyzeSubmissionQualityUseCase,
  ) {}

  async execute(submissionId: string, userId: string): Promise<ExecuteSubmissionResult> {
    const submission = await this.submissionRepository.findById(submissionId);

    if (!submission) {
      throw new EntityNotFoundError('Submission', submissionId);
    }

    const question = await this.questionRepository.findById(submission.questionId);

    if (!question) {
      throw new EntityNotFoundError('Question', submission.questionId);
    }

    if (question.testCases.length === 0) {
      throw new NoTestCasesConfiguredError(question.id);
    }

    if (!submission.assessmentAttemptId) {
      throw new EntityNotFoundError('Assessment attempt', 'missing');
    }

    const assessmentAttempt = await this.validateAssessmentAttempt.assertActive(
      submission.assessmentAttemptId,
      question.assessmentId,
      userId,
    );

    const claimed = await this.submissionRepository.claimForExecution(submission.id);
    if (!claimed) {
      throw new SubmissionNotExecutableError(submission.id);
    }

    try {
    const testResults: NormalizedTestResult[] = [];

    for (const testCase of question.testCases) {
      await this.validateAssessmentAttempt.assertActive(
        submission.assessmentAttemptId,
        question.assessmentId,
        userId,
      );
      const execution = await this.executeCode({
        language: submission.language,
        sourceCode: submission.sourceCode,
        stdin: testCase.input,
      });
      await this.validateAssessmentAttempt.assertActive(
        submission.assessmentAttemptId,
        question.assessmentId,
        userId,
      );
      const evaluation = this.evaluateExecutionResult.execute(execution, testCase.expectedOutput);
      const storedResult = await this.testResultRepository.upsert({
        submissionId: submission.id,
        testCaseId: testCase.id,
        status: evaluation.status,
        stdout: execution.stdout,
        stderr: execution.stderr,
        compileOutput: execution.compileOutput,
        executionTimeMs: execution.executionTimeMs,
        memoryKb: execution.memoryKb,
      });

      testResults.push({
        id: storedResult.id,
        testCaseId: testCase.id,
        position: testCase.position,
        isHidden: testCase.isHidden,
        status: evaluation.status,
        passed: evaluation.passed,
        stdout: testCase.isHidden ? null : execution.stdout,
        stderr: testCase.isHidden ? null : execution.stderr,
        compileOutput: testCase.isHidden ? null : execution.compileOutput,
        message: testCase.isHidden ? null : execution.message,
        executionTimeMs: execution.executionTimeMs,
        memoryKb: execution.memoryKb,
      });
    }

    const passedTests = testResults.filter((result) => result.passed).length;
    const score = this.scoringStrategy.calculate(testResults);

    await this.submissionRepository.markAsEvaluated(submission.id, score);
    await this.persistAssessmentProgress(assessmentAttempt);
    await this.analyzeSubmissionQuality.markPending(submission.id);
    void this.analyzeSubmissionQuality.execute(submission).catch(() => undefined);

    return {
      submissionId: submission.id,
      questionId: question.id,
      totalTests: testResults.length,
      passedTests,
      failedTests: testResults.length - passedTests,
      score,
      testResults,
    };
    } catch (error: unknown) {
      await this.submissionRepository.releaseExecutionClaim(submission.id);
      throw error;
    }
  }

  private async persistAssessmentProgress(
    assessmentAttempt: import('../../assessment-attempt/domain/assessment-attempt').AssessmentAttempt,
  ): Promise<void> {
    const [questions, submissions] = await Promise.all([
      this.questionRepository.findByAssessmentId(assessmentAttempt.assessmentId),
      this.submissionRepository.findEvaluatedByAttemptId(assessmentAttempt.id),
    ]);
    const progress = calculateAssessmentProgress(questions, submissions);
    const now = new Date();
    const summary = {
      score: progress.score,
      completedQuestions: progress.completedQuestions,
      questionsCorrect: progress.questionsCorrect,
      questionsIncorrect: progress.questionsIncorrect,
      timeConsumedSeconds: secondsSince(assessmentAttempt.startedAt, now, assessmentAttempt.expiresAt),
    };

    if (progress.questionsPending === 0) {
      await this.assessmentAttemptRepository.complete(assessmentAttempt.id, now, summary);
      return;
    }

    await this.assessmentAttemptRepository.updateSummary(assessmentAttempt.id, summary);
  }

  private async executeCode(input: {
    language: import('../../question/domain/question').ProgrammingLanguage;
    sourceCode: string;
    stdin: string;
  }): Promise<ExecutionResult> {
    try {
      return await this.codeExecution.execute(input);
    } catch (error: unknown) {
      if (!(error instanceof ExecutionProviderError)) {
        throw error;
      }

      return {
        status: ExecutionStatus.INTERNAL_ERROR,
        stdout: null,
        stderr: null,
        compileOutput: null,
        message: error.message,
        executionTimeMs: null,
        memoryKb: null,
        providerToken: null,
      };
    }
  }
}

function secondsSince(startedAt: Date, now: Date, expiresAt: Date): number {
  return Math.max(0, Math.floor((Math.min(now.getTime(), expiresAt.getTime()) - startedAt.getTime()) / 1_000));
}
