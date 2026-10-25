CREATE TABLE "RegistrationArchive" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "schoolId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "RegistrationArchive_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationArchive_firebaseUid_key" ON "RegistrationArchive"("firebaseUid");
CREATE INDEX "RegistrationArchive_schoolId_status_createdAt_idx" ON "RegistrationArchive"("schoolId", "status", "createdAt");
CREATE INDEX "RegistrationArchive_email_role_idx" ON "RegistrationArchive"("email", "role");
