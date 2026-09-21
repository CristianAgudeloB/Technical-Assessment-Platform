-- Stop a completed assessment attempt permanently instead of letting its timer continue.
ALTER TYPE "AssessmentAttemptStatus" ADD VALUE 'COMPLETED';

ALTER TABLE "AssessmentAttempt"
  ADD COLUMN "completedAt" TIMESTAMP(3);
