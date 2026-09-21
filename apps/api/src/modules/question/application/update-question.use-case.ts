import { Inject, Injectable } from '@nestjs/common';
import {
  EntityNotFoundError,
  QuestionNotEditableError,
} from '../../../shared/domain/errors/domain-errors';
import { Question, UpdateQuestionData } from '../domain/question';
import {
  QUESTION_REPOSITORY,
  QuestionRepository,
} from '../domain/question.repository';

@Injectable()
export class UpdateQuestionUseCase {
  constructor(
    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
  ) {}

  async execute(id: string, data: UpdateQuestionData): Promise<Question> {
    if (!(await this.questionRepository.findById(id))) {
      throw new EntityNotFoundError('Question', id);
    }

    if (await this.questionRepository.hasTestResults(id)) {
      throw new QuestionNotEditableError(id);
    }

    return this.questionRepository.update(id, data);
  }
}
