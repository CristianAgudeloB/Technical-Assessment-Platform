import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { UserRole } from '../../auth/domain/user';
import { AuthenticatedUser } from '../../auth/security/authenticated-user';
import { JwtAuthGuard } from '../../auth/security/jwt-auth.guard';
import { Roles } from '../../auth/security/roles.decorator';
import { RolesGuard } from '../../auth/security/roles.guard';
import { CreateQuestionUseCase } from '../application/create-question.use-case';
import { ListAssessmentQuestionsUseCase } from '../application/list-assessment-questions.use-case';
import { CreateQuestionDto } from './dto/create-question.dto';
import { toQuestionResponse } from './question.response';

@Controller('assessments/:assessmentId/questions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentQuestionController {
  constructor(
    private readonly createQuestion: CreateQuestionUseCase,
    private readonly listAssessmentQuestions: ListAssessmentQuestionsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  async create(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return toQuestionResponse(await this.createQuestion.execute({ ...dto, assessmentId }));
  }

  @Get()
  async findAll(@Param('assessmentId') assessmentId: string, @CurrentUser() user: AuthenticatedUser) {
    const questions = await this.listAssessmentQuestions.execute(
      assessmentId,
      user.role === UserRole.CANDIDATE ? user.id : undefined,
    );
    return questions.map(toQuestionResponse);
  }
}
