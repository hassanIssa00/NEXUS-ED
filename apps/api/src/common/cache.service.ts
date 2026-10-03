import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { CacheTTL } from '../config/redis.config';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly tagMap = new Map<string, Set<string>>();

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined) {
        this.logger.debug(`Cache HIT: ${key}`);
      } else {
        this.logger.debug(`Cache MISS: ${key}`);
      }
      return value;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<void> {
    try {
      const ttl = options.ttl ?? CacheTTL.MEDIUM;
      await this.cacheManager.set(key, value, ttl * 1000);

      // Track tags for bulk invalidation
      if (options.tags) {
        for (const tag of options.tags) {
          if (!this.tagMap.has(tag)) {
            this.tagMap.set(tag, new Set());
          }
          this.tagMap.get(tag).add(key);
        }
      }

      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error);
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Invalidate all keys with a specific tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    const keys = this.tagMap.get(tag);
    if (!keys) return;

    const deletePromises: Promise<void>[] = [];
    for (const key of keys) {
      deletePromises.push(this.del(key));
    }
    await Promise.all(deletePromises);

    this.tagMap.delete(tag);
    this.logger.debug(`Cache invalidated by tag: ${tag} (${keys.size} keys)`);
  }

  /**
   * Invalidate multiple keys by pattern
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    // Note: This is a simplified implementation
    // For production, use Redis SCAN command
    const keysToDelete: string[] = [];

    for (const [tag, keys] of this.tagMap) {
      for (const key of keys) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
    }

    await Promise.all(keysToDelete.map((key) => this.del(key)));
    this.logger.debug(
      `Cache invalidated by pattern: ${pattern} (${keysToDelete.length} keys)`,
    );
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.cacheManager.clear();
      this.tagMap.clear();
      this.logger.log('Cache cleared');
    } catch (error) {
      this.logger.error('Cache CLEAR error:', error);
    }
  }

  /**
   * Wrap a function with caching
   */
  wrap<T extends (...args: unknown[]) => Promise<unknown>>(
    keyGenerator: (...args: Parameters<T>) => string,
    fn: T,
    options: CacheOptions = {},
  ): T {
    return (async (...args: Parameters<T>) => {
      const key = keyGenerator(...args);
      return this.getOrSet(key, () => fn(...args), options);
    }) as T;
  }
}
