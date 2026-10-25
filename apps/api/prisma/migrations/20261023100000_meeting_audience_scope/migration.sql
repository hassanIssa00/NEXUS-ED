ALTER TABLE "NexusMeeting"
    ADD COLUMN "classId" TEXT,
    ADD COLUMN "meetingType" TEXT NOT NULL DEFAULT 'STAFF';

CREATE INDEX "NexusMeeting_classId_scheduledAt_idx"
    ON "NexusMeeting"("classId", "scheduledAt");

ALTER TABLE "NexusMeeting"
    ADD CONSTRAINT "NexusMeeting_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
