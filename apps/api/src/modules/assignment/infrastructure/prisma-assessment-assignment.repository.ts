import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  AssessmentAssignment,
  CreateAssessmentAssignmentData,
} from '../domain/assessment-assignment';
import { AssessmentAssignmentRepository } from '../domain/assessment-assignment.repository';

@Injectable()
export class PrismaAssessmentAssignmentRepository implements AssessmentAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async assign(data: CreateAssessmentAssignmentData): Promise<AssessmentAssignment> {
    const assignment = await this.prisma.assessmentAssignment.upsert({
      where: {
        userId_assessmentId: {
          userId: data.userId,
          assessmentId: data.assessmentId,
        },
      },
      create: data,
      update: {
        availableFrom: data.availableFrom,
        availableUntil: data.availableUntil,
      },
    });

    return this.toDomain(assignment);
  }

  async unassign(userId: string, assessmentId: string): Promise<void> {
    await this.prisma.assessmentAssignment.deleteMany({
      where: { userId, assessmentId },
    });
  }

  async findByUserId(userId: string): Promise<AssessmentAssignment[]> {
    const assignments = await this.prisma.assessmentAssignment.findMany({
      where: { userId },
      orderBy: { assignedAt: 'desc' },
    });

    return assignments.map((assignment) => this.toDomain(assignment));
  }

  async findAvailable(
    userId: string,
    assessmentId: string,
    now = new Date(),
  ): Promise<AssessmentAssignment | null> {
    const assignment = await this.prisma.assessmentAssignment.findFirst({
      where: {
        userId,
        assessmentId,
        availableFrom: { lte: now },
        availableUntil: { gt: now },
      },
    });

    return assignment ? this.toDomain(assignment) : null;
  }

  private toDomain(assignment: Prisma.AssessmentAssignmentModel): AssessmentAssignment {
    return assignment;
  }
}
