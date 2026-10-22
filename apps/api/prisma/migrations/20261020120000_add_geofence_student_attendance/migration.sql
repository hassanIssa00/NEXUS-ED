ALTER TABLE "School"
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "attendanceRadiusMeters" INTEGER NOT NULL DEFAULT 50;

UPDATE "School"
SET "latitude" = 21.54974,
    "longitude" = 39.1813937,
    "attendanceRadiusMeters" = 50
WHERE "slug" = 'al-ikhlas-jeddah'
  AND ("latitude" IS NULL OR "longitude" IS NULL);

-- ScheduleEvent was present in the Prisma schema but absent from production DB.
-- Create the table that stores the official timetable before linking attendance.
CREATE TABLE IF NOT EXISTS "ScheduleEvent" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "periodNumber" INTEGER NOT NULL DEFAULT 1,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "room" TEXT,
  CONSTRAINT "ScheduleEvent_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ScheduleEvent"
  ADD COLUMN IF NOT EXISTS "periodNumber" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "ScheduleEvent_classId_dayOfWeek_periodNumber_idx"
  ON "ScheduleEvent"("classId", "dayOfWeek", "periodNumber");
CREATE INDEX IF NOT EXISTS "ScheduleEvent_classId_dayOfWeek_startTime_idx"
  ON "ScheduleEvent"("classId", "dayOfWeek", "startTime");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduleEvent_classId_fkey') THEN
    ALTER TABLE "ScheduleEvent"
      ADD CONSTRAINT "ScheduleEvent_classId_fkey"
      FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduleEvent_subjectId_fkey') THEN
    ALTER TABLE "ScheduleEvent"
      ADD CONSTRAINT "ScheduleEvent_subjectId_fkey"
      FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Restore the timetable from Masar for the first-grade section 1/2. Enroll all
-- currently registered students for this school in that first section, as requested.
DO $$
DECLARE
  school_id TEXT;
  classroom_id TEXT;
  teacher_id TEXT;
  subject_id TEXT;
  subject_name TEXT;
  item RECORD;
