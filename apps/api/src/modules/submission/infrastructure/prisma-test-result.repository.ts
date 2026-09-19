import { Injectable } from '@nestjs/common';
import { TestResultStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { SaveTestResultData, TestResult } from '../domain/test-result';
import { TestResultRepository } from '../domain/test-result.repository';

@Injectable()
export class PrismaTestResultRepository implements TestResultRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: SaveTestResultData): Promise<TestResult> {
    const persistenceData = {
      status: data.status as TestResultStatus,
      stdout: data.stdout,
      stderr: data.stderr,
      compileOutput: data.compileOutput,
      executionTimeMs: data.executionTimeMs,
      memoryKb: data.memoryKb,
    };
    const testResult = await this.prisma.testResult.upsert({
      where: {
        submissionId_testCaseId: {
          submissionId: data.submissionId,
          testCaseId: data.testCaseId,
        },
      },
      create: {
        submissionId: data.submissionId,
        testCaseId: data.testCaseId,
        ...persistenceData,
      },
      update: persistenceData,
    });

    return this.toDomain(testResult);
  }

  async findBySubmissionId(submissionId: string): Promise<TestResult[]> {
    const testResults = await this.prisma.testResult.findMany({
      where: { submissionId },
      orderBy: { testCase: { position: 'asc' } },
    });

    return testResults.map((testResult) => this.toDomain(testResult));
  }

  private toDomain(testResult: Prisma.TestResultModel): TestResult {
    return {
      id: testResult.id,
      submissionId: testResult.submissionId,
      testCaseId: testResult.testCaseId,
      status: testResult.status as TestResult['status'],
      stdout: testResult.stdout,
      stderr: testResult.stderr,
      compileOutput: testResult.compileOutput,
      executionTimeMs: testResult.executionTimeMs,
      memoryKb: testResult.memoryKb,
      createdAt: testResult.createdAt,
      updatedAt: testResult.updatedAt,
    };
  }
}
