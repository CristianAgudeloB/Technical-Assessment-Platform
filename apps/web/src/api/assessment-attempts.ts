import { getJson, postJson } from './http';

export type AssessmentAttemptStatus = 'ACTIVE' | 'EXPIRED';

export type AssessmentAttempt = {
  id: string;
  assessmentId: string;
  status: AssessmentAttemptStatus;
  startedAt: string;
  expiresAt: string;
  expiredAt: string | null;
  score: number | null;
  questionsCorrect: number;
  questionsIncorrect: number;
  completedQuestions: number;
  timeConsumedSeconds: number | null;
  serverTime: string;
};

export type AssessmentAttemptResult = {
  assessmentId: string;
  attemptId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';
  score: number;
  totalQuestions: number;
  completedQuestions: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  questionsPending: number;
  timeConsumedSeconds: number;
  startedAt: string;
  expiresAt: string;
  questions: Array<{
    id: string;
    position: number;
    title: string;
    score: number;
    submissionId: string | null;
    submissionScore: number | null;
    state: 'PENDING' | 'ACCEPTED' | 'INCORRECT';
  }>;
};

export function startAssessmentAttempt(assessmentId: string) {
  return postJson<AssessmentAttempt>(`/assessments/${assessmentId}/attempts`, {});
}

export function getAssessmentAttempt(assessmentId: string, attemptId: string, signal?: AbortSignal) {
  return getJson<AssessmentAttempt>(`/assessments/${assessmentId}/attempts/${attemptId}`, signal);
}

export function getAssessmentAttemptResults(assessmentId: string, attemptId: string, signal?: AbortSignal) {
  return getJson<AssessmentAttemptResult>(`/assessments/${assessmentId}/attempts/${attemptId}/results`, signal);
}
