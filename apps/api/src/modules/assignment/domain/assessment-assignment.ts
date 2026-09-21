export type AssessmentAssignment = {
  id: string;
  userId: string;
  assessmentId: string;
  assignedAt: Date;
  availableFrom: Date;
  availableUntil: Date;
};

export type CreateAssessmentAssignmentData = Pick<
  AssessmentAssignment,
  'userId' | 'assessmentId' | 'availableFrom' | 'availableUntil'
>;
