import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../../shared/domain/errors/domain-errors';
import { Assessment } from '../domain/assessment';
import {
  ASSESSMENT_REPOSITORY,
  AssessmentRepository,
} from '../domain/assessment.repository';

@Injectable()
export class GetAssessmentUseCase {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
  ) {}

  async execute(id: string): Promise<Assessment> {
    const assessment = await this.assessmentRepository.findById(id);

    if (!assessment) {
      throw new EntityNotFoundError('Assessment', id);
    }

    return assessment;
  }
}
