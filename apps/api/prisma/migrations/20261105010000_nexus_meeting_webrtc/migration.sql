-- CreateTable
CREATE TABLE IF NOT EXISTS "nexus_meeting_signals" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "to_user_id" TEXT NOT NULL,
    "signal_data" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nexus_meeting_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "nexus_meeting_active_peers" (
    "meeting_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_host" BOOLEAN NOT NULL DEFAULT false,
    "mic_on" BOOLEAN NOT NULL DEFAULT true,
    "camera_on" BOOLEAN NOT NULL DEFAULT true,
    "raised_hand" BOOLEAN NOT NULL DEFAULT false,
    "is_screen_sharing" BOOLEAN NOT NULL DEFAULT false,
    "last_seen" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nexus_meeting_active_peers_pkey" PRIMARY KEY ("meeting_id","user_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "nexus_meeting_messages" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nexus_meeting_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_signals_meeting_to" ON "nexus_meeting_signals"("meeting_id", "to_user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_messages_meeting" ON "nexus_meeting_messages"("meeting_id", "created_at");
