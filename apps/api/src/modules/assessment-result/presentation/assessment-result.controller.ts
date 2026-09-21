import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { UserRole } from '../../auth/domain/user';
import { AuthenticatedUser } from '../../auth/security/authenticated-user';
import { JwtAuthGuard } from '../../auth/security/jwt-auth.guard';
import { Roles } from '../../auth/security/roles.decorator';
import { RolesGuard } from '../../auth/security/roles.guard';
import { GetAssessmentResultUseCase } from '../application/get-assessment-result.use-case';

@Controller('assessments/:assessmentId/attempts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CANDIDATE)
export class AssessmentResultController {
  constructor(private readonly getAssessmentResult: GetAssessmentResultUseCase) {}

  @Get(':attemptId/results')
  getResults(
    @Param('assessmentId') assessmentId: string,
    @Param('attemptId') attemptId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.getAssessmentResult.execute(assessmentId, attemptId, user.id);
  }
}
