CREATE TABLE "NexusMeeting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NexusMeeting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NexusMeetingParticipant" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NexusMeetingParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NexusMeeting_roomName_key" ON "NexusMeeting"("roomName");
CREATE INDEX "NexusMeeting_schoolId_scheduledAt_idx" ON "NexusMeeting"("schoolId", "scheduledAt");
CREATE INDEX "NexusMeeting_hostId_scheduledAt_idx" ON "NexusMeeting"("hostId", "scheduledAt");
CREATE INDEX "NexusMeeting_status_scheduledAt_idx" ON "NexusMeeting"("status", "scheduledAt");
CREATE UNIQUE INDEX "NexusMeetingParticipant_meetingId_userId_key" ON "NexusMeetingParticipant"("meetingId", "userId");
CREATE INDEX "NexusMeetingParticipant_userId_createdAt_idx" ON "NexusMeetingParticipant"("userId", "createdAt");

ALTER TABLE "NexusMeeting" ADD CONSTRAINT "NexusMeeting_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NexusMeeting" ADD CONSTRAINT "NexusMeeting_hostId_fkey"
    FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NexusMeetingParticipant" ADD CONSTRAINT "NexusMeetingParticipant_meetingId_fkey"
    FOREIGN KEY ("meetingId") REFERENCES "NexusMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NexusMeetingParticipant" ADD CONSTRAINT "NexusMeetingParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NexusMeetingParticipant" ADD CONSTRAINT "NexusMeetingParticipant_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
