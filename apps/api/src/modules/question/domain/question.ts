export enum ProgrammingLanguage {
  JAVA = 'JAVA',
  JAVASCRIPT = 'JAVASCRIPT',
  PYTHON = 'PYTHON',
  TYPESCRIPT = 'TYPESCRIPT',
  COBOL = 'COBOL',
}

export type QuestionTestCase = {
  id: string;
  position: number;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Question = {
  id: string;
  assessmentId: string;
  title: string;
  description: string;
  position: number;
  score: number;
  allowedLanguages: ProgrammingLanguage[];
  testCases: QuestionTestCase[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreateQuestionData = Omit<
  Question,
  'id' | 'createdAt' | 'updatedAt' | 'allowedLanguages' | 'testCases'
> & {
  allowedLanguages: ProgrammingLanguage[];
  testCases: Array<
    Pick<QuestionTestCase, 'position' | 'input' | 'expectedOutput' | 'isHidden'>
  >;
};

export type UpdateQuestionData = Omit<CreateQuestionData, 'assessmentId'>;
