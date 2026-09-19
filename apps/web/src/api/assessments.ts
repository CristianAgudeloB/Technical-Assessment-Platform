import { getJson, postJson } from './http';

export type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type AssessmentSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  status: AssessmentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestionSummary = {
  id: string;
  assessmentId: string;
  slug: string;
  title: string;
  description: string;
  position: number;
  score: number;
  allowedLanguages: string[];
  testCases: Array<{
    id: string;
    position: number;
    isHidden: boolean;
  }>;
};

export type CreateAssessmentRequest = {
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
};

export type CreateQuestionRequest = {
  slug: string;
  title: string;
  description: string;
  position: number;
  score: number;
  allowedLanguages: Array<'JAVA' | 'JAVASCRIPT' | 'PYTHON' | 'TYPESCRIPT' | 'COBOL'>;
  testCases: Array<{
    position: number;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }>;
};

export function listAssessments(signal?: AbortSignal) {
  return getJson<AssessmentSummary[]>('/assessments', signal);
}

export function getAssessment(id: string, signal?: AbortSignal) {
  return getJson<AssessmentSummary>(`/assessments/${id}`, signal);
}

export function listAssessmentQuestions(id: string, signal?: AbortSignal) {
  return getJson<QuestionSummary[]>(`/assessments/${id}/questions`, signal);
}

export function getQuestion(id: string, signal?: AbortSignal) {
  return getJson<QuestionSummary>(`/questions/${id}`, signal);
}

export function createAssessment(request: CreateAssessmentRequest) {
  return postJson<AssessmentSummary>('/assessments', request);
}

export function publishAssessment(id: string) {
  return postJson<AssessmentSummary>(`/assessments/${id}/publish`, {});
}

export function createQuestion(assessmentId: string, request: CreateQuestionRequest) {
  return postJson<QuestionSummary>(`/assessments/${assessmentId}/questions`, request);
}
