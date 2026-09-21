import { getJson } from './http';

export type AdminAssessmentResult = {
  id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  score: number | null;
  questionsCorrect: number;
  questionsIncorrect: number;
  completedQuestions: number;
  timeConsumedSeconds: number | null;
  startedAt: string;
  completedAt: string | null;
  expiredAt: string | null;
  candidate: {
    id: string;
    displayName: string;
    email: string;
  };
  assessment: {
    id: string;
    name: string;
  };
};

export type AdminAssessmentResultDetail = AdminAssessmentResult & {
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
      submittedAt: string | null;
      tests: Array<{
        position: number;
        isHidden: boolean;
        input: string;
        expectedOutput: string;
        stdout: string | null;
        status: 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED' | 'INTERNAL_ERROR';
        executionTimeMs: number | null;
        memoryKb: number | null;
      }>;
    };
  }>;
};

export function listAdminAssessmentResults(signal?: AbortSignal) {
  return getJson<AdminAssessmentResult[]>('/admin/results', signal);
}

export function getAdminAssessmentResultDetail(attemptId: string, signal?: AbortSignal) {
  return getJson<AdminAssessmentResultDetail>(`/admin/results/${attemptId}`, signal);
}
