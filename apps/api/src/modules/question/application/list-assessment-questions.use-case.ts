import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../../shared/domain/errors/domain-errors';
import {
  ASSESSMENT_REPOSITORY,
  AssessmentRepository,
} from '../../assessment/domain/assessment.repository';
import { Question } from '../domain/question';
import {
  QUESTION_REPOSITORY,
  QuestionRepository,
} from '../domain/question.repository';

@Injectable()
export class ListAssessmentQuestionsUseCase {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
  ) {}

  async execute(assessmentId: string): Promise<Question[]> {
    const assessment = await this.assessmentRepository.findById(assessmentId);

    if (!assessment) {
      throw new EntityNotFoundError('Assessment', assessmentId);
    }

    return this.questionRepository.findByAssessmentId(assessmentId);
  }
}
