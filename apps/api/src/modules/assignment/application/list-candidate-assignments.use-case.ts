import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../../shared/domain/errors/domain-errors';
import { USER_REPOSITORY, UserRepository } from '../../auth/domain/user.repository';
import { UserRole } from '../../auth/domain/user';
import {
  ASSESSMENT_ASSIGNMENT_REPOSITORY,
  AssessmentAssignmentRepository,
} from '../domain/assessment-assignment.repository';
import { AssessmentAssignment } from '../domain/assessment-assignment';

@Injectable()
export class ListCandidateAssignmentsUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(ASSESSMENT_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: AssessmentAssignmentRepository,
  ) {}

  async execute(candidateId: string): Promise<AssessmentAssignment[]> {
    const candidate = await this.userRepository.findById(candidateId);
    if (!candidate || candidate.role !== UserRole.CANDIDATE) {
      throw new EntityNotFoundError('Candidate', candidateId);
    }

    return this.assignmentRepository.findByUserId(candidateId);
  }
}
