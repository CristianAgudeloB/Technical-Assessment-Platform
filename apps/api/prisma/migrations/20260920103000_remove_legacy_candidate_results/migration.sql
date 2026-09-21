-- Candidate and AssessmentResult were superseded by User and AssessmentAttempt.
-- No application flow reads or writes these legacy tables.
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_assessmentResultId_fkey";
DROP INDEX IF EXISTS "Submission_assessmentResultId_idx";
ALTER TABLE "Submission" DROP COLUMN IF EXISTS "assessmentResultId";
DROP TABLE IF EXISTS "AssessmentResult";
DROP TABLE IF EXISTS "Candidate";
DROP TYPE IF EXISTS "AssessmentResultStatus";
