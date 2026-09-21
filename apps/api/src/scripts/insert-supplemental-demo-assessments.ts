import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { supplementalDemoAssessments, type DemoAssessment } from './supplemental-demo-assessments.js';

config({ path: '../../.env' });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function insertAssessment(input: DemoAssessment) {
  const existing = await prisma.assessment.findFirst({ where: { name: input.name } });
  if (existing) return false;

  await prisma.assessment.create({
    data: {
      name: input.name,
      description: input.description,
      durationMinutes: input.durationMinutes,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      questions: {
        create: input.questions.map((question, questionIndex) => ({
          title: question.title,
          description: question.description,
          position: questionIndex + 1,
          score: question.score,
          allowedLanguages: { create: question.languages.map((language) => ({ language })) },
          testCases: {
            create: question.testCases.map((testCase, testCaseIndex) => ({
              ...testCase,
              position: testCaseIndex + 1,
            })),
          },
        })),
      },
    },
  });

  return true;
}

async function main() {
  let inserted = 0;
  for (const assessment of supplementalDemoAssessments) {
    if (await insertAssessment(assessment)) inserted += 1;
  }

  console.log(`${inserted} assessment(s) inserted; existing assessments were left unchanged.`);
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
