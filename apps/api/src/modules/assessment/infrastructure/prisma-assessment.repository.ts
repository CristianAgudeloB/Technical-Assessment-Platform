import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { DuplicateEntityError } from '../../../shared/domain/errors/domain-errors';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  Assessment,
  AssessmentStatus,
  CreateAssessmentData,
} from '../domain/assessment';
import { AssessmentRepository } from '../domain/assessment.repository';

@Injectable()
export class PrismaAssessmentRepository implements AssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAssessmentData): Promise<Assessment> {
    try {
      const assessment = await this.prisma.assessment.create({
        data: {
          ...data,
          status: AssessmentStatus.DRAFT,
          publishedAt: null,
        },
      });

      return this.toDomain(assessment);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new DuplicateEntityError('Assessment', 'slug');
      }

      throw error;
    }
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

  async findAll(): Promise<Assessment[]> {
    const assessments = await this.prisma.assessment.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return assessments.map((assessment) => this.toDomain(assessment));
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

  private isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
