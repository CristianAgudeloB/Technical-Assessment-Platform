import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { CreateSubmissionData, Submission } from '../domain/submission';
import { SubmissionRepository } from '../domain/submission.repository';

@Injectable()
export class PrismaSubmissionRepository implements SubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSubmissionData): Promise<Submission> {
    const submission = await this.prisma.submission.create({
      data,
      select: {
        id: true,
        assessmentAttemptId: true,
        questionId: true,
        language: true,
        sourceCode: true,
        status: true,
        score: true,
        submittedAt: true,
        createdAt: true,
      },
    });

    return this.toDomain(submission);
  }

  async findById(id: string): Promise<Submission | null> {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      select: {
        id: true,
        assessmentAttemptId: true,
        questionId: true,
        language: true,
        sourceCode: true,
        status: true,
        score: true,
        submittedAt: true,
        createdAt: true,
      },
    });

    return submission ? this.toDomain(submission) : null;
  }

  async findEvaluatedByAttemptId(attemptId: string): Promise<Submission[]> {
    const submissions = await this.prisma.submission.findMany({
      where: { assessmentAttemptId: attemptId, status: 'EVALUATED' },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        assessmentAttemptId: true,
        questionId: true,
        language: true,
        sourceCode: true,
        status: true,
        score: true,
        submittedAt: true,
        createdAt: true,
      },
    });

    return submissions.map((submission) => this.toDomain(submission));
  }

  async markAsEvaluated(id: string, score: number): Promise<void> {
    await this.prisma.submission.update({
      where: { id },
      data: {
        status: 'EVALUATED',
        score,
        submittedAt: new Date(),
      },
    });
  }

  async claimForExecution(id: string): Promise<boolean> {
    const result = await this.prisma.submission.updateMany({
      where: { id, status: 'DRAFT' },
      data: { status: 'PENDING' },
    });

    return result.count === 1;
  }

  async releaseExecutionClaim(id: string): Promise<void> {
    await this.prisma.submission.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'DRAFT' },
    });
  }

  private toDomain(
    submission: Pick<
      Prisma.SubmissionModel,
      | 'id'
      | 'assessmentAttemptId'
      | 'questionId'
      | 'language'
      | 'sourceCode'
      | 'status'
      | 'score'
      | 'submittedAt'
      | 'createdAt'
    >,
  ): Submission {
    return {
      ...submission,
      language: submission.language as Submission['language'],
      status: submission.status as Submission['status'],
      score: submission.score ? Number(submission.score) : null,
    };
  }
}
