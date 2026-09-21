import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { UserRole } from '../../auth/domain/user';
import { AuthenticatedUser } from '../../auth/security/authenticated-user';
import { JwtAuthGuard } from '../../auth/security/jwt-auth.guard';
import { Roles } from '../../auth/security/roles.decorator';
import { RolesGuard } from '../../auth/security/roles.guard';
import { RunCodeUseCase } from '../application/run-code.use-case';
import { RunCodeDto } from './dto/run-code.dto';

@Controller('assessments/:assessmentId/attempts/:attemptId/questions/:questionId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CANDIDATE)
export class CodeRunController {
  constructor(private readonly runCode: RunCodeUseCase) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  run(
    @Param('assessmentId') assessmentId: string,
    @Param('attemptId') assessmentAttemptId: string,
    @Param('questionId') questionId: string,
    @Body() dto: RunCodeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.runCode.execute({
      ...dto,
      assessmentId,
      assessmentAttemptId,
      userId: user.id,
      questionId,
    });
  }
}
