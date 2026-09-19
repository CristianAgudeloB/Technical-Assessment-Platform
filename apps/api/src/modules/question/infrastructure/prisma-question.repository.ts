import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { DuplicateEntityError } from '../../../shared/domain/errors/domain-errors';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  CreateQuestionData,
  ProgrammingLanguage,
  Question,
  QuestionTestCase,
} from '../domain/question';
import { QuestionRepository } from '../domain/question.repository';

@Injectable()
export class PrismaQuestionRepository implements QuestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateQuestionData): Promise<Question> {
    try {
      const question = await this.prisma.question.create({
        data: {
          assessmentId: data.assessmentId,
          slug: data.slug,
          title: data.title,
          description: data.description,
          position: data.position,
          score: data.score,
          allowedLanguages: {
            create: data.allowedLanguages.map((language) => ({ language })),
          },
          testCases: {
            create: data.testCases,
          },
        },
        include: this.questionDetails,
      });

      return this.toDomain(question);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new DuplicateEntityError('Question', 'slug or position within this assessment');
      }

      throw error;
    }
  }

  async findById(id: string): Promise<Question | null> {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: this.questionDetails,
    });

    return question ? this.toDomain(question) : null;
  }

  async findByAssessmentId(assessmentId: string): Promise<Question[]> {
    const questions = await this.prisma.question.findMany({
      where: { assessmentId },
      include: this.questionDetails,
      orderBy: { position: 'asc' },
    });

    return questions.map((question) => this.toDomain(question));
  }

  private readonly questionDetails = {
    allowedLanguages: {
      select: { language: true },
      orderBy: { language: 'asc' },
    },
    testCases: {
      orderBy: { position: 'asc' },
    },
  } as const;

  private toDomain(
    question: Prisma.QuestionModel & {
      allowedLanguages: Array<{ language: string }>;
      testCases: Prisma.TestCaseModel[];
    },
  ): Question {
    return {
      id: question.id,
      assessmentId: question.assessmentId,
      slug: question.slug,
      title: question.title,
      description: question.description,
      position: question.position,
      score: Number(question.score),
      allowedLanguages: question.allowedLanguages.map(
        ({ language }) => language as ProgrammingLanguage,
      ),
      testCases: question.testCases.map((testCase) => this.toTestCase(testCase)),
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };
  }

  private toTestCase(testCase: Prisma.TestCaseModel): QuestionTestCase {
    return {
      id: testCase.id,
      position: testCase.position,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      isHidden: testCase.isHidden,
      createdAt: testCase.createdAt,
      updatedAt: testCase.updatedAt,
    };
  }

  private isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
