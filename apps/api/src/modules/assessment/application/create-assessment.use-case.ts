import { Inject, Injectable } from '@nestjs/common';
import { Assessment, CreateAssessmentData } from '../domain/assessment';
import {
  ASSESSMENT_REPOSITORY,
  AssessmentRepository,
} from '../domain/assessment.repository';

@Injectable()
export class CreateAssessmentUseCase {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
  ) {}

  execute(data: CreateAssessmentData): Promise<Assessment> {
    return this.assessmentRepository.create(data);
  }
}
