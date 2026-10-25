ALTER TABLE "ClassSession"
  ADD COLUMN "roomName" TEXT,
  ADD COLUMN "endedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "ClassSession_roomName_key" ON "ClassSession"("roomName");
CREATE INDEX "ClassSession_classId_isActive_startTime_idx" ON "ClassSession"("classId", "isActive", "startTime");

CREATE TABLE "ClassSessionAttendance" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
  "joinedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassSessionAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassSessionAttendance_sessionId_studentId_key"
  ON "ClassSessionAttendance"("sessionId", "studentId");
CREATE INDEX "ClassSessionAttendance_studentId_joinedAt_idx"
  ON "ClassSessionAttendance"("studentId", "joinedAt");

ALTER TABLE "ClassSessionAttendance"
  ADD CONSTRAINT "ClassSessionAttendance_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassSessionAttendance"
  ADD CONSTRAINT "ClassSessionAttendance_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassEvent" ADD COLUMN "externalUrl" TEXT;
