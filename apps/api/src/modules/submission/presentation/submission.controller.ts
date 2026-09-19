import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CreateSubmissionUseCase } from '../application/create-submission.use-case';
import { ExecuteSubmissionUseCase } from '../application/execute-submission.use-case';
import { GetSubmissionResultsUseCase } from '../application/get-submission-results.use-case';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Controller('submissions')
export class SubmissionController {
  constructor(
    private readonly createSubmission: CreateSubmissionUseCase,
    private readonly executeSubmission: ExecuteSubmissionUseCase,
    private readonly getSubmissionResults: GetSubmissionResultsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSubmissionDto) {
    const submission = await this.createSubmission.execute(dto);

    return { id: submission.id };
  }

  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  execute(@Param('id') id: string) {
    return this.executeSubmission.execute(id);
  }

  @Get(':id/results')
  results(@Param('id') id: string) {
    return this.getSubmissionResults.execute(id);
  }
}
