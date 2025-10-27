import { getSocketIO } from "./index";
// import { roomManager } from "./roomManager";
import { socketManager } from "./socketManager";

export class SessionEmitters {
  private static getIO() {
    return getSocketIO(); // Get it when needed
  }

  static toSession(sessionId: string, event: string, data: any) {
    const io = this.getIO();
    // Use Socket.IO rooms for efficient broadcasting
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
    // Use team-specific room
    io.to(`session:${sessionId}:team:${teamId}`).emit(event, data);
    console.log(`Emitted ${event} to team ${teamId} in session ${sessionId}`);
  }

  static toUser(userId: string, event: string, data: any) {
    const io = this.getIO();
    // Fallback to socket manager for user-specific events
    const sockets = socketManager.getUserSockets(userId);
    sockets.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
    console.log(`Emitted ${event} to user ${userId} (${sockets.length} sockets)`);
  }
}
