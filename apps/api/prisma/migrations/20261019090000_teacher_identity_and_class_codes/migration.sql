ALTER TABLE "Class" ADD COLUMN "classCode" TEXT;

UPDATE "Class"
SET "classCode" = 'CLS-'
  || SUBSTRING(generated.code FROM 1 FOR 4) || '-'
  || SUBSTRING(generated.code FROM 5 FOR 4) || '-'
  || SUBSTRING(generated.code FROM 9 FOR 4)
FROM (
  SELECT "id", UPPER(REPLACE(gen_random_uuid()::TEXT, '-', '')) AS code
  FROM "Class"
) AS generated
WHERE "Class"."id" = generated."id";

ALTER TABLE "Class" ALTER COLUMN "classCode" SET NOT NULL;
CREATE UNIQUE INDEX "Class_classCode_key" ON "Class"("classCode");

ALTER TABLE "TeacherProfile" ADD COLUMN "residenceNumber" TEXT;
CREATE UNIQUE INDEX "TeacherProfile_residenceNumber_key" ON "TeacherProfile"("residenceNumber");
ALTER TABLE "TeacherProfile" ALTER COLUMN "qualification" SET DEFAULT '';
