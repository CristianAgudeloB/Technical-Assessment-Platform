import { AssessmentAssignment, CreateAssessmentAssignmentData } from './assessment-assignment';

export const ASSESSMENT_ASSIGNMENT_REPOSITORY = Symbol('ASSESSMENT_ASSIGNMENT_REPOSITORY');

export interface AssessmentAssignmentRepository {
  assign(data: CreateAssessmentAssignmentData): Promise<AssessmentAssignment>;
  unassign(userId: string, assessmentId: string): Promise<void>;
  findByUserId(userId: string): Promise<AssessmentAssignment[]>;
  findAvailable(userId: string, assessmentId: string, now?: Date): Promise<AssessmentAssignment | null>;
}
