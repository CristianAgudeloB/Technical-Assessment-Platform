import { ProgrammingLanguage } from '../../question/domain/question';

export type Submission = {
  id: string;
  assessmentAttemptId: string | null;
  questionId: string;
  language: ProgrammingLanguage;
  sourceCode: string;
  status: 'DRAFT' | 'PENDING' | 'EVALUATED';
  score: number | null;
  submittedAt: Date | null;
  createdAt: Date;
};

export type CreateSubmissionData = Pick<
  Submission,
  'assessmentAttemptId' | 'questionId' | 'language' | 'sourceCode'
>;
