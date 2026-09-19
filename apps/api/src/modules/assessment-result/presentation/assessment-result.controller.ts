import { Controller, Get, Param } from '@nestjs/common';
import { GetAssessmentResultUseCase } from '../application/get-assessment-result.use-case';

@Controller('assessments/:assessmentId/attempts')
export class AssessmentResultController {
  constructor(private readonly getAssessmentResult: GetAssessmentResultUseCase) {}

  @Get(':attemptId/results')
  getResults(
    @Param('assessmentId') assessmentId: string,
    @Param('attemptId') attemptId: string,
  ) {
    return this.getAssessmentResult.execute(assessmentId, attemptId);
  }
}
