import {
  createSubmission,
  executeSubmission,
  type ProgrammingLanguage,
  type SubmissionExecutionSummary,
} from '../../api/submissions';

export type SubmissionDraft = {
  assessmentAttemptId: string;
  questionId: string;
  language: ProgrammingLanguage;
  sourceCode: string;
};

export type SubmissionExecutionFeedback = {
  status: 'EVALUATED';
  submissionId: string;
  message: string;
  result: SubmissionExecutionSummary;
};

export interface SubmissionExecutor {
  execute(draft: SubmissionDraft): Promise<SubmissionExecutionFeedback>;
}

class ApiSubmissionExecutor implements SubmissionExecutor {
  async execute(draft: SubmissionDraft): Promise<SubmissionExecutionFeedback> {
    const submission = await createSubmission(draft);
    const result = await executeSubmission(submission.id);

    return {
      status: 'EVALUATED',
      submissionId: submission.id,
      result,
      message: `Evaluation complete: ${result.passedTests} of ${result.totalTests} tests passed.`,
    };
  }
}

export const submissionExecutor: SubmissionExecutor = new ApiSubmissionExecutor();
