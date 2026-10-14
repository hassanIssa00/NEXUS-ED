ALTER TABLE "StudentProfile" ADD COLUMN "nationalId" TEXT;

CREATE UNIQUE INDEX "StudentProfile_nationalId_key"
ON "StudentProfile"("nationalId");
