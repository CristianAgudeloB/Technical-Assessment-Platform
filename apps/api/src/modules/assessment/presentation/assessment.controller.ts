import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { UserRole } from '../../auth/domain/user';
import { AuthenticatedUser } from '../../auth/security/authenticated-user';
import { JwtAuthGuard } from '../../auth/security/jwt-auth.guard';
import { Roles } from '../../auth/security/roles.decorator';
import { RolesGuard } from '../../auth/security/roles.guard';
import { CreateAssessmentUseCase } from '../application/create-assessment.use-case';
import { GetAssessmentUseCase } from '../application/get-assessment.use-case';
import { ListAssessmentsUseCase } from '../application/list-assessments.use-case';
import { PublishAssessmentUseCase } from '../application/publish-assessment.use-case';
import { UpdateAssessmentUseCase } from '../application/update-assessment.use-case';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';

@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentController {
  constructor(
    private readonly createAssessment: CreateAssessmentUseCase,
    private readonly getAssessment: GetAssessmentUseCase,
    private readonly listAssessments: ListAssessmentsUseCase,
    private readonly publishAssessment: PublishAssessmentUseCase,
    private readonly updateAssessment: UpdateAssessmentUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateAssessmentDto) {
    return this.createAssessment.execute(dto);
  }

  @Post(':id/publish')
  @Roles(UserRole.ADMIN)
  publish(@Param('id') id: string) {
    return this.publishAssessment.execute(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateAssessmentDto) {
    return this.updateAssessment.execute(id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.listAssessments.execute(user.role === UserRole.CANDIDATE ? user.id : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.getAssessment.execute(id, user.role === UserRole.CANDIDATE ? user.id : undefined);
  }
}
