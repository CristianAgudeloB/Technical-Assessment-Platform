export type DemoProgrammingLanguage =
  | 'JAVA'
  | 'JAVASCRIPT'
  | 'PYTHON'
  | 'TYPESCRIPT'
  | 'COBOL';

type DemoTestCase = {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
};

type DemoQuestion = {
  title: string;
  description: string;
  score: number;
  languages: DemoProgrammingLanguage[];
  testCases: DemoTestCase[];
};

export type DemoAssessment = {
  name: string;
  description: string;
  durationMinutes: number;
  questions: DemoQuestion[];
};

const traineeLanguages: DemoProgrammingLanguage[] = [
  'JAVA',
  'JAVASCRIPT',
  'PYTHON',
  'TYPESCRIPT',
];

export const supplementalDemoAssessments: DemoAssessment[] = [
  {
    name: 'Assessment Trainee',
    description: 'Reto introductorio para practicar lectura de datos, operaciones aritméticas y decisiones básicas.',
    durationMinutes: 60,
    questions: [
      {
        title: 'Suma de dos números',
        description: 'Lee dos números enteros separados por espacios e imprime su suma.',
        score: 20,
        languages: traineeLanguages,
        testCases: [
          { input: '2 3\n', expectedOutput: '5\n', isHidden: false },
          { input: '-4 10\n', expectedOutput: '6\n', isHidden: true },
          { input: '0 0\n', expectedOutput: '0\n', isHidden: true },
        ],
      },
      {
        title: 'Mayor de dos números',
        description: 'Lee dos números enteros separados por espacios e imprime el valor mayor. Si son iguales, imprime ese mismo valor.',
        score: 20,
        languages: traineeLanguages,
        testCases: [
          { input: '8 3\n', expectedOutput: '8\n', isHidden: false },
          { input: '-2 -7\n', expectedOutput: '-2\n', isHidden: true },
          { input: '5 5\n', expectedOutput: '5\n', isHidden: true },
        ],
      },
      {
        title: 'Número par o impar',
        description: 'Lee un número entero. Imprime PAR si es divisible entre 2; de lo contrario, imprime IMPAR.',
        score: 20,
        languages: traineeLanguages,
        testCases: [
          { input: '4\n', expectedOutput: 'PAR\n', isHidden: false },
          { input: '17\n', expectedOutput: 'IMPAR\n', isHidden: true },
          { input: '0\n', expectedOutput: 'PAR\n', isHidden: true },
        ],
      },
      {
        title: 'Área de un rectángulo',
        description: 'Lee la base y la altura de un rectángulo como números enteros separados por espacios. Imprime su área.',
        score: 20,
        languages: traineeLanguages,
        testCases: [
          { input: '4 6\n', expectedOutput: '24\n', isHidden: false },
          { input: '5 5\n', expectedOutput: '25\n', isHidden: true },
          { input: '1 9\n', expectedOutput: '9\n', isHidden: true },
        ],
      },
      {
        title: 'Contar vocales',
        description: 'Lee una palabra formada por letras minúsculas. Imprime cuántas vocales contiene. Considera como vocales a, e, i, o y u.',
        score: 20,
        languages: traineeLanguages,
        testCases: [
          { input: 'casa\n', expectedOutput: '2\n', isHidden: false },
          { input: 'murcielago\n', expectedOutput: '5\n', isHidden: true },
          { input: 'rhythm\n', expectedOutput: '0\n', isHidden: true },
        ],
      },
    ],
  },
  {
    name: 'Assessment COBOL',
    description: 'Reto breve de fundamentos de COBOL: entrada estándar, cálculos y decisiones condicionales.',
    durationMinutes: 40,
    questions: [
      {
        title: 'Suma de dos enteros',
        description: 'Lee dos números enteros separados por espacios e imprime la suma de ambos.',
        score: 34,
        languages: ['COBOL'],
        testCases: [
          { input: '7 5\n', expectedOutput: '12\n', isHidden: false },
          { input: '-3 8\n', expectedOutput: '5\n', isHidden: true },
          { input: '0 0\n', expectedOutput: '0\n', isHidden: true },
        ],
      },
      {
        title: 'Mayor de dos enteros',
        description: 'Lee dos números enteros separados por espacios e imprime el número mayor. Si son iguales, imprime ese mismo número.',
        score: 33,
        languages: ['COBOL'],
        testCases: [
          { input: '9 2\n', expectedOutput: '9\n', isHidden: false },
          { input: '4 11\n', expectedOutput: '11\n', isHidden: true },
          { input: '6 6\n', expectedOutput: '6\n', isHidden: true },
        ],
      },
      {
        title: 'Área de un rectángulo',
        description: 'Lee la base y la altura de un rectángulo como números enteros separados por espacios. Imprime el área resultante.',
        score: 33,
        languages: ['COBOL'],
        testCases: [
          { input: '3 8\n', expectedOutput: '24\n', isHidden: false },
          { input: '7 2\n', expectedOutput: '14\n', isHidden: true },
          { input: '1 1\n', expectedOutput: '1\n', isHidden: true },
        ],
      },
    ],
  },
];
