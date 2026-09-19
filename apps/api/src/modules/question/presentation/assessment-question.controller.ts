import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CreateQuestionUseCase } from '../application/create-question.use-case';
import { ListAssessmentQuestionsUseCase } from '../application/list-assessment-questions.use-case';
import { CreateQuestionDto } from './dto/create-question.dto';
import { toQuestionResponse } from './question.response';

@Controller('assessments/:assessmentId/questions')
export class AssessmentQuestionController {
  constructor(
    private readonly createQuestion: CreateQuestionUseCase,
    private readonly listAssessmentQuestions: ListAssessmentQuestionsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return toQuestionResponse(await this.createQuestion.execute({ ...dto, assessmentId }));
  }

  @Get()
  async findAll(@Param('assessmentId') assessmentId: string) {
    const questions = await this.listAssessmentQuestions.execute(assessmentId);
    return questions.map(toQuestionResponse);
  }
}
