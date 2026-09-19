export class EntityNotFoundError extends Error {
  constructor(entity: string, identifier: string) {
    super(`${entity} with identifier "${identifier}" was not found.`);
  }
}

export class DuplicateEntityError extends Error {
  constructor(entity: string, field: string) {
    super(`${entity} already exists for ${field}.`);
  }
}

export class LanguageNotAllowedForQuestionError extends Error {
  constructor(language: string, questionId: string) {
    super(`Language "${language}" is not allowed for question "${questionId}".`);
  }
}

export class NoTestCasesConfiguredError extends Error {
  constructor(questionId: string) {
    super(`Question "${questionId}" does not have a test case configured.`);
  }
}

export class SubmissionResultsNotAvailableError extends Error {
  constructor(submissionId: string) {
    super(`Results are not available for submission "${submissionId}" yet.`);
  }
}

export class AssessmentAttemptExpiredError extends Error {
  constructor(attemptId: string) {
    super(`Assessment attempt "${attemptId}" has expired. No further submissions can be accepted.`);
  }
}

export class AssessmentAttemptNotForAssessmentError extends Error {
  constructor(attemptId: string, assessmentId: string) {
    super(`Assessment attempt "${attemptId}" does not belong to assessment "${assessmentId}".`);
  }
}

export class AssessmentNotPublishedError extends Error {
  constructor(assessmentId: string) {
    super(`Assessment "${assessmentId}" is not available for candidates.`);
  }
}

export class AssessmentNotReadyToPublishError extends Error {
  constructor(assessmentId: string, reason: string) {
    super(`El reto "${assessmentId}" no puede publicarse: ${reason}`);
  }
}

export class AssessmentNotEditableError extends Error {
  constructor(assessmentId: string) {
    super(`El reto "${assessmentId}" ya fue publicado y no puede modificarse.`);
  }
}

export class SubmissionNotExecutableError extends Error {
  constructor(submissionId: string) {
    super(`Submission "${submissionId}" is already being processed or has already been evaluated.`);
  }
}

export class SubmissionLimitExceededError extends Error {
  constructor(assessmentAttemptId: string) {
    super(`Assessment attempt "${assessmentAttemptId}" has reached its submission limit.`);
  }
}
