import { CreateQuestionData, Question, UpdateQuestionData } from './question';

export const QUESTION_REPOSITORY = Symbol('QUESTION_REPOSITORY');

export interface QuestionRepository {
  create(data: CreateQuestionData): Promise<Question>;
  update(id: string, data: UpdateQuestionData): Promise<Question>;
  findById(id: string): Promise<Question | null>;
  findByAssessmentId(assessmentId: string): Promise<Question[]>;
  hasTestResults(id: string): Promise<boolean>;
}
