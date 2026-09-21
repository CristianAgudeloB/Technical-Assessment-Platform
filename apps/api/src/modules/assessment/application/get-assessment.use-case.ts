import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../../shared/domain/errors/domain-errors';
import { Assessment } from '../domain/assessment';
import { AssessmentStatus } from '../domain/assessment';
import {
  ASSESSMENT_ASSIGNMENT_REPOSITORY,
  AssessmentAssignmentRepository,
} from '../../assignment/domain/assessment-assignment.repository';
import {
  ASSESSMENT_REPOSITORY,
  AssessmentRepository,
} from '../domain/assessment.repository';

@Injectable()
export class GetAssessmentUseCase {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
    @Inject(ASSESSMENT_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: AssessmentAssignmentRepository,
  ) {}

  async execute(id: string, candidateUserId?: string): Promise<Assessment> {
    const assessment = await this.assessmentRepository.findById(id);

    if (!assessment || (candidateUserId && assessment.status !== AssessmentStatus.PUBLISHED)) {
      throw new EntityNotFoundError('Assessment', id);
    }

    if (candidateUserId) {
      const assignment = await this.assignmentRepository.findAvailable(candidateUserId, id);
      if (!assignment) {
        throw new EntityNotFoundError('Assessment', id);
      }

      return {
        ...assessment,
        availableFrom: assignment.availableFrom,
        availableUntil: assignment.availableUntil,
      };
    }

    return assessment;
  }
}
