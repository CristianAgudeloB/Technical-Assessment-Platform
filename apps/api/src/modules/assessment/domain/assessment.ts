export enum AssessmentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export type Assessment = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  status: AssessmentStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  availableFrom?: Date;
  availableUntil?: Date;
};

export type CreateAssessmentData = Pick<
  Assessment,
  'name' | 'description' | 'durationMinutes'
>;

export type UpdateAssessmentData = CreateAssessmentData;
