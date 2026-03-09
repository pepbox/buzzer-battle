import { getSocketIO } from "./index";
import { redisPresence } from "../redis/redisPresence";

export class SessionEmitters {
  private static getIO() {
    return getSocketIO(); // Get it when needed
  }

  static toSession(sessionId: string, event: string, data: any) {
    const io = this.getIO();
    // Use Socket.IO rooms for efficient broadcasting (Redis adapter handles cross-instance)
    io.to(`session:${sessionId}`).emit(event, data);
    console.log(`Emitted ${event} to session room: session:${sessionId}`);
  }

  static toSessionPlayers(sessionId: string, event: string, data: any) {
    const io = this.getIO();
    // Broadcast to all players (teams) in the session
    io.to(`session:${sessionId}:user`).to(`session:${sessionId}:team`).emit(event, data);
    console.log(`Emitted ${event} to players in session ${sessionId}`);
  }

  static toSessionAdmins(sessionId: string, event: string, data: any) {
    const io = this.getIO();
    // Broadcast to all admins in the session
    io.to(`session:${sessionId}:admin`).emit(event, data);
    console.log(`Emitted ${event} to admins in session ${sessionId}`);
  }

  // Emit to specific team
  static toTeam(sessionId: string, teamId: string, event: string, data: any) {
    const io = this.getIO();
    // Use team-specific room (Redis adapter syncs across instances)
    io.to(`session:${sessionId}:team:${teamId}`).emit(event, data);
    console.log(`Emitted ${event} to team ${teamId} in session ${sessionId}`);
  }

  // Emit to a specific user across all their active sockets (multi-tab support)
  static async toUser(userId: string, event: string, data: any) {
    const io = this.getIO();
    // Fetch all socket IDs for this user from Redis (supports multi-tab)
    const sockets = await redisPresence.getUserSockets(userId);
    sockets.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
    console.log(`Emitted ${event} to user ${userId} (${sockets.length} sockets)`);
  }
}
