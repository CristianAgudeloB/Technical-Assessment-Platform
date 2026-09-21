import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../../shared/domain/errors/domain-errors';
import { Assessment, UpdateAssessmentData } from '../domain/assessment';
import {
  ASSESSMENT_REPOSITORY,
  AssessmentRepository,
} from '../domain/assessment.repository';

@Injectable()
export class UpdateAssessmentUseCase {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
  ) {}

  async execute(id: string, data: UpdateAssessmentData): Promise<Assessment> {
    if (!(await this.assessmentRepository.findById(id))) {
      throw new EntityNotFoundError('Assessment', id);
    }

    return this.assessmentRepository.update(id, data);
  }
}
