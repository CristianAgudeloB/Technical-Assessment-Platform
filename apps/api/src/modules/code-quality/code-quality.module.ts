import { Module } from '@nestjs/common';
import { AnalyzeSubmissionQualityUseCase } from './application/analyze-submission-quality.use-case';
import { CODE_QUALITY_PORT } from './domain/code-quality.port';
import { SUBMISSION_QUALITY_REPORT_REPOSITORY } from './domain/submission-quality-report.repository';
import { PrismaSubmissionQualityReportRepository } from './infrastructure/prisma-submission-quality-report.repository';
import { SonarQubeQualityAdapter } from './infrastructure/sonarqube-quality.adapter';

@Module({
  providers: [
    AnalyzeSubmissionQualityUseCase,
    SonarQubeQualityAdapter,
    PrismaSubmissionQualityReportRepository,
    { provide: CODE_QUALITY_PORT, useExisting: SonarQubeQualityAdapter },
    { provide: SUBMISSION_QUALITY_REPORT_REPOSITORY, useExisting: PrismaSubmissionQualityReportRepository },
  ],
  exports: [AnalyzeSubmissionQualityUseCase, SUBMISSION_QUALITY_REPORT_REPOSITORY],
})
export class CodeQualityModule {}
