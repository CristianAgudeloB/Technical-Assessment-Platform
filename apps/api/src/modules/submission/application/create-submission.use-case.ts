import { Inject, Injectable } from '@nestjs/common';
import {
  EntityNotFoundError,
  LanguageNotAllowedForQuestionError,
  QuestionAlreadySubmittedError,
  SubmissionLimitExceededError,
} from '../../../shared/domain/errors/domain-errors';
import {
  QUESTION_REPOSITORY,
  QuestionRepository,
} from '../../question/domain/question.repository';
import { CreateSubmissionData, Submission } from '../domain/submission';
import {
  SUBMISSION_REPOSITORY,
  SubmissionRepository,
} from '../domain/submission.repository';
import { ValidateAssessmentAttemptUseCase } from '../../assessment-attempt/application/validate-assessment-attempt.use-case';

const MAX_SUBMISSIONS_PER_ATTEMPT = 20;

@Injectable()
export class CreateSubmissionUseCase {
  constructor(
    @Inject(QUESTION_REPOSITORY)
    private readonly questionRepository: QuestionRepository,
    @Inject(SUBMISSION_REPOSITORY)
    private readonly submissionRepository: SubmissionRepository,
    private readonly validateAssessmentAttempt: ValidateAssessmentAttemptUseCase,
  ) {}

  async execute(data: CreateSubmissionData, userId: string): Promise<Submission> {
    const question = await this.questionRepository.findById(data.questionId);

    if (!question) {
      throw new EntityNotFoundError('Question', data.questionId);
    }

    if (!question.allowedLanguages.includes(data.language)) {
      throw new LanguageNotAllowedForQuestionError(data.language, question.id);
    }

    if (!data.assessmentAttemptId) {
      throw new EntityNotFoundError('Assessment attempt', 'missing');
    }

    const reservedSlot = await this.validateAssessmentAttempt.reserveSubmissionSlot(
      data.assessmentAttemptId,
      question.assessmentId,
      userId,
      MAX_SUBMISSIONS_PER_ATTEMPT,
    );
    if (!reservedSlot) {
      throw new SubmissionLimitExceededError(data.assessmentAttemptId);
    }

    try {
      if (
        await this.submissionRepository.hasEvaluatedSubmissionForQuestion(
          data.assessmentAttemptId,
          question.id,
        )
      ) {
        throw new QuestionAlreadySubmittedError(question.id);
      }

      return await this.submissionRepository.create(data);
    } catch (error: unknown) {
      await this.validateAssessmentAttempt.releaseSubmissionSlot(data.assessmentAttemptId);
      throw error;
    }
  }
}
