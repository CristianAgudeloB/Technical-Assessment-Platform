CREATE TYPE "SubmissionQualityStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED', 'FAILED');

CREATE TABLE "SubmissionQualityReport" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "status" "SubmissionQualityStatus" NOT NULL DEFAULT 'PENDING',
  "qualityGateStatus" VARCHAR(32),
  "totalIssues" INTEGER NOT NULL DEFAULT 0,
  "bugs" INTEGER NOT NULL DEFAULT 0,
  "codeSmells" INTEGER NOT NULL DEFAULT 0,
  "vulnerabilities" INTEGER NOT NULL DEFAULT 0,
  "issues" JSONB,
  "errorMessage" TEXT,
  "analyzedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SubmissionQualityReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubmissionQualityReport_submissionId_key" ON "SubmissionQualityReport"("submissionId");
CREATE INDEX "SubmissionQualityReport_status_idx" ON "SubmissionQualityReport"("status");

ALTER TABLE "SubmissionQualityReport"
  ADD CONSTRAINT "SubmissionQualityReport_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
