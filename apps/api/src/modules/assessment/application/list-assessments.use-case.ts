import { Inject, Injectable } from '@nestjs/common';
import { Assessment } from '../domain/assessment';
import {
  ASSESSMENT_REPOSITORY,
  AssessmentRepository,
} from '../domain/assessment.repository';

@Injectable()
export class ListAssessmentsUseCase {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
  ) {}

  execute(): Promise<Assessment[]> {
    return this.assessmentRepository.findAll();
  }
}
