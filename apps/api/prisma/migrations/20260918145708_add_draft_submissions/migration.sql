-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_assessmentResultId_fkey";

-- AlterTable
ALTER TABLE "Submission" ALTER COLUMN "assessmentResultId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assessmentResultId_fkey" FOREIGN KEY ("assessmentResultId") REFERENCES "AssessmentResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;
