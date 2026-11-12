import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { connectRedis, pubClient, subClient } from "../redis/redisClient";
import { redisPresence } from "../redis/redisPresence";
import { redisRooms } from "../redis/redisRooms";
import { socketAuthMiddleware } from "../../middlewares/socketAuthMiddleware";
import { handleSpinWheel } from "./handelers/spinHandler";
import { handleTimeSync } from "./handelers/syncHandler";
import { handleSpinPassSelect } from "./handelers/spinPassHandler";
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

    // Track presence and room membership in Redis. A Redis hiccup must not
    // leave an unhandled rejection or keep the socket out of its rooms.
    try {
      await redisPresence.addSocket(socket.id, user);
      await redisRooms.addSocketToSession(socket.id, user);
    } catch (error) {
      console.error(`Redis presence tracking failed for socket ${socket.id}:`, error);
    }

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

    // Buzzer presses go through REST (POST /buzzer/press); no socket handler.

    // Handle spin-wheel event
    socket.on("spin-wheel", async () => {
      await handleSpinWheel(socket);
    });

    // Spin wheel: wrong team's captain picks the next team
    socket.on(Events.SPIN_PASS_SELECT, async (payload) => {
      await handleSpinPassSelect(socket, payload);
    });

    // Handle time-sync event
    socket.on(Events.TIME_SYNC, (payload) => {
      handleTimeSync(socket, payload);
    });

    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      try {
        await redisPresence.removeSocket(socket.id);
        await redisRooms.removeSocketFromSession(socket.id);
      } catch (error) {
        console.error(`Redis cleanup failed for socket ${socket.id}:`, error);
      }
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
