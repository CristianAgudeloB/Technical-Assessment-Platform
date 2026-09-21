ALTER TABLE "AssessmentAssignment"
  ADD COLUMN "availableFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "availableUntil" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days');

ALTER TABLE "AssessmentAssignment"
  ALTER COLUMN "availableUntil" DROP DEFAULT;

CREATE INDEX "AssessmentAssignment_userId_availableFrom_availableUntil_idx"
  ON "AssessmentAssignment"("userId", "availableFrom", "availableUntil");
