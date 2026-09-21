import {
  AssessmentAttempt,
  AdminAssessmentResult,
  AssessmentAttemptSummary,
  CreateAssessmentAttemptData,
} from './assessment-attempt';

export const ASSESSMENT_ATTEMPT_REPOSITORY = Symbol('ASSESSMENT_ATTEMPT_REPOSITORY');

export interface AssessmentAttemptRepository {
  create(data: CreateAssessmentAttemptData): Promise<AssessmentAttempt>;
  findById(id: string): Promise<AssessmentAttempt | null>;
  findLatestActiveByAssessmentAndUser(
    assessmentId: string,
    userId: string,
  ): Promise<AssessmentAttempt | null>;
  findLatestCompletedByAssessmentAndUser(
    assessmentId: string,
    userId: string,
  ): Promise<AssessmentAttempt | null>;
  findResultsForAdmin(): Promise<AdminAssessmentResult[]>;
  findResultForAdmin(id: string): Promise<AdminAssessmentResult | null>;
  updateSummary(id: string, summary: AssessmentAttemptSummary): Promise<void>;
  complete(id: string, completedAt: Date, summary: AssessmentAttemptSummary): Promise<void>;
  expireIfDue(id: string, now: Date): Promise<void>;
  reserveSubmissionSlot(id: string, maximum: number, now: Date): Promise<boolean>;
  reservePreviewExecutionSlot(id: string, maximum: number, now: Date): Promise<boolean>;
  releaseSubmissionSlot(id: string): Promise<void>;
}
