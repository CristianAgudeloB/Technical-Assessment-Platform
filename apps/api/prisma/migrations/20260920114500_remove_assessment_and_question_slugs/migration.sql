-- Slugs are not used for routing or domain behavior. IDs identify assessments and questions.
ALTER TABLE "Assessment" DROP COLUMN IF EXISTS "slug";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "slug";
