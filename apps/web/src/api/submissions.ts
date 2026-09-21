import { getJson, postJson } from './http';
import type { ProgrammingLanguage } from '@kata/shared-types';

export type { ProgrammingLanguage };

export type CreateSubmissionRequest = {
  assessmentAttemptId: string;
  questionId: string;
  language: ProgrammingLanguage;
  sourceCode: string;
};

export type CreateSubmissionResponse = {
  id: string;
};

type SubmissionTestResult = {
  id: string;
  testCaseId: string;
  position: number;
  isHidden: boolean;
  status:
    | 'ACCEPTED'
    | 'WRONG_ANSWER'
    | 'COMPILATION_ERROR'
    | 'RUNTIME_ERROR'
    | 'TIME_LIMIT_EXCEEDED'
    | 'MEMORY_LIMIT_EXCEEDED'
    | 'INTERNAL_ERROR';
  passed: boolean;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  executionTimeMs: number | null;
  memoryKb: number | null;
};

export type PersistedTestResult = SubmissionTestResult & {
  /** Available only in the persisted-results view and never for hidden tests. */
  expectedOutput: string | null;
};

export type SubmissionExecutionSummary = {
  submissionId: string;
  questionId: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  score: number;
  testResults: SubmissionTestResult[];
};

export type CodeRunResult = {
  status:
    | 'ACCEPTED'
    | 'COMPILATION_ERROR'
    | 'RUNTIME_ERROR'
    | 'TIME_LIMIT_EXCEEDED'
    | 'MEMORY_LIMIT_EXCEEDED'
    | 'INTERNAL_ERROR';
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  message: string | null;
  executionTimeMs: number | null;
  memoryKb: number | null;
};

export type SubmissionResults = Omit<SubmissionExecutionSummary, 'testResults'> & {
  assessmentId: string;
  question: {
    id: string;
    title: string;
    position: number;
  };
  language: ProgrammingLanguage;
  questionsCorrect: number;
  questionsIncorrect: number;
  timeConsumedMs: number;
  quality: SubmissionQualityReport | null;
  testResults: PersistedTestResult[];
};

export type SubmissionQualityReport = {
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'FAILED';
  qualityGateStatus: string | null;
  totalIssues: number;
  bugs: number;
  codeSmells: number;
  vulnerabilities: number;
  issues: Array<{
    type: 'BUG' | 'CODE_SMELL' | 'VULNERABILITY';
    severity: string;
    message: string;
    rule: string;
    line: number | null;
  }>;
  message: string | null;
};

export function createSubmission(request: CreateSubmissionRequest) {
  return postJson<CreateSubmissionResponse>('/submissions', request);
}

export function executeSubmission(submissionId: string) {
  return postJson<SubmissionExecutionSummary>(`/submissions/${submissionId}/execute`, {});
}

export function runCode(input: CreateSubmissionRequest & { assessmentId: string; stdin: string }) {
  const { assessmentId, assessmentAttemptId, questionId, language, sourceCode, stdin } = input;
  return postJson<CodeRunResult>(
    `/assessments/${assessmentId}/attempts/${assessmentAttemptId}/questions/${questionId}/run`,
    { language, sourceCode, stdin },
  );
}

export function getSubmissionResults(submissionId: string, signal?: AbortSignal) {
  return getJson<SubmissionResults>(`/submissions/${submissionId}/results`, signal);
}