BEGIN
  SELECT "id" INTO school_id FROM "School" WHERE "slug" = 'al-ikhlas-jeddah' LIMIT 1;
  IF school_id IS NULL THEN
    RETURN;
  END IF;

  SELECT "id" INTO classroom_id
  FROM "Class"
  WHERE "schoolId" = school_id
    AND ("name" ILIKE '%1/2%' OR "name" ILIKE '%١/٢%')
  ORDER BY "createdAt" ASC
  LIMIT 1;

  IF classroom_id IS NULL THEN
    SELECT "id" INTO teacher_id
    FROM "User"
    WHERE "schoolId" = school_id
      AND "role" = 'TEACHER'
      AND ("name" ILIKE '%اسماعيل%' OR "name" ILIKE '%إسماعيل%')
    ORDER BY "createdAt" ASC
    LIMIT 1;

    classroom_id := gen_random_uuid()::text;
    INSERT INTO "Class" ("id", "schoolId", "name", "description", "academicYear", "teacherId", "createdAt", "updatedAt")
    VALUES (classroom_id, school_id, '1/2 - د. إسماعيل عيسى', 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى', '1448هـ', teacher_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  END IF;

  IF teacher_id IS NULL THEN
    SELECT "teacherId" INTO teacher_id FROM "Class" WHERE "id" = classroom_id;
  END IF;
  IF teacher_id IS NULL THEN
    SELECT "id" INTO teacher_id
    FROM "User"
    WHERE "schoolId" = school_id
      AND "role" = 'TEACHER'
      AND ("name" ILIKE '%اسماعيل%' OR "name" ILIKE '%إسماعيل%')
    ORDER BY "createdAt" ASC
    LIMIT 1;
  END IF;
  IF teacher_id IS NOT NULL THEN
    UPDATE "Class" SET "teacherId" = teacher_id WHERE "id" = classroom_id AND "teacherId" IS NULL;
  END IF;

  INSERT INTO "Enrollment" ("id", "studentId", "classId", "enrolledAt")
  SELECT gen_random_uuid()::text, student."id", classroom_id, CURRENT_TIMESTAMP
  FROM "User" AS student
  WHERE student."schoolId" = school_id
    AND student."role" = 'STUDENT'
    AND student."isActive" = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM "Enrollment" AS enrollment
      WHERE enrollment."studentId" = student."id" AND enrollment."classId" = classroom_id
    );

  FOR item IN
    SELECT DISTINCT entries.subject_name
    FROM (VALUES
      ('لغتي العربية'), ('الرياضيات'), ('التربية الإسلامية'), ('حياتية'), ('العلوم'), ('نشاط')
    ) AS entries(subject_name)
  LOOP
    subject_name := item.subject_name;
    SELECT "id" INTO subject_id
    FROM "Subject"
    WHERE "classId" = classroom_id AND "name" = subject_name
    ORDER BY "createdAt" ASC LIMIT 1;

    IF subject_id IS NULL THEN
      subject_id := gen_random_uuid()::text;
      INSERT INTO "Subject" ("id", "schoolId", "name", "code", "description", "classId", "teacherId", "createdAt", "updatedAt")
      VALUES (subject_id, school_id, subject_name, NULL, NULL, classroom_id, teacher_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM "ScheduleEvent" WHERE "classId" = classroom_id) THEN
    FOR item IN
      SELECT * FROM (VALUES
        (0, 1, 'لغتي العربية', '07:00', '07:45'),
        (0, 2, 'الرياضيات', '07:45', '08:30'),
        (0, 4, 'التربية الإسلامية', '09:30', '10:15'),
        (0, 5, 'حياتية', '10:15', '11:00'),
        (0, 7, 'العلوم', '11:45', '12:30'),
        (1, 1, 'لغتي العربية', '07:00', '07:45'),
        (1, 2, 'لغتي العربية', '07:45', '08:30'),
        (1, 4, 'الرياضيات', '09:30', '10:15'),
        (1, 5, 'التربية الإسلامية', '10:15', '11:00'),
        (1, 6, 'العلوم', '11:00', '11:45'),
        (2, 1, 'لغتي العربية', '07:00', '07:45'),
        (2, 2, 'التربية الإسلامية', '07:45', '08:30'),
        (2, 4, 'نشاط', '09:30', '10:15'),
        (2, 5, 'لغتي العربية', '10:15', '11:00'),
        (2, 7, 'نشاط', '11:45', '12:30'),
        (3, 1, 'لغتي العربية', '07:00', '07:45'),
        (3, 2, 'لغتي العربية', '07:45', '08:30'),
        (3, 4, 'الرياضيات', '09:30', '10:15'),
        (3, 5, 'التربية الإسلامية', '10:15', '11:00'),
        (4, 1, 'الرياضيات', '07:00', '07:45'),
        (4, 2, 'لغتي العربية', '07:45', '08:30'),
        (4, 4, 'الرياضيات', '09:30', '10:15'),
        (4, 5, 'العلوم', '10:15', '11:00'),
        (4, 6, 'التربية الإسلامية', '11:00', '11:45')
      ) AS timetable(day_of_week, period_number, subject_name, start_time, end_time)
    LOOP
      SELECT "id" INTO subject_id
      FROM "Subject"
      WHERE "classId" = classroom_id AND "name" = item.subject_name
      ORDER BY "createdAt" ASC LIMIT 1;

      INSERT INTO "ScheduleEvent" ("id", "classId", "subjectId", "dayOfWeek", "periodNumber", "startTime", "endTime", "room")
      VALUES (
        gen_random_uuid()::text,
        classroom_id,
        subject_id,
        item.day_of_week,
        item.period_number,
        item.start_time,
        item.end_time,
        NULL
      );
    END LOOP;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "GeofenceAttendance" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "scheduleEventId" TEXT NOT NULL,
  "attendanceDate" DATE NOT NULL,
  "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "distanceMeters" DOUBLE PRECISION NOT NULL,
  "accuracyMeters" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "GeofenceAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GeofenceAttendance_studentId_scheduleEventId_attendanceDate_key"
  ON "GeofenceAttendance"("studentId", "scheduleEventId", "attendanceDate");
CREATE INDEX IF NOT EXISTS "GeofenceAttendance_classId_attendanceDate_idx"
  ON "GeofenceAttendance"("classId", "attendanceDate");
CREATE INDEX IF NOT EXISTS "GeofenceAttendance_studentId_attendanceDate_idx"
  ON "GeofenceAttendance"("studentId", "attendanceDate");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GeofenceAttendance_studentId_fkey') THEN
    ALTER TABLE "GeofenceAttendance"
      ADD CONSTRAINT "GeofenceAttendance_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GeofenceAttendance_classId_fkey') THEN
    ALTER TABLE "GeofenceAttendance"
      ADD CONSTRAINT "GeofenceAttendance_classId_fkey"
      FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GeofenceAttendance_scheduleEventId_fkey') THEN
    ALTER TABLE "GeofenceAttendance"
      ADD CONSTRAINT "GeofenceAttendance_scheduleEventId_fkey"
      FOREIGN KEY ("scheduleEventId") REFERENCES "ScheduleEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
