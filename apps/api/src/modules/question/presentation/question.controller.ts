import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { UserRole } from '../../auth/domain/user';
import { AuthenticatedUser } from '../../auth/security/authenticated-user';
import { JwtAuthGuard } from '../../auth/security/jwt-auth.guard';
import { Roles } from '../../auth/security/roles.decorator';
import { RolesGuard } from '../../auth/security/roles.guard';
import { GetQuestionUseCase } from '../application/get-question.use-case';
import { UpdateQuestionUseCase } from '../application/update-question.use-case';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { toAdminQuestionResponse, toQuestionResponse } from './question.response';

@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuestionController {
  constructor(
    private readonly getQuestion: GetQuestionUseCase,
    private readonly updateQuestion: UpdateQuestionUseCase,
  ) {}

  @Get(':id/edit')
  @Roles(UserRole.ADMIN)
  async findForEdit(@Param('id') id: string) {
    return toAdminQuestionResponse(await this.getQuestion.execute(id));
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return toAdminQuestionResponse(await this.updateQuestion.execute(id, dto));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return toQuestionResponse(await this.getQuestion.execute(id, user.role === UserRole.CANDIDATE ? user.id : undefined));
  }
}
