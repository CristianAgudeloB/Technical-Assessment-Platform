import { CodeQualityAnalysis, CodeQualityIssue } from './code-quality.port';

export const SUBMISSION_QUALITY_REPORT_REPOSITORY = Symbol('SUBMISSION_QUALITY_REPORT_REPOSITORY');

export type SubmissionQualityReport = {
  submissionId: string;
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'FAILED';
  qualityGateStatus: string | null;
  totalIssues: number;
  bugs: number;
  codeSmells: number;
  vulnerabilities: number;
  issues: CodeQualityIssue[];
  errorMessage: string | null;
  analyzedAt: Date | null;
};

export interface SubmissionQualityReportRepository {
  markPending(submissionId: string): Promise<void>;
  saveAnalysis(submissionId: string, analysis: CodeQualityAnalysis): Promise<SubmissionQualityReport>;
  saveFailure(submissionId: string, message: string): Promise<SubmissionQualityReport>;
  findBySubmissionId(submissionId: string): Promise<SubmissionQualityReport | null>;
}
