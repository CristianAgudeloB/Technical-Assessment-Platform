import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { AssessmentAttemptStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  AssessmentAttempt,
  AdminAssessmentResult,
  AssessmentAttemptSummary,
  CreateAssessmentAttemptData,
} from '../domain/assessment-attempt';
import { AssessmentAttemptRepository } from '../domain/assessment-attempt.repository';

@Injectable()
export class PrismaAssessmentAttemptRepository implements AssessmentAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAssessmentAttemptData): Promise<AssessmentAttempt> {
    const attempt = await this.prisma.assessmentAttempt.create({ data });
    return this.toDomain(attempt);
  }

  async findById(id: string): Promise<AssessmentAttempt | null> {
    const attempt = await this.prisma.assessmentAttempt.findUnique({ where: { id } });
    return attempt ? this.toDomain(attempt) : null;
  }

  async findLatestActiveByAssessmentAndUser(
    assessmentId: string,
    userId: string,
  ): Promise<AssessmentAttempt | null> {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        assessmentId,
        userId,
        status: AssessmentAttemptStatus.ACTIVE,
      },
      orderBy: { startedAt: 'desc' },
    });

    return attempt ? this.toDomain(attempt) : null;
  }

  async findLatestCompletedByAssessmentAndUser(
    assessmentId: string,
    userId: string,
  ): Promise<AssessmentAttempt | null> {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        assessmentId,
        userId,
        status: AssessmentAttemptStatus.COMPLETED,
      },
      orderBy: { completedAt: 'desc' },
    });

    return attempt ? this.toDomain(attempt) : null;
  }

  async findResultsForAdmin(): Promise<AdminAssessmentResult[]> {
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { userId: { not: null } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        status: true,
        score: true,
        questionsCorrect: true,
        questionsIncorrect: true,
        completedQuestions: true,
        timeConsumedSeconds: true,
        startedAt: true,
        completedAt: true,
        expiredAt: true,
        user: { select: { id: true, displayName: true, email: true } },
        assessment: { select: { id: true, name: true } },
      },
    });

    return attempts.flatMap((attempt) => attempt.user
      ? [{
          ...attempt,
          status: attempt.status as AdminAssessmentResult['status'],
          score: attempt.score === null ? null : Number(attempt.score),
          candidate: attempt.user,
        }]
      : []);
  }

  async findResultForAdmin(id: string): Promise<AdminAssessmentResult | null> {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        score: true,
        questionsCorrect: true,
        questionsIncorrect: true,
        completedQuestions: true,
        timeConsumedSeconds: true,
        startedAt: true,
        completedAt: true,
        expiredAt: true,
        user: { select: { id: true, displayName: true, email: true } },
        assessment: { select: { id: true, name: true } },
      },
    });

    if (!attempt?.user) return null;

    return {
      ...attempt,
      status: attempt.status as AdminAssessmentResult['status'],
      score: attempt.score === null ? null : Number(attempt.score),
      candidate: attempt.user,
    };
  }

  async updateSummary(id: string, summary: AssessmentAttemptSummary): Promise<void> {
    await this.prisma.assessmentAttempt.update({
      where: { id },
      data: summary,
    });
  }

  async complete(id: string, completedAt: Date, summary: AssessmentAttemptSummary): Promise<void> {
    await this.prisma.assessmentAttempt.updateMany({
      where: { id, status: AssessmentAttemptStatus.ACTIVE },
      data: {
        ...summary,
        status: AssessmentAttemptStatus.COMPLETED,
        completedAt,
      },
    });
  }

  async expireIfDue(id: string, now: Date): Promise<void> {
    await this.prisma.assessmentAttempt.updateMany({
      where: {
        id,
        status: AssessmentAttemptStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      data: {
        status: AssessmentAttemptStatus.EXPIRED,
        expiredAt: now,
      },
    });
  }

  async reserveSubmissionSlot(id: string, maximum: number, now: Date): Promise<boolean> {
    const result = await this.prisma.assessmentAttempt.updateMany({
      where: {
        id,
        status: AssessmentAttemptStatus.ACTIVE,
        expiresAt: { gt: now },
        submissionCount: { lt: maximum },
      },
      data: { submissionCount: { increment: 1 } },
    });

    return result.count === 1;
  }

  async reservePreviewExecutionSlot(id: string, maximum: number, now: Date): Promise<boolean> {
    const result = await this.prisma.assessmentAttempt.updateMany({
      where: {
        id,
        status: AssessmentAttemptStatus.ACTIVE,
        expiresAt: { gt: now },
        previewExecutionCount: { lt: maximum },
      },
      data: { previewExecutionCount: { increment: 1 } },
    });

    return result.count === 1;
  }

  async releaseSubmissionSlot(id: string): Promise<void> {
    await this.prisma.assessmentAttempt.updateMany({
      where: { id, submissionCount: { gt: 0 } },
      data: { submissionCount: { decrement: 1 } },
    });
  }

  private toDomain(attempt: Prisma.AssessmentAttemptModel): AssessmentAttempt {
    return {
      ...attempt,
      status: attempt.status as AssessmentAttempt['status'],
      score: attempt.score === null ? null : Number(attempt.score),
    };
  }
}
