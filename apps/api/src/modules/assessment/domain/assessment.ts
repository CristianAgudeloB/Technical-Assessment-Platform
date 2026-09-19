export enum AssessmentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export type Assessment = {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  status: AssessmentStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAssessmentData = Pick<
  Assessment,
  'slug' | 'name' | 'description' | 'durationMinutes'
>;
