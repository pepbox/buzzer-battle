import { Socket } from "socket.io";
import { verifyToken } from "../utils/jwtUtils";

export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void
) => {
  // const token = socket.handshake.auth?.token;
  const cookies = socket.handshake.headers?.cookie;
  if (!cookies) {
    return next(new Error("Authentication cookie required"));
  }

  const token = parseCookieValue(cookies, "accessToken");

  if (!token) return next(new Error("Token missing"));

  try {
    const payload = verifyToken(token);

    if (typeof payload === "object" && payload.role) {
      (socket as any).user = payload;
      return next();
    }

    next(new Error("Invalid payload structure"));
  } catch {
    next(new Error("Invalid token"));
  }
};

function parseCookieValue(cookies: string, cookieName: string): string | null {
  const match = cookies.match(new RegExp(`(^| )${cookieName}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}
