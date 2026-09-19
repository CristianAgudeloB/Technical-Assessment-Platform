import { Assessment, CreateAssessmentData } from './assessment';

export const ASSESSMENT_REPOSITORY = Symbol('ASSESSMENT_REPOSITORY');

export interface AssessmentRepository {
  create(data: CreateAssessmentData): Promise<Assessment>;
  publish(id: string): Promise<Assessment>;
  findAll(): Promise<Assessment[]>;
  findById(id: string): Promise<Assessment | null>;
}
