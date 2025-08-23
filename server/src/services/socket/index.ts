import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import { socketManager } from "./socketManager";
import { roomManager } from "./roomManager";
import { socketAuthMiddleware } from "../../middlewares/socketAuthMiddleware";

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
    socketManager.addSocket(socket.id, user);
    roomManager.addSocketToSession(socket.id, user);

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
