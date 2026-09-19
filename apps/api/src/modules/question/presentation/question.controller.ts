import { Controller, Get, Param } from '@nestjs/common';
import { GetQuestionUseCase } from '../application/get-question.use-case';
import { toQuestionResponse } from './question.response';

@Controller('questions')
export class QuestionController {
  constructor(private readonly getQuestion: GetQuestionUseCase) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return toQuestionResponse(await this.getQuestion.execute(id));
  }
}
