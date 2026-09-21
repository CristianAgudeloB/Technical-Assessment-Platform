import { Inject, Injectable } from '@nestjs/common';
import {
  CODE_EXECUTION_PORT,
  CodeExecutionPort,
  ExecutionProviderError,
  ExecutionStatus,
} from '../../execution/domain/code-execution.port';
import {
  AssessmentAttemptRepository,
  ASSESSMENT_ATTEMPT_REPOSITORY,
} from '../../assessment-attempt/domain/assessment-attempt.repository';
import { ValidateAssessmentAttemptUseCase } from '../../assessment-attempt/application/validate-assessment-attempt.use-case';
import {
  EntityNotFoundError,
  LanguageNotAllowedForQuestionError,
  PreviewExecutionLimitExceededError,
  QuestionAlreadySubmittedError,
} from '../../../shared/domain/errors/domain-errors';
import { ProgrammingLanguage } from '../../question/domain/question';
import {
  QUESTION_REPOSITORY,
  QuestionRepository,
} from '../../question/domain/question.repository';
import {
  SUBMISSION_REPOSITORY,
  SubmissionRepository,
} from '../domain/submission.repository';

const MAX_PREVIEW_EXECUTIONS_PER_ATTEMPT = 50;

export type RunCodeRequest = {
  assessmentId: string;
  assessmentAttemptId: string;
  userId: string;
  questionId: string;
  language: ProgrammingLanguage;
  sourceCode: string;
  stdin: string;
};

export type RunCodeResult = {
  status: ExecutionStatus;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  message: string | null;
  executionTimeMs: number | null;
  memoryKb: number | null;
};

/** Executes untrusted code through the sandbox without creating a submission or a score. */
@Injectable()
export class RunCodeUseCase {
  constructor(
    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
    @Inject(ASSESSMENT_ATTEMPT_REPOSITORY)
    private readonly attemptRepository: AssessmentAttemptRepository,
    @Inject(CODE_EXECUTION_PORT)
    private readonly codeExecution: CodeExecutionPort,
    @Inject(SUBMISSION_REPOSITORY)
    private readonly submissionRepository: SubmissionRepository,
    private readonly validateAssessmentAttempt: ValidateAssessmentAttemptUseCase,
  ) {}

  async execute(request: RunCodeRequest): Promise<RunCodeResult> {
    const question = await this.questionRepository.findById(request.questionId);

    if (!question || question.assessmentId !== request.assessmentId) {
      throw new EntityNotFoundError('Question', request.questionId);
    }

    if (!question.allowedLanguages.includes(request.language)) {
      throw new LanguageNotAllowedForQuestionError(request.language, question.id);
    }

    await this.validateAssessmentAttempt.assertActive(
      request.assessmentAttemptId,
      request.assessmentId,
      request.userId,
    );

    if (
      await this.submissionRepository.hasEvaluatedSubmissionForQuestion(
        request.assessmentAttemptId,
        question.id,
      )
    ) {
      throw new QuestionAlreadySubmittedError(question.id);
    }

    const reservedSlot = await this.attemptRepository.reservePreviewExecutionSlot(
      request.assessmentAttemptId,
      MAX_PREVIEW_EXECUTIONS_PER_ATTEMPT,
      new Date(),
    );

    if (!reservedSlot) {
      await this.validateAssessmentAttempt.assertActive(
        request.assessmentAttemptId,
        request.assessmentId,
        request.userId,
      );
      throw new PreviewExecutionLimitExceededError(request.assessmentAttemptId);
    }

    try {
      const execution = await this.codeExecution.execute({
        language: request.language,
        sourceCode: request.sourceCode,
        stdin: request.stdin,
      });

      return {
        status: execution.status,
        stdout: execution.stdout,
        stderr: execution.stderr,
        compileOutput: execution.compileOutput,
        message: execution.message,
        executionTimeMs: execution.executionTimeMs,
        memoryKb: execution.memoryKb,
      };
    } catch (error: unknown) {
      if (!(error instanceof ExecutionProviderError)) {
        throw error;
      }

      return {
        status: ExecutionStatus.INTERNAL_ERROR,
        stdout: null,
        stderr: null,
        compileOutput: null,
        message: 'El motor de ejecución no respondió. Intenta ejecutar nuevamente.',
        executionTimeMs: null,
        memoryKb: null,
      };
    }
  }
}
