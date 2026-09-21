import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../../../shared/domain/errors/domain-errors';
import { Question } from '../domain/question';
import { AssessmentStatus } from '../../assessment/domain/assessment';
import {
  ASSESSMENT_REPOSITORY,
  AssessmentRepository,
} from '../../assessment/domain/assessment.repository';
import {
  QUESTION_REPOSITORY,
  QuestionRepository,
} from '../domain/question.repository';
import {
  ASSESSMENT_ASSIGNMENT_REPOSITORY,
  AssessmentAssignmentRepository,
} from '../../assignment/domain/assessment-assignment.repository';

@Injectable()
export class GetQuestionUseCase {
  constructor(
    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
    @Inject(ASSESSMENT_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: AssessmentAssignmentRepository,
  ) {}

  async execute(id: string, candidateUserId?: string): Promise<Question> {
    const question = await this.questionRepository.findById(id);

    if (!question) {
      throw new EntityNotFoundError('Question', id);
    }

    if (candidateUserId) {
      const assessment = await this.assessmentRepository.findById(question.assessmentId);
      if (
        !assessment ||
        assessment.status !== AssessmentStatus.PUBLISHED ||
        !(await this.assignmentRepository.findAvailable(candidateUserId, assessment.id))
      ) {
        throw new EntityNotFoundError('Question', id);
      }
    }

    return question;
  }
}
