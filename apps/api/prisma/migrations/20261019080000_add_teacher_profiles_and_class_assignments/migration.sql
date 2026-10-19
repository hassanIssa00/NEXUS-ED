CREATE TABLE "TeacherProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "specialization" TEXT NOT NULL,
  "qualification" TEXT NOT NULL,
  "yearsExperience" INTEGER NOT NULL DEFAULT 0,
  "bio" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");

ALTER TABLE "TeacherProfile"
  ADD CONSTRAINT "TeacherProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Class" ADD COLUMN "homeroomTeacherId" TEXT;
CREATE UNIQUE INDEX "Class_homeroomTeacherId_key" ON "Class"("homeroomTeacherId");

ALTER TABLE "Class"
  ADD CONSTRAINT "Class_homeroomTeacherId_fkey"
  FOREIGN KEY ("homeroomTeacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TeacherClassAssignment" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherClassAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherClassAssignment_teacherId_classId_key"
  ON "TeacherClassAssignment"("teacherId", "classId");
CREATE INDEX "TeacherClassAssignment_classId_idx" ON "TeacherClassAssignment"("classId");

ALTER TABLE "TeacherClassAssignment"
  ADD CONSTRAINT "TeacherClassAssignment_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherClassAssignment"
  ADD CONSTRAINT "TeacherClassAssignment_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
