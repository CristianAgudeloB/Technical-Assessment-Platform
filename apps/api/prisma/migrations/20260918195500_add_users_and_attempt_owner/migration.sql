CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CANDIDATE');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "displayName" VARCHAR(160) NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'CANDIDATE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");

ALTER TABLE "Candidate" ADD COLUMN "userId" TEXT;
CREATE UNIQUE INDEX "Candidate_userId_key" ON "Candidate"("userId");
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssessmentAttempt" ADD COLUMN "userId" TEXT;
CREATE INDEX "AssessmentAttempt_userId_idx" ON "AssessmentAttempt"("userId");
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
