import { Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwtUtils";
import { getAccessTokenCookieName } from "../utils/cookieOptions";

export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  console.log("Authenticating socket...");
  // const token = socket.handshake.auth?.token;
  const cookies = socket.handshake.headers?.cookie;
  const sessionId = socket.handshake.auth?.sessionId;
  if (!cookies) {
    console.log("No cookies found in handshake headers");
    return next(new Error("Authentication cookie required"));
  }

  const scopedCookieName =
    typeof sessionId === "string" && sessionId.trim().length > 0
      ? getAccessTokenCookieName(sessionId)
      : "accessToken";

  const token =
    parseCookieValue(cookies, scopedCookieName) ||
    parseCookieValue(cookies, "accessToken");

  if (!token) {
    console.log("No access token found");
    return next(new Error("Token missing"));
  }

  try {
    const payload = verifyAccessToken(token);

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
