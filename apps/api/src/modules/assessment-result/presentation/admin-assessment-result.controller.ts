import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '../../auth/domain/user';
import { JwtAuthGuard } from '../../auth/security/jwt-auth.guard';
import { Roles } from '../../auth/security/roles.decorator';
import { RolesGuard } from '../../auth/security/roles.guard';
import { ListAdminAssessmentResultsUseCase } from '../application/list-admin-assessment-results.use-case';
import { GetAdminAssessmentResultDetailUseCase } from '../application/get-admin-assessment-result-detail.use-case';

@Controller('admin/results')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAssessmentResultController {
  constructor(
    private readonly listResults: ListAdminAssessmentResultsUseCase,
    private readonly getResultDetail: GetAdminAssessmentResultDetailUseCase,
  ) {}

  @Get()
  results() {
    return this.listResults.execute();
  }

  @Get(':attemptId')
  detail(@Param('attemptId') attemptId: string) {
    return this.getResultDetail.execute(attemptId);
  }
}
