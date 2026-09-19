export enum AssessmentAttemptStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
}

export type AssessmentAttempt = {
  id: string;
  assessmentId: string;
  status: AssessmentAttemptStatus;
  submissionCount: number;
  score: number | null;
  questionsCorrect: number;
  questionsIncorrect: number;
  completedQuestions: number;
  timeConsumedSeconds: number | null;
  startedAt: Date;
  expiresAt: Date;
  expiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAssessmentAttemptData = {
  assessmentId: string;
  startedAt: Date;
  expiresAt: Date;
};

export type AssessmentAttemptSummary = Pick<
  AssessmentAttempt,
  'score' | 'questionsCorrect' | 'questionsIncorrect' | 'completedQuestions' | 'timeConsumedSeconds'
>;
