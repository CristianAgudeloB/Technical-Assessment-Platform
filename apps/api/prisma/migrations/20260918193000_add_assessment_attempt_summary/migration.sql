ALTER TABLE "AssessmentAttempt"
  ADD COLUMN "score" DECIMAL(5,2),
  ADD COLUMN "questionsCorrect" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "questionsIncorrect" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "completedQuestions" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "timeConsumedSeconds" INTEGER;
