import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import { socketManager } from "./socketManager";
import { roomManager } from "./roomManager";
import { socketAuthMiddleware } from "../../middlewares/socketAuthMiddleware";
import { handlePressBuzzer } from "./handelers/buzzerHandler";

let ioInstance: Server | null = null;

export function initializeSocket(server: HTTPServer): Server {
  if (ioInstance) return ioInstance;

  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    const user = (socket as any).user;
    const sessionId = user.sessionId;
    
    // Add to socket manager and room manager
    socketManager.addSocket(socket.id, user);
    roomManager.addSocketToSession(socket.id, user);

    // Join session room
    socket.join(`session:${sessionId}`);
    console.log(`Socket ${socket.id} joined room: session:${sessionId}`);
    
    // Join role-specific room
    const roleRoom = `session:${sessionId}:${user.role.toLowerCase()}`;
    socket.join(roleRoom);
    console.log(`Socket ${socket.id} joined room: ${roleRoom}`);
    
    // Join team room if user is a team
    if (user.role === 'TEAM' || user.role === 'USER') {
      const teamRoom = `session:${sessionId}:team:${user.id}`;
      socket.join(teamRoom);
      console.log(`Socket ${socket.id} joined team room: ${teamRoom}`);
    }

    // Handle press-buzzer event
    socket.on("press-buzzer", async (payload) => {
      await handlePressBuzzer(socket, payload);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      socketManager.removeSocket(socket.id);
      roomManager.removeSocketFromSession(socket.id);
    });

  });


  ioInstance = io;
  return io;
}


export function getSocketIO(): Server {
  if (!ioInstance) {
    throw new Error("Socket.IO not initialized yet");
  }
  return ioInstance;
}
