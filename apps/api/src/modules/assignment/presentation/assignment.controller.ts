import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '../../auth/domain/user';
import { JwtAuthGuard } from '../../auth/security/jwt-auth.guard';
import { Roles } from '../../auth/security/roles.decorator';
import { RolesGuard } from '../../auth/security/roles.guard';
import { AssignAssessmentUseCase } from '../application/assign-assessment.use-case';
import { UnassignAssessmentUseCase } from '../application/unassign-assessment.use-case';
import { ListCandidateAssignmentsUseCase } from '../application/list-candidate-assignments.use-case';
import { ListCandidatesUseCase } from '../application/list-candidates.use-case';
import { AssignAssessmentDto } from './dto/assign-assessment.dto';

@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AssignmentController {
  constructor(
    private readonly assignAssessment: AssignAssessmentUseCase,
    private readonly unassignAssessment: UnassignAssessmentUseCase,
    private readonly listCandidates: ListCandidatesUseCase,
    private readonly listCandidateAssignments: ListCandidateAssignmentsUseCase,
  ) {}

  @Get('candidates')
  candidates() {
    return this.listCandidates.execute();
  }

  @Get('candidates/:candidateId')
  assignments(@Param('candidateId') candidateId: string) {
    return this.listCandidateAssignments.execute(candidateId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  assign(@Body() dto: AssignAssessmentDto) {
    return this.assignAssessment.execute(
      dto.candidateId,
      dto.assessmentId,
      new Date(dto.availableFrom),
      new Date(dto.availableUntil),
    );
  }

  @Delete('candidates/:candidateId/assessments/:assessmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unassign(
    @Param('candidateId') candidateId: string,
    @Param('assessmentId') assessmentId: string,
  ) {
    return this.unassignAssessment.execute(candidateId, assessmentId);
  }
}
