import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { AuthenticatedUser } from '../../auth/security/authenticated-user';
import { JwtAuthGuard } from '../../auth/security/jwt-auth.guard';
import { Roles } from '../../auth/security/roles.decorator';
import { RolesGuard } from '../../auth/security/roles.guard';
import { UserRole } from '../../auth/domain/user';
import { CreateSubmissionUseCase } from '../application/create-submission.use-case';
import { ExecuteSubmissionUseCase } from '../application/execute-submission.use-case';
import { GetSubmissionResultsUseCase } from '../application/get-submission-results.use-case';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CANDIDATE)
export class SubmissionController {
  constructor(
    private readonly createSubmission: CreateSubmissionUseCase,
    private readonly executeSubmission: ExecuteSubmissionUseCase,
    private readonly getSubmissionResults: GetSubmissionResultsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSubmissionDto, @CurrentUser() user: AuthenticatedUser) {
    const submission = await this.createSubmission.execute(dto, user.id);

    return { id: submission.id };
  }

  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  execute(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.executeSubmission.execute(id, user.id);
  }

  @Get(':id/results')
  results(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.getSubmissionResults.execute(id, user.id);
  }
}
