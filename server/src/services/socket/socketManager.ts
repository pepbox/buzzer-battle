import { AccessTokenPayload } from "../../utils/jwtUtils";

class SocketManager {
  private userSockets = new Map<string, Set<string>>();
  private socketUsers = new Map<string, AccessTokenPayload>();

  addSocket(socketId: string, user: AccessTokenPayload): void {
    this.socketUsers.set(socketId, user);

    if (!this.userSockets.has(user.id)) {
      this.userSockets.set(user.id, new Set());
    }
    this.userSockets.get(user.id)!.add(socketId);

    console.log(`User ${user.id} connected with socket ${socketId}`);
  }

  removeSocket(socketId: string): void {
    const user = this.socketUsers.get(socketId);
    if (!user) return;
    this.socketUsers.delete(socketId);
    const userSocketSet = this.userSockets.get(user.id);
    if (userSocketSet) {
      userSocketSet.delete(socketId);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(user.id);
      }
    }

    console.log(`User ${user.id} disconnected socket ${socketId}`);
  }

  getUserSockets(userId: string): string[] {
    const socketSet = this.userSockets.get(userId);
    return socketSet ? Array.from(socketSet) : [];
  }
  getSocketUser(socketId: string): AccessTokenPayload | undefined {
    return this.socketUsers.get(socketId);
  }
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size > 0 : false;
  }
  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }
  getOnlineCount(): number {
    return this.userSockets.size;
  }
  getAllConnections(): { userId: string; socketIds: string[] }[] {
    return Array.from(this.userSockets.entries()).map(
      ([userId, socketIds]) => ({
        userId,
        socketIds: Array.from(socketIds),
      })
    );
  }
}
export const socketManager = new SocketManager();
