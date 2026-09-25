import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

/**
 * Prefix for all Redis keys belonging to this game.
 * Change this value if multiple games share the same Redis instance.
 * e.g., "buzzer-battle:online_users", "buzzer-battle:session:..."
 */
export const GAME_PREFIX = process.env.REDIS_KEY_PREFIX || "buzzer-battle";

// General Redis client - presence tracking + room monitoring
export const redis = new Redis(REDIS_URL, {
    lazyConnect: true,
    retryStrategy: (times) => {
        if (times > 3) {
            console.log("ℹ️ Redis offline — using local in-memory state");
            return null;
        }
        return Math.min(times * 100, 500);
    },
});

// Dedicated publish client for Socket.IO adapter
export const pubClient = new Redis(REDIS_URL, {
    lazyConnect: true,
    retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 500);
    },
});

// Dedicated subscribe client for Socket.IO adapter
export const subClient = new Redis(REDIS_URL, {
    lazyConnect: true,
    retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 500);
    },
});

redis.on("error", (err) => {
  // Silent fallback handling when Redis server is unavailable locally
});
pubClient.on("error", (err) => {
  // Silent fallback handling
});
subClient.on("error", (err) => {
  // Silent fallback handling
});

/**
 * Connect all three Redis clients before the server starts accepting connections.
 * Fallback to in-memory mode gracefully if Redis is unavailable.
 */
export async function connectRedis(): Promise<void> {
  try {
    await Promise.all([
      redis.connect().then(() => console.log("✅ Redis connected (main)")).catch(() => {}),
      pubClient.connect().then(() => console.log("✅ Redis connected (pubClient)")).catch(() => {}),
      subClient.connect().then(() => console.log("✅ Redis connected (subClient)")).catch(() => {}),
    ]);
  } catch (err) {
    console.warn("⚠️ Redis local server not available (127.0.0.1:6379) — using in-memory mode.");
  }
}
