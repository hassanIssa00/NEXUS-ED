import {
    Injectable,
    OnModuleInit,
    OnModuleDestroy,
    Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
            log:
                process.env.NODE_ENV === 'development'
                    ? [
                        { emit: 'event', level: 'query' },
                        { emit: 'stdout', level: 'info' },
                        { emit: 'stdout', level: 'warn' },
                        { emit: 'stdout', level: 'error' },
                    ]
                    : [{ emit: 'stdout', level: 'error' }],
        });

        // Query logging في development
        if (process.env.NODE_ENV === 'development') {
            (this as any).$on('query', (e: { query: string; duration: number }) => {
                if (e.duration > 100) {
                    this.logger.warn(
                        `Slow Query (${e.duration}ms): ${e.query.substring(0, 200)}...`,
                    );
                }
            });
        }
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.log('Database connection established');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('Database connection closed');
    }

    /**
     * Health check for database connection
     */
    async healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        latency?: number;
        error?: string;
    }> {
        const start = Date.now();
        try {
            await this.$queryRaw`SELECT 1`;
            return {
                status: 'healthy',
                latency: Date.now() - start,
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Execute with retry for transient failures
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        maxRetries = 3,
    ): Promise<T> {
        let lastError = new Error('Database operation failed after all retries');

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // Only retry on connection errors
                if (
                    error instanceof PrismaClientKnownRequestError &&
                    ['P1001', 'P1002', 'P1008', 'P1017'].includes(error.code)
                ) {
                    this.logger.warn(
                        `Database operation failed (attempt ${attempt}/${maxRetries}): ${error.message}`,
                    );
                    await this.delay(Math.pow(2, attempt) * 100); // Exponential backoff
                    continue;
                }

                throw error;
            }
        }

        throw lastError;
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Get database statistics
     */
    async getStats(): Promise<{
        connectionStatus: string;
        activeConnections?: number;
    }> {
        try {
            const result = await this.$queryRaw<{ count: bigint }[]>`
        SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()
      `;
            return {
                connectionStatus: 'connected',
                activeConnections: Number(result[0]?.count || 0),
            };
        } catch {
            return {
                connectionStatus: 'disconnected',
            };
        }
    }
}
