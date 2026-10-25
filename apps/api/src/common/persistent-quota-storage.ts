import type { ThrottlerStorage } from '@nestjs/throttler';
import type { IncrementResponse, Options, Store } from 'express-rate-limit';
import type { PrismaService } from '../prisma.service';

type CounterRow = { hits: number; resetAt: Date; blockedUntil: Date | null };
type ThrottlerStorageRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};

let database: PrismaService | null = null;
let writesSinceCleanup = 0;

export function configureQuotaStorage(prisma: PrismaService) {
  database = prisma;
}

function getDatabase() {
  if (!database) throw new Error('Persistent quota storage has not been initialized');
  return database;
}

async function cleanupExpiredCounters(prisma: PrismaService) {
  writesSinceCleanup += 1;
  if (writesSinceCleanup < 1000) return;
  writesSinceCleanup = 0;
  await prisma.$executeRaw`
    DELETE FROM "RateLimitCounter"
    WHERE "resetAt" <= NOW()
      AND ("blockedUntil" IS NULL OR "blockedUntil" <= NOW())
  `;
}

/** Shared PostgreSQL-backed store so rate limits survive restarts and replicas. */
export class PrismaRateLimitStore implements Store {
  // Each limiter gets an independent namespace in PostgreSQL, so stores with
  // the same implementation class do not share counter keys.
  readonly localKeys = true;
  private windowMs = 60_000;

  constructor(private readonly namespace: string) {}

  init(options: Options) {
    this.windowMs = options.windowMs;
  }

  async get(key: string): Promise<IncrementResponse | undefined> {
    const prisma = getDatabase();
    const rows = await prisma.$queryRaw<CounterRow[]>`
      SELECT "hits", "resetAt", "blockedUntil"
      FROM "RateLimitCounter"
      WHERE "key" = ${this.key(key)}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || row.resetAt.getTime() <= Date.now()) return undefined;
    return { totalHits: row.hits, resetTime: row.resetAt };
  }

  async increment(key: string): Promise<IncrementResponse> {
    const prisma = getDatabase();
    const resetAt = new Date(Date.now() + this.windowMs);
    const rows = await prisma.$queryRaw<CounterRow[]>`
      INSERT INTO "RateLimitCounter" ("key", "hits", "resetAt", "blockedUntil", "createdAt", "updatedAt")
      VALUES (${this.key(key)}, 1, ${resetAt}, NULL, NOW(), NOW())
      ON CONFLICT ("key") DO UPDATE SET
        "hits" = CASE WHEN "RateLimitCounter"."resetAt" <= NOW() THEN 1 ELSE "RateLimitCounter"."hits" + 1 END,
        "resetAt" = CASE WHEN "RateLimitCounter"."resetAt" <= NOW() THEN ${resetAt} ELSE "RateLimitCounter"."resetAt" END,
        "blockedUntil" = CASE WHEN "RateLimitCounter"."resetAt" <= NOW() THEN NULL ELSE "RateLimitCounter"."blockedUntil" END,
        "updatedAt" = NOW()
      RETURNING "hits", "resetAt", "blockedUntil"
    `;
    await cleanupExpiredCounters(prisma);
    const row = rows[0];
    return { totalHits: row.hits, resetTime: row.resetAt };
  }

  async decrement(key: string) {
    await getDatabase().$executeRaw`
      UPDATE "RateLimitCounter"
      SET "hits" = GREATEST("hits" - 1, 0), "updatedAt" = NOW()
      WHERE "key" = ${this.key(key)} AND "resetAt" > NOW()
    `;
  }

  async resetKey(key: string) {
    await getDatabase().$executeRaw`DELETE FROM "RateLimitCounter" WHERE "key" = ${this.key(key)}`;
  }

  async resetAll() {
    await getDatabase().$executeRaw`DELETE FROM "RateLimitCounter" WHERE "key" LIKE ${`${this.namespace}:%`}`;
  }

  private key(key: string) {
    return `${this.namespace}:${key}`;
  }
}

/** Persistent Nest throttler storage shared by every running API instance. */
export class PrismaThrottlerStorage implements ThrottlerStorage {
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const prisma = getDatabase();
    const storageKey = `nest:${throttlerName}:${key}`;
    const resetAt = new Date(Date.now() + ttl);
    const blockedUntil = new Date(Date.now() + Math.max(0, blockDuration));
    const rows = await prisma.$queryRaw<CounterRow[]>`
      INSERT INTO "RateLimitCounter" ("key", "hits", "resetAt", "blockedUntil", "createdAt", "updatedAt")
      VALUES (${storageKey}, 1, ${resetAt}, NULL, NOW(), NOW())
      ON CONFLICT ("key") DO UPDATE SET
        "hits" = CASE
          WHEN "RateLimitCounter"."resetAt" <= NOW() THEN 1
          WHEN "RateLimitCounter"."blockedUntil" IS NOT NULL AND "RateLimitCounter"."blockedUntil" <= NOW() THEN 1
          WHEN "RateLimitCounter"."blockedUntil" > NOW() THEN "RateLimitCounter"."hits"
          ELSE "RateLimitCounter"."hits" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitCounter"."resetAt" <= NOW() THEN ${resetAt}
          WHEN "RateLimitCounter"."blockedUntil" IS NOT NULL AND "RateLimitCounter"."blockedUntil" <= NOW() THEN ${resetAt}
          ELSE "RateLimitCounter"."resetAt"
        END,
        "blockedUntil" = CASE
          WHEN "RateLimitCounter"."resetAt" <= NOW() THEN NULL
          WHEN "RateLimitCounter"."blockedUntil" IS NOT NULL AND "RateLimitCounter"."blockedUntil" <= NOW() THEN NULL
          WHEN "RateLimitCounter"."blockedUntil" > NOW() THEN "RateLimitCounter"."blockedUntil"
          WHEN "RateLimitCounter"."hits" + 1 > ${limit} THEN ${blockedUntil}
          ELSE NULL
        END,
        "updatedAt" = NOW()
      RETURNING "hits", "resetAt", "blockedUntil"
    `;
    await cleanupExpiredCounters(prisma);

    const row = rows[0];
    const now = Date.now();
    return {
      totalHits: row.hits,
      timeToExpire: Math.max(0, row.resetAt.getTime() - now),
      isBlocked: Boolean(row.blockedUntil && row.blockedUntil.getTime() > now),
      timeToBlockExpire: Math.max(0, (row.blockedUntil?.getTime() ?? 0) - now),
    };
  }
}
