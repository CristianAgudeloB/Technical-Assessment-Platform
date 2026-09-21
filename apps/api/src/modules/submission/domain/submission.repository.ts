import { CreateSubmissionData, Submission } from './submission';

export const SUBMISSION_REPOSITORY = Symbol('SUBMISSION_REPOSITORY');

export interface SubmissionRepository {
  create(data: CreateSubmissionData): Promise<Submission>;
  findById(id: string): Promise<Submission | null>;
  findEvaluatedByAttemptId(attemptId: string): Promise<Submission[]>;
  hasEvaluatedSubmissionForQuestion(attemptId: string, questionId: string): Promise<boolean>;
  claimForExecution(id: string): Promise<boolean>;
  releaseExecutionClaim(id: string): Promise<void>;
  markAsEvaluated(id: string, score: number): Promise<void>;
}
