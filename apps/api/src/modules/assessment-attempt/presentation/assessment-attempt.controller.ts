import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { GetAssessmentAttemptUseCase } from '../application/get-assessment-attempt.use-case';
import { StartAssessmentAttemptUseCase } from '../application/start-assessment-attempt.use-case';

@Controller('assessments/:assessmentId/attempts')
export class AssessmentAttemptController {
  constructor(
    private readonly startAttempt: StartAssessmentAttemptUseCase,
    private readonly getAttempt: GetAssessmentAttemptUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async start(@Param('assessmentId') assessmentId: string) {
    const attempt = await this.startAttempt.execute(assessmentId);
    return { ...attempt, serverTime: new Date().toISOString() };
  }

  @Get(':attemptId')
  async findOne(
    @Param('assessmentId') assessmentId: string,
    @Param('attemptId') attemptId: string,
  ) {
    const attempt = await this.getAttempt.execute(assessmentId, attemptId);
    return { ...attempt, serverTime: new Date().toISOString() };
  }
}
