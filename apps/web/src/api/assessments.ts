import { getJson, patchJson, postJson } from './http';
import type { ProgrammingLanguage } from '@kata/shared-types';

export type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type AssessmentSummary = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  status: AssessmentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  availableFrom?: string;
  availableUntil?: string;
};

export type QuestionSummary = {
  id: string;
  assessmentId: string;
  title: string;
  description: string;
  position: number;
  score: number;
  allowedLanguages: ProgrammingLanguage[];
  testCases: PublicTestCase[];
};

export type PublicTestCase =
  | {
      id: string;
      position: number;
      isHidden: true;
    }
  | {
      id: string;
      position: number;
      isHidden: false;
      input: string;
      expectedOutput: string;
    };

export type AdminQuestionDetails = Omit<QuestionSummary, 'testCases'> & {
  testCases: Array<{
    id: string;
    position: number;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }>;
};

export type CreateAssessmentRequest = {
  name: string;
  description: string;
  durationMinutes: number;
};

export type UpdateAssessmentRequest = CreateAssessmentRequest;

export type CreateQuestionRequest = {
  title: string;
  description: string;
  position: number;
  score: number;
  allowedLanguages: ProgrammingLanguage[];
  testCases: Array<{
    position: number;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }>;
};

export type UpdateQuestionRequest = Omit<CreateQuestionRequest, 'assessmentId'>;

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

export function getAdminQuestion(id: string, signal?: AbortSignal) {
  return getJson<AdminQuestionDetails>(`/questions/${id}/edit`, signal);
}

export function createAssessment(request: CreateAssessmentRequest) {
  return postJson<AssessmentSummary>('/assessments', request);
}

export function publishAssessment(id: string) {
  return postJson<AssessmentSummary>(`/assessments/${id}/publish`, {});
}

export function updateAssessment(id: string, request: UpdateAssessmentRequest) {
  return patchJson<AssessmentSummary>(`/assessments/${id}`, request);
}

export function createQuestion(assessmentId: string, request: CreateQuestionRequest) {
  return postJson<QuestionSummary>(`/assessments/${assessmentId}/questions`, request);
}

export function updateQuestion(id: string, request: UpdateQuestionRequest) {
  return patchJson<AdminQuestionDetails>(`/questions/${id}`, request);
}
