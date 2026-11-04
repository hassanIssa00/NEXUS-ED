ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TeacherProfile" ADD COLUMN "schoolManaged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudentProfile" ADD COLUMN "schoolManaged" BOOLEAN NOT NULL DEFAULT false;
