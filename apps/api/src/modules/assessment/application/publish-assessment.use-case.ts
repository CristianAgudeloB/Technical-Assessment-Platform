import { Inject, Injectable } from '@nestjs/common';
import {
  AssessmentNotReadyToPublishError,
  EntityNotFoundError,
} from '../../../shared/domain/errors/domain-errors';
import { QUESTION_REPOSITORY, QuestionRepository } from '../../question/domain/question.repository';
import { Assessment, AssessmentStatus } from '../domain/assessment';
import {
  ASSESSMENT_REPOSITORY,
  AssessmentRepository,
} from '../domain/assessment.repository';

@Injectable()
export class PublishAssessmentUseCase {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
  ) {}

  async execute(id: string): Promise<Assessment> {
    const assessment = await this.assessmentRepository.findById(id);

    if (!assessment) {
      throw new EntityNotFoundError('Assessment', id);
    }

    if (assessment.status === AssessmentStatus.PUBLISHED) {
      return assessment;
    }

    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new AssessmentNotReadyToPublishError(id, 'solo los borradores pueden publicarse');
    }

    const questions = await this.questionRepository.findByAssessmentId(id);

    if (questions.length === 0) {
      throw new AssessmentNotReadyToPublishError(id, 'debe tener al menos un ejercicio');
    }

    if (questions.some((question) => question.testCases.length === 0)) {
      throw new AssessmentNotReadyToPublishError(id, 'cada ejercicio debe tener al menos un caso de prueba');
    }

    return this.assessmentRepository.publish(id);
  }
}
