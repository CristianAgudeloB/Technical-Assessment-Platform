export enum AssessmentAttemptStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

export type AssessmentAttempt = {
  id: string;
  assessmentId: string;
  userId: string | null;
  status: AssessmentAttemptStatus;
  submissionCount: number;
  previewExecutionCount: number;
  score: number | null;
  questionsCorrect: number;
  questionsIncorrect: number;
  completedQuestions: number;
  timeConsumedSeconds: number | null;
  startedAt: Date;
  expiresAt: Date;
  completedAt: Date | null;
  expiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAssessmentAttemptData = {
  assessmentId: string;
  userId: string;
  startedAt: Date;
  expiresAt: Date;
};

export type AssessmentAttemptSummary = Pick<
  AssessmentAttempt,
  'score' | 'questionsCorrect' | 'questionsIncorrect' | 'completedQuestions' | 'timeConsumedSeconds'
>;

export type AdminAssessmentResult = Pick<
  AssessmentAttempt,
  | 'id'
  | 'status'
  | 'score'
  | 'questionsCorrect'
  | 'questionsIncorrect'
  | 'completedQuestions'
  | 'timeConsumedSeconds'
  | 'startedAt'
  | 'completedAt'
  | 'expiredAt'
> & {
  candidate: {
    id: string;
    displayName: string;
    email: string;
  };
  assessment: {
    id: string;
    name: string;
  };
};
