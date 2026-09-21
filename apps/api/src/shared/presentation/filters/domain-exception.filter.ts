import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ExecutionProviderError } from '../../../modules/execution/domain/code-execution.port';
import {
  DuplicateEntityError,
  EntityNotFoundError,
  LanguageNotAllowedForQuestionError,
  NoTestCasesConfiguredError,
  SubmissionResultsNotAvailableError,
  AssessmentAttemptExpiredError,
  AssessmentAttemptCompletedError,
  AssessmentAttemptNotForAssessmentError,
  AssessmentNotEditableError,
  QuestionNotEditableError,
  AssessmentNotReadyToPublishError,
  AssessmentNotPublishedError,
  PreviewExecutionLimitExceededError,
  QuestionAlreadySubmittedError,
  SubmissionNotExecutableError,
  SubmissionLimitExceededError,
  AssignmentAvailabilityWindowError,
  AssessmentAssignmentUnavailableError,
} from '../../domain/errors/domain-errors';

@Catch(
  EntityNotFoundError,
  DuplicateEntityError,
  LanguageNotAllowedForQuestionError,
  NoTestCasesConfiguredError,
  SubmissionResultsNotAvailableError,
  AssessmentAttemptExpiredError,
  AssessmentAttemptCompletedError,
  AssessmentAttemptNotForAssessmentError,
  AssessmentNotEditableError,
  QuestionNotEditableError,
  AssessmentNotReadyToPublishError,
  AssessmentNotPublishedError,
  PreviewExecutionLimitExceededError,
  QuestionAlreadySubmittedError,
  SubmissionNotExecutableError,
  SubmissionLimitExceededError,
  AssignmentAvailabilityWindowError,
  AssessmentAssignmentUnavailableError,
  ExecutionProviderError,
)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | EntityNotFoundError
      | DuplicateEntityError
      | LanguageNotAllowedForQuestionError
      | NoTestCasesConfiguredError
      | SubmissionResultsNotAvailableError
      | AssessmentAttemptExpiredError
      | AssessmentAttemptCompletedError
      | AssessmentAttemptNotForAssessmentError
      | AssessmentNotEditableError
      | QuestionNotEditableError
      | AssessmentNotReadyToPublishError
      | AssessmentNotPublishedError
      | PreviewExecutionLimitExceededError
      | QuestionAlreadySubmittedError
      | SubmissionNotExecutableError
      | SubmissionLimitExceededError
      | AssignmentAvailabilityWindowError
      | AssessmentAssignmentUnavailableError
      | ExecutionProviderError,
    host: ArgumentsHost,
  ) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof EntityNotFoundError
        ? HttpStatus.NOT_FOUND
        : exception instanceof DuplicateEntityError
          ? HttpStatus.CONFLICT
          : exception instanceof ExecutionProviderError
          ? HttpStatus.BAD_GATEWAY
          : exception instanceof SubmissionResultsNotAvailableError
            ? HttpStatus.CONFLICT
          : exception instanceof AssessmentAttemptExpiredError
            ? HttpStatus.CONFLICT
          : exception instanceof AssessmentAttemptCompletedError
            ? HttpStatus.CONFLICT
          : exception instanceof QuestionAlreadySubmittedError
            ? HttpStatus.CONFLICT
          : exception instanceof SubmissionNotExecutableError
            ? HttpStatus.CONFLICT
          : exception instanceof SubmissionLimitExceededError
          ? HttpStatus.TOO_MANY_REQUESTS
          : exception instanceof PreviewExecutionLimitExceededError
            ? HttpStatus.TOO_MANY_REQUESTS
          : exception instanceof AssessmentAssignmentUnavailableError
            ? HttpStatus.FORBIDDEN
          : HttpStatus.UNPROCESSABLE_ENTITY;

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      path: request.url,
    });
  }
}
