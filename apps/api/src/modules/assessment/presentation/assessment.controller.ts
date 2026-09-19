import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CreateAssessmentUseCase } from '../application/create-assessment.use-case';
import { GetAssessmentUseCase } from '../application/get-assessment.use-case';
import { ListAssessmentsUseCase } from '../application/list-assessments.use-case';
import { PublishAssessmentUseCase } from '../application/publish-assessment.use-case';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@Controller('assessments')
export class AssessmentController {
  constructor(
    private readonly createAssessment: CreateAssessmentUseCase,
    private readonly getAssessment: GetAssessmentUseCase,
    private readonly listAssessments: ListAssessmentsUseCase,
    private readonly publishAssessment: PublishAssessmentUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateAssessmentDto) {
    return this.createAssessment.execute(dto);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.publishAssessment.execute(id);
  }

  @Get()
  findAll() {
    return this.listAssessments.execute();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.getAssessment.execute(id);
  }
}
