import { redis, GAME_PREFIX } from "./redisClient";
import { AccessTokenPayload } from "../../utils/jwtUtils";

/**
 * Redis Room Membership Monitor
 *
 * Replaces the in-memory roomManager.ts.
 * Tracks which sockets are in which session/role/team rooms — for analytics and monitoring ONLY.
 *
 * IMPORTANT: This is NOT used for event broadcasting.
 * Broadcasting uses Socket.IO's native room system (socket.join / io.to(room).emit).
 * The Redis Adapter (from redisClient pubClient/subClient) makes that work across instances.
 *
 * Redis Keys:
 *   session:{sessionId}:sockets           → SET  all sockets in session
 *   session:{sessionId}:admins            → SET  admin sockets
 *   session:{sessionId}:players           → SET  player/team sockets
 *   session:{sessionId}:team:{teamId}     → SET  team-specific sockets
 *   socket:session:{socketId}             → STR  sessionId  (reverse lookup for cleanup on disconnect)
 *   socket:team:{socketId}                → STR  teamId     (reverse lookup for team cleanup)
 */
class RedisRooms {
    private sessionSocketsKey(sessionId: string) {
        return `${GAME_PREFIX}:session:${sessionId}:sockets`;
    }
    private sessionAdminsKey(sessionId: string) {
        return `${GAME_PREFIX}:session:${sessionId}:admins`;
    }
    private sessionPlayersKey(sessionId: string) {
        return `${GAME_PREFIX}:session:${sessionId}:players`;
    }
    private sessionTeamKey(sessionId: string, teamId: string) {
        return `${GAME_PREFIX}:session:${sessionId}:team:${teamId}`;
    }
    private socketSessionKey(socketId: string) {
        return `${GAME_PREFIX}:socket:session:${socketId}`;
    }
    private socketTeamKey(socketId: string) {
        return `${GAME_PREFIX}:socket:team:${socketId}`;
    }

    /**
     * Register a socket into the appropriate session room sets.
     * Stores reverse-lookup keys for clean removal on disconnect.
     */
    async addSocketToSession(
        socketId: string,
        user: AccessTokenPayload
    ): Promise<void> {
        const { sessionId, role, id: userId } = user;
        const teamId = (user as any).teamId as string | undefined;

        const pipeline = redis.pipeline();

        // All sockets in this session
        pipeline.sadd(this.sessionSocketsKey(sessionId), socketId);

        // Role-specific set
        if (role === "ADMIN") {
            pipeline.sadd(this.sessionAdminsKey(sessionId), socketId);
        } else {
            pipeline.sadd(this.sessionPlayersKey(sessionId), socketId);
        }

        // Team-specific set (if user has a team)
        if (teamId) {
            pipeline.sadd(this.sessionTeamKey(sessionId, teamId), socketId);
            pipeline.set(this.socketTeamKey(socketId), teamId);
        }

        // Reverse lookup: socket → sessionId
        pipeline.set(this.socketSessionKey(socketId), sessionId);

        await pipeline.exec();

        console.log(
            `[Rooms] ${role} ${userId} joined session ${sessionId} (socket: ${socketId})`
        );
    }

    /**
     * Remove a socket from all session room sets on disconnect.
     * Uses reverse-lookup keys to find the session without needing the user payload.
     */
    async removeSocketFromSession(socketId: string): Promise<void> {
        const sessionId = await redis.get(this.socketSessionKey(socketId));
        if (!sessionId) return;

        const teamId = await redis.get(this.socketTeamKey(socketId));

        const pipeline = redis.pipeline();
        pipeline.srem(this.sessionSocketsKey(sessionId), socketId);
        pipeline.srem(this.sessionAdminsKey(sessionId), socketId);
        pipeline.srem(this.sessionPlayersKey(sessionId), socketId);

        if (teamId) {
            pipeline.srem(this.sessionTeamKey(sessionId, teamId), socketId);
            pipeline.del(this.socketTeamKey(socketId));
        }

        pipeline.del(this.socketSessionKey(socketId));

        await pipeline.exec();

        console.log(
            `[Rooms] Socket ${socketId} removed from session ${sessionId}`
        );
    }

    /**
     * Returns the total socket count and role breakdown for a session.
     * Used for monitoring / admin analytics — NOT for broadcasting.
     */
    async getSessionInfo(sessionId: string): Promise<{
        sessionId: string;
        totalSockets: number;
        adminCount: number;
        playerCount: number;
    } | null> {
        const [totalSockets, adminCount, playerCount] = await Promise.all([
            redis.scard(this.sessionSocketsKey(sessionId)),
            redis.scard(this.sessionAdminsKey(sessionId)),
            redis.scard(this.sessionPlayersKey(sessionId)),
        ]);

        if (totalSockets === 0) return null;

        return {
            sessionId,
            totalSockets,
            adminCount,
            playerCount,
        };
    }

    /**
     * Returns all socket IDs currently in a session.
     */
    async getSessionSockets(sessionId: string): Promise<string[]> {
        return await redis.smembers(this.sessionSocketsKey(sessionId));
    }

    /**
     * Returns all admin socket IDs in a session.
     */
    async getSessionAdmins(sessionId: string): Promise<string[]> {
        return await redis.smembers(this.sessionAdminsKey(sessionId));
    }

    /**
     * Returns all player socket IDs in a session.
     */
    async getSessionPlayers(sessionId: string): Promise<string[]> {
        return await redis.smembers(this.sessionPlayersKey(sessionId));
    }

    /**
     * Returns all socket IDs for a specific team in a session.
     */
    async getTeamSockets(sessionId: string, teamId: string): Promise<string[]> {
        return await redis.smembers(this.sessionTeamKey(sessionId, teamId));
    }
}

export const redisRooms = new RedisRooms();
