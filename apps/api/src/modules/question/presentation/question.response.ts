import { Question, QuestionTestCase } from '../domain/question';

/** Candidate-safe projection. Only explicitly public examples include input and expected output. */
export function toQuestionResponse(question: Question) {
  return {
    id: question.id,
    assessmentId: question.assessmentId,
    title: question.title,
    description: question.description,
    position: question.position,
    score: question.score,
    allowedLanguages: question.allowedLanguages,
    testCases: question.testCases.map(toCandidateTestCase),
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
}

function toCandidateTestCase(testCase: QuestionTestCase) {
  const metadata = {
    id: testCase.id,
    position: testCase.position,
  };

  return testCase.isHidden
    ? { ...metadata, isHidden: true as const }
    : {
        ...metadata,
        isHidden: false as const,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
      };
}

/** Full projection used only by the protected administrative editor. */
export function toAdminQuestionResponse(question: Question) {
  return {
    ...toQuestionResponse(question),
    testCases: question.testCases.map((testCase) => ({
      id: testCase.id,
      position: testCase.position,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      isHidden: testCase.isHidden,
    })),
  };
}
