-- Limit trial runs independently from final submissions.
ALTER TABLE "AssessmentAttempt"
  ADD COLUMN "previewExecutionCount" INTEGER NOT NULL DEFAULT 0;
