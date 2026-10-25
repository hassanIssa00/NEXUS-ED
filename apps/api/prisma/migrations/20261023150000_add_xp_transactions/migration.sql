CREATE TABLE "XpTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "XpTransaction_userId_idx" ON "XpTransaction"("userId");
CREATE INDEX "XpTransaction_createdAt_idx" ON "XpTransaction"("createdAt");

ALTER TABLE "XpTransaction"
ADD CONSTRAINT "XpTransaction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
