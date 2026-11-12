import { Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwtUtils";
import { getAccessTokenCookieName } from "../utils/cookieOptions";
import { Session } from "../modules/session/models/session.model";
import { SessionStatus } from "../modules/session/types/enums";
import { Team } from "../modules/teams/models/team.model";
import { isValidObjectId } from "../modules/gameState/utils/sessionScope";

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

  let payload: any;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new Error("Invalid token"));
  }

  if (typeof payload !== "object" || !payload.role) {
    return next(new Error("Invalid payload structure"));
  }

  // Only allow sockets for a real, live session (and, for teams, a team of it).
  verifySessionMembership(payload)
    .then((error) => {
      if (error) return next(new Error(error));
      (socket as any).user = payload;
      next();
    })
    .catch((err) => {
      console.error("Socket auth lookup failed:", err);
      next(new Error("Authentication failed"));
    });
};

async function verifySessionMembership(payload: any): Promise<string | null> {
  const sessionId = payload.sessionId;
  if (!isValidObjectId(sessionId)) {
    return "Invalid session";
  }

  const session = await Session.findById(sessionId).select("status").lean();
  if (!session) {
    return "Session not found";
  }
  if (session.status === SessionStatus.ENDED) {
    return "Session has ended";
  }

  if (payload.role === "TEAM") {
    if (!isValidObjectId(payload.id)) {
      return "Invalid team";
    }
    const team = await Team.exists({ _id: payload.id, session: sessionId });
    if (!team) {
      return "Team not found in this session";
    }
  }

  return null;
}

function parseCookieValue(cookies: string, cookieName: string): string | null {
  const match = cookies.match(new RegExp(`(^| )${cookieName}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}
