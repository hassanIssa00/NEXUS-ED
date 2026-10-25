ALTER TABLE "ClassSession"
  ADD COLUMN "recording_egress_id" TEXT,
  ADD COLUMN "recording_object_key" TEXT,
  ADD COLUMN "recording_status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED';

CREATE INDEX "ClassSession_recording_status_idx" ON "ClassSession"("recording_status");
