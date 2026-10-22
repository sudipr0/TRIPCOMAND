import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

class MockRedis {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(
    key: string,
    value: string,
    mode?: string,
    duration?: number,
  ): Promise<"OK"> {
    let expiresAt: number | undefined;
    if (mode === "EX" && duration) {
      expiresAt = Date.now() + duration * 1000;
    } else if (mode === "PX" && duration) {
      expiresAt = Date.now() + duration;
    }
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async del(key: string): Promise<number> {
    const deleted = this.store.delete(key);
    return deleted ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const num = current ? Number.parseInt(current, 10) + 1 : 1;
    await this.set(key, num.toString());
    return num;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async ping(): Promise<string> {
    return "PONG";
  }
}

export type RedisClient = Redis | MockRedis;

let redisClient: RedisClient;

if (env.REDIS_URL && env.NODE_ENV !== "test") {
  try {
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    client.on("error", (err) => {
      logger.error(
        { err },
        "Redis connection error, falling back to in-memory store",
      );
    });
    redisClient = client;
  } catch (error) {
    logger.warn(
      { error },
      "Failed to initialize Redis client, using in-memory mock",
    );
    redisClient = new MockRedis();
  }
} else {
  redisClient = new MockRedis();
}

export const redis = redisClient;
