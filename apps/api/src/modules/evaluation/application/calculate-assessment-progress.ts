import type { Question } from '../../question/domain/question';
import type { Submission } from '../../submission/domain/submission';

export type AssessmentProgress = {
  score: number;
  totalQuestions: number;
  completedQuestions: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  questionsPending: number;
  latestSubmissionByQuestion: Map<string, Submission>;
};

export function calculateAssessmentProgress(
  questions: Question[],
  submissions: Submission[],
): AssessmentProgress {
  const latestSubmissionByQuestion = new Map<string, Submission>();

  for (const submission of submissions) {
    if (!latestSubmissionByQuestion.has(submission.questionId)) {
      latestSubmissionByQuestion.set(submission.questionId, submission);
    }
  }

  const completedQuestions = latestSubmissionByQuestion.size;
  const questionsCorrect = [...latestSubmissionByQuestion.values()].filter(
    (submission) => submission.score === 100,
  ).length;
  const questionsIncorrect = completedQuestions - questionsCorrect;
  const maximumScore = questions.reduce((total, question) => total + question.score, 0);
  const earnedScore = questions.reduce((total, question) => {
    const score = latestSubmissionByQuestion.get(question.id)?.score ?? 0;
    return total + question.score * (score / 100);
  }, 0);

  return {
    score: maximumScore === 0 ? 0 : roundScore((earnedScore / maximumScore) * 100),
    totalQuestions: questions.length,
    completedQuestions,
    questionsCorrect,
    questionsIncorrect,
    questionsPending: Math.max(0, questions.length - completedQuestions),
    latestSubmissionByQuestion,
  };
}

function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
}
