import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { CodeQualityAnalysis, CodeQualityIssue } from '../domain/code-quality.port';
import {
  SubmissionQualityReport,
  SubmissionQualityReportRepository,
} from '../domain/submission-quality-report.repository';

@Injectable()
export class PrismaSubmissionQualityReportRepository implements SubmissionQualityReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async markPending(submissionId: string): Promise<void> {
    await this.prisma.submissionQualityReport.upsert({
      where: { submissionId },
      create: { submissionId, status: 'PENDING' },
      update: {
        status: 'PENDING',
        qualityGateStatus: null,
        totalIssues: 0,
        bugs: 0,
        codeSmells: 0,
        vulnerabilities: 0,
        issues: Prisma.DbNull,
        errorMessage: null,
        analyzedAt: null,
      },
    });
  }

  async saveAnalysis(submissionId: string, analysis: CodeQualityAnalysis): Promise<SubmissionQualityReport> {
    const status = analysis.status === 'SKIPPED' ? 'SKIPPED' : 'COMPLETED';
    const report = await this.prisma.submissionQualityReport.upsert({
      where: { submissionId },
      create: {
        submissionId,
        status,
        qualityGateStatus: analysis.qualityGateStatus,
        totalIssues: analysis.totalIssues,
        bugs: analysis.bugs,
        codeSmells: analysis.codeSmells,
        vulnerabilities: analysis.vulnerabilities,
        issues: analysis.issues as Prisma.InputJsonValue,
        errorMessage: analysis.message,
        analyzedAt: new Date(),
      },
      update: {
        status,
        qualityGateStatus: analysis.qualityGateStatus,
        totalIssues: analysis.totalIssues,
        bugs: analysis.bugs,
        codeSmells: analysis.codeSmells,
        vulnerabilities: analysis.vulnerabilities,
        issues: analysis.issues as Prisma.InputJsonValue,
        errorMessage: analysis.message,
        analyzedAt: new Date(),
      },
    });

    return this.toDomain(report);
  }

  async saveFailure(submissionId: string, message: string): Promise<SubmissionQualityReport> {
    const report = await this.prisma.submissionQualityReport.upsert({
      where: { submissionId },
      create: { submissionId, status: 'FAILED', errorMessage: message },
      update: { status: 'FAILED', errorMessage: message },
    });

    return this.toDomain(report);
  }

  async findBySubmissionId(submissionId: string): Promise<SubmissionQualityReport | null> {
    const report = await this.prisma.submissionQualityReport.findUnique({ where: { submissionId } });
    return report ? this.toDomain(report) : null;
  }

  private toDomain(report: Prisma.SubmissionQualityReportModel): SubmissionQualityReport {
    return {
      submissionId: report.submissionId,
      status: report.status,
      qualityGateStatus: report.qualityGateStatus,
      totalIssues: report.totalIssues,
      bugs: report.bugs,
      codeSmells: report.codeSmells,
      vulnerabilities: report.vulnerabilities,
      issues: parseIssues(report.issues),
      errorMessage: report.errorMessage,
      analyzedAt: report.analyzedAt,
    };
  }
}

function parseIssues(value: Prisma.JsonValue | null): CodeQualityIssue[] {
  if (!Array.isArray(value)) return [];
  return value.filter((issue): issue is CodeQualityIssue => {
    if (!issue || typeof issue !== 'object' || Array.isArray(issue)) return false;
    const item = issue as Record<string, unknown>;
    return (item.type === 'BUG' || item.type === 'CODE_SMELL' || item.type === 'VULNERABILITY')
      && typeof item.severity === 'string'
      && typeof item.message === 'string'
      && typeof item.rule === 'string'
      && (typeof item.line === 'number' || item.line === null);
  });
}
