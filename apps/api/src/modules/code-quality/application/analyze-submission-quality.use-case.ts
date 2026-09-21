import { Inject, Injectable } from '@nestjs/common';
import {
  CODE_QUALITY_PORT,
  CodeQualityPort,
} from '../domain/code-quality.port';
import {
  SUBMISSION_QUALITY_REPORT_REPOSITORY,
  SubmissionQualityReport,
  SubmissionQualityReportRepository,
} from '../domain/submission-quality-report.repository';
import { Submission } from '../../submission/domain/submission';

/**
 * Quality feedback is deliberately best-effort: an unavailable analyser must never
 * invalidate a deterministic Judge0 evaluation or alter the functional score.
 */
@Injectable()
export class AnalyzeSubmissionQualityUseCase {
  constructor(
    @Inject(CODE_QUALITY_PORT)
    private readonly codeQuality: CodeQualityPort,
    @Inject(SUBMISSION_QUALITY_REPORT_REPOSITORY)
    private readonly qualityReports: SubmissionQualityReportRepository,
  ) {}

  async markPending(submissionId: string): Promise<void> {
    await this.qualityReports.markPending(submissionId);
  }

  async execute(submission: Submission): Promise<SubmissionQualityReport> {
    try {
      const analysis = await this.codeQuality.analyze({
        submissionId: submission.id,
        language: submission.language,
        sourceCode: submission.sourceCode,
      });

      return this.qualityReports.saveAnalysis(submission.id, analysis);
    } catch {
      return this.qualityReports.saveFailure(
        submission.id,
        'El análisis de calidad no estuvo disponible.',
      );
    }
  }
}
