ALTER TABLE "ParentSurvey" ALTER COLUMN "parentId" DROP NOT NULL;

ALTER TABLE "ParentSurvey" ADD COLUMN "respondentId" TEXT;
ALTER TABLE "ParentSurvey" ADD COLUMN "respondentRole" TEXT NOT NULL DEFAULT 'PARENT';
UPDATE "ParentSurvey" SET "respondentId" = "parentId" WHERE "respondentId" IS NULL;
ALTER TABLE "ParentSurvey" ALTER COLUMN "respondentId" SET NOT NULL;

CREATE UNIQUE INDEX "ParentSurvey_respondentId_studentId_key"
  ON "ParentSurvey"("respondentId", "studentId");
CREATE INDEX "ParentSurvey_studentId_updatedAt_idx"
  ON "ParentSurvey"("studentId", "updatedAt");

ALTER TABLE "ParentSurvey" ADD CONSTRAINT "ParentSurvey_respondentId_fkey"
  FOREIGN KEY ("respondentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
