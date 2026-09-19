import { Question } from '../domain/question';

/** Candidate-safe projection. Test inputs and expected outputs never leave the API. */
export function toQuestionResponse(question: Question) {
  return {
    id: question.id,
    assessmentId: question.assessmentId,
    slug: question.slug,
    title: question.title,
    description: question.description,
    position: question.position,
    score: question.score,
    allowedLanguages: question.allowedLanguages,
    testCases: question.testCases.map((testCase) => ({
      id: testCase.id,
      position: testCase.position,
      isHidden: testCase.isHidden,
    })),
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
}
