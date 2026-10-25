CREATE TABLE "RateLimitCounter" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitCounter_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitCounter_resetAt_idx" ON "RateLimitCounter"("resetAt");
CREATE INDEX "RateLimitCounter_blockedUntil_idx" ON "RateLimitCounter"("blockedUntil");
