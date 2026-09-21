import { deleteJson, getJson, postJson } from './http';

export type Candidate = {
  id: string;
  email: string;
  displayName: string;
  role: 'CANDIDATE';
};

export type AssessmentAssignment = {
  id: string;
  userId: string;
  assessmentId: string;
  assignedAt: string;
  availableFrom: string;
  availableUntil: string;
};

export function listCandidates(signal?: AbortSignal) {
  return getJson<Candidate[]>('/assignments/candidates', signal);
}

export function listCandidateAssignments(candidateId: string, signal?: AbortSignal) {
  return getJson<AssessmentAssignment[]>(`/assignments/candidates/${candidateId}`, signal);
}

export function assignAssessment(
  candidateId: string,
  assessmentId: string,
  availableFrom: string,
  availableUntil: string,
) {
  return postJson<AssessmentAssignment>('/assignments', {
    candidateId,
    assessmentId,
    availableFrom,
    availableUntil,
  });
}

export function unassignAssessment(candidateId: string, assessmentId: string) {
  return deleteJson(`/assignments/candidates/${candidateId}/assessments/${assessmentId}`);
}
