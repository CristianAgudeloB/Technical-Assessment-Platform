import { Inject, Injectable } from '@nestjs/common';
import {
  AssessmentNotEditableError,
  EntityNotFoundError,
} from '../../../shared/domain/errors/domain-errors';
import { AssessmentStatus } from '../../assessment/domain/assessment';
import {
  ASSESSMENT_REPOSITORY,
  AssessmentRepository,
} from '../../assessment/domain/assessment.repository';
import { CreateQuestionData, Question } from '../domain/question';
import {
  QUESTION_REPOSITORY,
  QuestionRepository,
} from '../domain/question.repository';

@Injectable()
export class CreateQuestionUseCase {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
  ) {}

  async execute(data: CreateQuestionData): Promise<Question> {
    const assessment = await this.assessmentRepository.findById(data.assessmentId);

    if (!assessment) {
      throw new EntityNotFoundError('Assessment', data.assessmentId);
    }

    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new AssessmentNotEditableError(assessment.id);
    }

    return this.questionRepository.create(data);
  }
}
