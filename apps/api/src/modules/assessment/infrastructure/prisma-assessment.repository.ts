import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  Assessment,
  AssessmentStatus,
  CreateAssessmentData,
  UpdateAssessmentData,
} from '../domain/assessment';
import { AssessmentRepository } from '../domain/assessment.repository';

@Injectable()
export class PrismaAssessmentRepository implements AssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAssessmentData): Promise<Assessment> {
    const assessment = await this.prisma.assessment.create({
      data: {
        ...data,
        status: AssessmentStatus.DRAFT,
        publishedAt: null,
      },
    });

    return this.toDomain(assessment);
  }

  async publish(id: string): Promise<Assessment> {
    const assessment = await this.prisma.assessment.update({
      where: { id },
      data: {
        status: AssessmentStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    return this.toDomain(assessment);
  }

  async update(id: string, data: UpdateAssessmentData): Promise<Assessment> {
    const assessment = await this.prisma.assessment.update({
      where: { id },
      data,
    });

    return this.toDomain(assessment);
  }

  async findAll(): Promise<Assessment[]> {
    const assessments = await this.prisma.assessment.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return assessments.map((assessment) => this.toDomain(assessment));
  }

  async findPublished(): Promise<Assessment[]> {
    const assessments = await this.prisma.assessment.findMany({
      where: { status: AssessmentStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' },
    });

    return assessments.map((assessment) => this.toDomain(assessment));
  }

  async findPublishedAssignedToUser(userId: string): Promise<Assessment[]> {
    const now = new Date();
    const assessments = await this.prisma.assessment.findMany({
      where: {
        status: AssessmentStatus.PUBLISHED,
        assignments: {
          some: {
            userId,
            availableFrom: { lte: now },
            availableUntil: { gt: now },
          },
        },
      },
      include: {
        assignments: {
          where: {
            userId,
            availableFrom: { lte: now },
            availableUntil: { gt: now },
          },
          select: { availableFrom: true, availableUntil: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    return assessments.map(({ assignments, ...assessment }) => ({
      ...this.toDomain(assessment),
      availableFrom: assignments[0]?.availableFrom,
      availableUntil: assignments[0]?.availableUntil,
    }));
  }

  async findById(id: string): Promise<Assessment | null> {
    const assessment = await this.prisma.assessment.findUnique({ where: { id } });

    return assessment ? this.toDomain(assessment) : null;
  }

  private toDomain(assessment: Prisma.AssessmentModel): Assessment {
    return {
      ...assessment,
      status: assessment.status as AssessmentStatus,
    };
  }
}
