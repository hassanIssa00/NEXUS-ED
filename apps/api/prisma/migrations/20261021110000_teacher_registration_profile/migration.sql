ALTER TABLE "RegistrationArchive"
  ADD COLUMN "nationalId" TEXT,
  ADD COLUMN "specialization" TEXT,
  ADD COLUMN "yearsExperience" INTEGER,
  ADD COLUMN "homeroomClassId" TEXT,
  ADD COLUMN "avatarUrl" TEXT;

CREATE INDEX "RegistrationArchive_homeroomClassId_idx"
  ON "RegistrationArchive"("homeroomClassId");

ALTER TABLE "RegistrationArchive"
  ADD CONSTRAINT "RegistrationArchive_homeroomClassId_fkey"
  FOREIGN KEY ("homeroomClassId") REFERENCES "Class"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
