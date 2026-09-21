import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../../shared/domain/errors/domain-errors';
import {
  ASSESSMENT_REPOSITORY,
  AssessmentRepository,
} from '../../assessment/domain/assessment.repository';
import { Question } from '../domain/question';
import { AssessmentStatus } from '../../assessment/domain/assessment';
import {
  ASSESSMENT_ASSIGNMENT_REPOSITORY,
  AssessmentAssignmentRepository,
} from '../../assignment/domain/assessment-assignment.repository';
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
    @Inject(ASSESSMENT_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: AssessmentAssignmentRepository,
  ) {}

  async execute(assessmentId: string, candidateUserId?: string): Promise<Question[]> {
    const assessment = await this.assessmentRepository.findById(assessmentId);

    if (!assessment || (candidateUserId && assessment.status !== AssessmentStatus.PUBLISHED)) {
      throw new EntityNotFoundError('Assessment', assessmentId);
    }

    if (candidateUserId && !(await this.assignmentRepository.findAvailable(candidateUserId, assessmentId))) {
      throw new EntityNotFoundError('Assessment', assessmentId);
    }

    return this.questionRepository.findByAssessmentId(assessmentId);
  }
}
