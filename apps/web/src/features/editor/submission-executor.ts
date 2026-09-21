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
  submit(draft: SubmissionDraft): Promise<SubmissionExecutionFeedback>;
}

class ApiSubmissionExecutor implements SubmissionExecutor {
  async submit(draft: SubmissionDraft): Promise<SubmissionExecutionFeedback> {
    const submission = await createSubmission(draft);
    const result = await executeSubmission(submission.id);

    return {
      status: 'EVALUATED',
      submissionId: submission.id,
      result,
      message: `Evaluación completada: ${result.passedTests} de ${result.totalTests} pruebas aprobadas.`,
    };
  }
}

export const submissionExecutor: SubmissionExecutor = new ApiSubmissionExecutor();
