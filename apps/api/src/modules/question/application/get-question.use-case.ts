import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../../shared/domain/errors/domain-errors';
import { Question } from '../domain/question';
import {
  QUESTION_REPOSITORY,
  QuestionRepository,
} from '../domain/question.repository';

@Injectable()
export class GetQuestionUseCase {
  constructor(
    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
  ) {}

  async execute(id: string): Promise<Question> {
    const question = await this.questionRepository.findById(id);

    if (!question) {
      throw new EntityNotFoundError('Question', id);
    }

    return question;
  }
}
