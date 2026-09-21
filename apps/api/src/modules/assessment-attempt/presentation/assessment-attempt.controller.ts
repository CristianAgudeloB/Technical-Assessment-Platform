import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { AuthenticatedUser } from '../../auth/security/authenticated-user';
import { JwtAuthGuard } from '../../auth/security/jwt-auth.guard';
import { Roles } from '../../auth/security/roles.decorator';
import { RolesGuard } from '../../auth/security/roles.guard';
import { UserRole } from '../../auth/domain/user';
import { GetAssessmentAttemptUseCase } from '../application/get-assessment-attempt.use-case';
import { GetCurrentAssessmentAttemptUseCase } from '../application/get-current-assessment-attempt.use-case';
import { StartAssessmentAttemptUseCase } from '../application/start-assessment-attempt.use-case';

@Controller('assessments/:assessmentId/attempts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CANDIDATE)
export class AssessmentAttemptController {
  constructor(
    private readonly startAttempt: StartAssessmentAttemptUseCase,
    private readonly getAttempt: GetAssessmentAttemptUseCase,
    private readonly getCurrentAttempt: GetCurrentAssessmentAttemptUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async start(@Param('assessmentId') assessmentId: string, @CurrentUser() user: AuthenticatedUser) {
    const attempt = await this.startAttempt.execute(assessmentId, user.id);
    return { ...attempt, serverTime: new Date().toISOString() };
  }

  @Get('current')
  async current(@Param('assessmentId') assessmentId: string, @CurrentUser() user: AuthenticatedUser) {
    const attempt = await this.getCurrentAttempt.execute(assessmentId, user.id);
    return attempt ? { ...attempt, serverTime: new Date().toISOString() } : null;
  }

  @Get(':attemptId')
  async findOne(
    @Param('assessmentId') assessmentId: string,
    @Param('attemptId') attemptId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const attempt = await this.getAttempt.execute(assessmentId, attemptId, user.id);
    return { ...attempt, serverTime: new Date().toISOString() };
  }
}
