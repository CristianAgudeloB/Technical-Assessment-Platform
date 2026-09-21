import type { ProgrammingLanguage } from '@kata/shared-types';

export type { ProgrammingLanguage };

export type DraftTestCase = {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
};

export const programmingLanguages: Array<{ value: ProgrammingLanguage; label: string }> = [
  { value: 'JAVA', label: 'Java' },
  { value: 'JAVASCRIPT', label: 'JavaScript' },
  { value: 'PYTHON', label: 'Python' },
  { value: 'TYPESCRIPT', label: 'TypeScript' },
  { value: 'COBOL', label: 'COBOL' },
];
