import { CreateQuestionData, Question } from './question';

export const QUESTION_REPOSITORY = Symbol('QUESTION_REPOSITORY');

export interface QuestionRepository {
  create(data: CreateQuestionData): Promise<Question>;
  findById(id: string): Promise<Question | null>;
  findByAssessmentId(assessmentId: string): Promise<Question[]>;
}
