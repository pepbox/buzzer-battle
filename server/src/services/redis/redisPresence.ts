import { redis, GAME_PREFIX } from "./redisClient";
import { AccessTokenPayload } from "../../utils/jwtUtils";

/**
 * Redis Presence Tracker
 *
 * Replaces the in-memory socketManager.ts.
 * Tracks which users are online and maps socket IDs ↔ user IDs across all server instances.
 *
 * Redis Keys:
 *   online_users              → SET  { userId, userId, ... }
 *   user_socket:{userId}      → SET  { socketId, socketId, ... }
 *   socket_user:{socketId}    → STR  userId
 *
 * A user is considered online as long as they have at least one active socket.
 * Multiple tabs / connections per user are fully supported.
 */
class RedisPresence {
    private readonly ONLINE_USERS_KEY = `${GAME_PREFIX}:online_users`;

    private userSocketKey(userId: string) {
        return `${GAME_PREFIX}:user_socket:${userId}`;
    }

    private socketUserKey(socketId: string) {
        return `${GAME_PREFIX}:socket_user:${socketId}`;
    }

    /**
     * Register a new socket connection for a user.
     * Uses a pipeline for atomic multi-step write.
     */
    async addSocket(socketId: string, user: AccessTokenPayload): Promise<void> {
        const pipeline = redis.pipeline();
        pipeline.sadd(this.userSocketKey(user.id), socketId);
        pipeline.set(this.socketUserKey(socketId), user.id);
        pipeline.sadd(this.ONLINE_USERS_KEY, user.id);
        await pipeline.exec();

        console.log(`[Presence] User ${user.id} connected via socket ${socketId}`);
    }

    /**
     * Remove a socket on disconnect.
     * If this was the user's last socket, mark them as offline.
     */
    async removeSocket(socketId: string): Promise<void> {
        const userId = await redis.get(this.socketUserKey(socketId));
        if (!userId) return;

        const pipeline = redis.pipeline();
        pipeline.srem(this.userSocketKey(userId), socketId);
        pipeline.del(this.socketUserKey(socketId));
        const results = await pipeline.exec();

        // results[0] is the SREM result - check remaining sockets
        const remainingCount = await redis.scard(this.userSocketKey(userId));
        if (remainingCount === 0) {
            await redis.srem(this.ONLINE_USERS_KEY, userId);
            console.log(`[Presence] User ${userId} went offline`);
        }

        console.log(`[Presence] Socket ${socketId} removed for user ${userId}`);
    }

    /**
     * Returns all active socket IDs for a given user (multi-tab support).
     */
    async getUserSockets(userId: string): Promise<string[]> {
        return await redis.smembers(this.userSocketKey(userId));
    }

    /**
     * Returns the user ID associated with a socket ID.
     */
    async getSocketUserId(socketId: string): Promise<string | null> {
        return await redis.get(this.socketUserKey(socketId));
    }

    /**
     * Returns true if the user has any active socket connections.
     */
    async isUserOnline(userId: string): Promise<boolean> {
        const result = await redis.sismember(this.ONLINE_USERS_KEY, userId);
        return result === 1;
    }

    /**
     * Returns all currently online user IDs.
     */
    async getOnlineUsers(): Promise<string[]> {
        return await redis.smembers(this.ONLINE_USERS_KEY);
    }

    /**
     * Returns the number of active sockets for a user (debug / multi-tab count).
     */
    async getUserSocketCount(userId: string): Promise<number> {
        return await redis.scard(this.userSocketKey(userId));
    }

    /**
     * Returns total number of online users.
     */
    async getOnlineCount(): Promise<number> {
        return await redis.scard(this.ONLINE_USERS_KEY);
    }
}

export const redisPresence = new RedisPresence();
