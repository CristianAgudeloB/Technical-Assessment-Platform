import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { supplementalDemoAssessments, type DemoAssessment } from '../src/scripts/supplemental-demo-assessments.js';

config({ path: '../../.env' });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

type Language = 'JAVA' | 'JAVASCRIPT' | 'PYTHON' | 'TYPESCRIPT' | 'COBOL';
type TestCase = { input: string; expectedOutput: string; isHidden: boolean };
type Question = {
  title: string;
  description: string;
  score: number;
  languages: Language[];
  testCases: TestCase[];
};

const assessments: DemoAssessment[] = [
  {
    name: 'Algoritmos esenciales',
    description: 'Evalúa razonamiento básico, recorridos lineales y manipulación segura de texto.',
    durationMinutes: 45,
    questions: [
      {
        title: 'Valor máximo de un arreglo',
        description: 'Lee n y luego n enteros separados por espacios. Imprime el valor más grande.',
        score: 50,
        languages: ['JAVA', 'JAVASCRIPT', 'PYTHON'],
        testCases: [
          { input: '4\n3 5 1 8\n', expectedOutput: '8\n', isHidden: false },
          { input: '5\n-10 -3 -20 -7 -1\n', expectedOutput: '-1\n', isHidden: true },
          { input: '1\n42\n', expectedOutput: '42\n', isHidden: true },
        ],
      },
      {
        title: 'Detector de anagramas',
        description: 'Lee dos palabras en minúsculas. Imprime true si contienen las mismas letras con la misma frecuencia; de lo contrario, imprime false.',
        score: 50,
        languages: ['JAVA', 'JAVASCRIPT', 'PYTHON'],
        testCases: [
          { input: 'roma\namor\n', expectedOutput: 'true\n', isHidden: false },
          { input: 'listen\nsilent\n', expectedOutput: 'true\n', isHidden: true },
          { input: 'casa\ncasas\n', expectedOutput: 'false\n', isHidden: true },
        ],
      },
    ],
  },
  {
    name: 'Colecciones y validación',
    description: 'Reto orientado a estructuras de datos, secuencias y validación de entradas.',
    durationMinutes: 50,
    questions: [
      {
        title: 'Paréntesis balanceados',
        description: 'Lee una cadena formada únicamente por ( y ). Imprime true si todos los paréntesis están correctamente balanceados; de lo contrario, imprime false.',
        score: 50,
        languages: ['JAVA', 'JAVASCRIPT', 'PYTHON'],
        testCases: [
          { input: '(()())\n', expectedOutput: 'true\n', isHidden: false },
          { input: '(()\n', expectedOutput: 'false\n', isHidden: true },
          { input: ')()(\n', expectedOutput: 'false\n', isHidden: true },
        ],
      },
      {
        title: 'Números únicos ordenados',
        description: 'Lee n y luego n enteros. Elimina duplicados, ordena de menor a mayor e imprime los valores separados por un espacio.',
        score: 50,
        languages: ['JAVA', 'JAVASCRIPT', 'PYTHON'],
        testCases: [
          { input: '6\n4 2 4 1 2 3\n', expectedOutput: '1 2 3 4\n', isHidden: false },
          { input: '5\n-1 -1 -2 0 -2\n', expectedOutput: '-2 -1 0\n', isHidden: true },
          { input: '1\n9\n', expectedOutput: '9\n', isHidden: true },
        ],
      },
    ],
  },
  {
    name: 'Transformación de datos',
    description: 'Ejercicios de resolución práctica para transformar colecciones y buscar resultados.',
    durationMinutes: 55,
    questions: [
      {
        title: 'Índices de una suma objetivo',
        description: 'Lee n, un objetivo y luego n enteros. Imprime los primeros dos índices distintos cuya suma sea el objetivo, en orden ascendente. Si no existen, imprime -1 -1.',
        score: 50,
        languages: ['JAVA', 'JAVASCRIPT', 'PYTHON'],
        testCases: [
          { input: '4\n9\n2 7 11 15\n', expectedOutput: '0 1\n', isHidden: false },
          { input: '5\n6\n3 3 4 1 5\n', expectedOutput: '0 1\n', isHidden: true },
          { input: '3\n100\n1 2 3\n', expectedOutput: '-1 -1\n', isHidden: true },
        ],
      },
      {
        title: 'Suma acumulada',
        description: 'Lee n y luego n enteros. Imprime una nueva secuencia donde cada posición contiene la suma de todos los valores hasta esa posición.',
        score: 50,
        languages: ['JAVA', 'JAVASCRIPT', 'PYTHON'],
        testCases: [
          { input: '4\n2 3 -1 5\n', expectedOutput: '2 5 4 9\n', isHidden: false },
          { input: '3\n-2 -3 -4\n', expectedOutput: '-2 -5 -9\n', isHidden: true },
          { input: '1\n7\n', expectedOutput: '7\n', isHidden: true },
        ],
      },
    ],
  },
  ...supplementalDemoAssessments,
];

async function clearDemoData() {
  await prisma.$transaction([
    prisma.testResult.deleteMany(),
    prisma.submission.deleteMany(),
    prisma.assessmentAttempt.deleteMany(),
    prisma.assessmentAssignment.deleteMany(),
    prisma.questionAllowedLanguage.deleteMany(),
    prisma.testCase.deleteMany(),
    prisma.question.deleteMany(),
    prisma.assessment.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function createAssessment(input: (typeof assessments)[number]) {
  const assessment = await prisma.assessment.create({
    data: {
      name: input.name,
      description: input.description,
      durationMinutes: input.durationMinutes,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });

  for (const [index, question] of input.questions.entries()) {
    await prisma.question.create({
      data: {
        assessmentId: assessment.id,
        title: question.title,
        description: question.description,
        position: index + 1,
        score: question.score,
        allowedLanguages: { create: question.languages.map((language) => ({ language })) },
        testCases: {
          create: question.testCases.map((testCase, testIndex) => ({
            position: testIndex + 1,
            ...testCase,
          })),
        },
      },
    });
  }

  return assessment;
}

async function main() {
  await clearDemoData();
  const createdAssessments = await Promise.all(assessments.map(createAssessment));

  const passwordHash = await bcrypt.hash('admin123', 12);
  await prisma.user.create({
    data: {
      email: 'admin@admin.com',
      displayName: 'Administrador',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const candidate = await prisma.user.create({
    data: {
      email: 'camila.torres@example.test',
      displayName: 'Camila Torres',
      passwordHash,
      role: 'CANDIDATE',
    },
  });

  const availableFrom = new Date();
  availableFrom.setDate(availableFrom.getDate() - 1);
  const availableUntil = new Date();
  availableUntil.setDate(availableUntil.getDate() + 14);

  await prisma.assessmentAssignment.createMany({
    data: createdAssessments.slice(0, 2).map((assessment) => ({
      userId: candidate.id,
      assessmentId: assessment.id,
      availableFrom,
      availableUntil,
    })),
  });

  console.log(`Seed completed with ${assessments.length} realistic assessments, local admin access and candidate assignments.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
