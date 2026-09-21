import { Assessment, CreateAssessmentData, UpdateAssessmentData } from './assessment';

export const ASSESSMENT_REPOSITORY = Symbol('ASSESSMENT_REPOSITORY');

export interface AssessmentRepository {
  create(data: CreateAssessmentData): Promise<Assessment>;
  update(id: string, data: UpdateAssessmentData): Promise<Assessment>;
  publish(id: string): Promise<Assessment>;
  findAll(): Promise<Assessment[]>;
  findPublished(): Promise<Assessment[]>;
  findPublishedAssignedToUser(userId: string): Promise<Assessment[]>;
  findById(id: string): Promise<Assessment | null>;
}
