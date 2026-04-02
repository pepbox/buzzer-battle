import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { connectRedis, pubClient, subClient } from "../redis/redisClient";
import { redisPresence } from "../redis/redisPresence";
import { redisRooms } from "../redis/redisRooms";
import { socketAuthMiddleware } from "../../middlewares/socketAuthMiddleware";
import { handlePressBuzzer } from "./handelers/buzzerHandler";
import { handleTimeSync } from "./handelers/syncHandler";
import { Events } from "./enums/Events";

let ioInstance: Server | null = null;

export async function initializeSocket(server: HTTPServer): Promise<Server> {
  if (ioInstance) return ioInstance;

  // Connect all three Redis clients before creating the Socket.IO server
  await connectRedis();

  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  // Attach Redis adapter for cross-instance broadcasting
  io.adapter(createAdapter(pubClient, subClient));
  console.log("✅ Socket.IO Redis adapter attached");

  io.use(socketAuthMiddleware);

  io.on("connection", async (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    const user = (socket as any).user;
    const sessionId = user?.sessionId;

    // Track presence and room membership in Redis
    await redisPresence.addSocket(socket.id, user);
    await redisRooms.addSocketToSession(socket.id, user);

    // Join Socket.IO session room (broadcasting — Redis adapter syncs across instances)
    socket.join(`session:${sessionId}`);
    console.log(`Socket ${socket.id} joined room: session:${sessionId}`);

    // Join role-specific room
    const roleRoom = `session:${sessionId}:${user.role.toLowerCase()}`;
    socket.join(roleRoom);
    console.log(`Socket ${socket.id} joined room: ${roleRoom}`);

    // Join team room if user is a team/player
    if (user.role === "TEAM" || user.role === "USER") {
      const teamRoom = `session:${sessionId}:team:${user.id}`;
      socket.join(teamRoom);
      console.log(`Socket ${socket.id} joined team room: ${teamRoom}`);
    }

    // Handle press-buzzer event
    socket.on("press-buzzer", async (payload) => {
      await handlePressBuzzer(socket, payload);
    });

    // Handle time-sync event
    socket.on(Events.TIME_SYNC, (payload) => {
      handleTimeSync(socket, payload);
    });

    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      await redisPresence.removeSocket(socket.id);
      await redisRooms.removeSocketFromSession(socket.id);
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
