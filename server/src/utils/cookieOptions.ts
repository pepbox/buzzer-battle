export const setCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const COOKIE_PREFIX = "buzzerbattle";

const sanitizeSessionId = (sessionId: string) =>
  sessionId.replace(/[^a-zA-Z0-9_-]/g, "");

export const getAccessTokenCookieName = (sessionId: string) =>
  `${COOKIE_PREFIX}_${sanitizeSessionId(sessionId)}_accessToken`;

export const getRefreshTokenCookieName = (sessionId: string) =>
  `${COOKIE_PREFIX}_${sanitizeSessionId(sessionId)}_refreshToken`;

export const parseSessionScopedAccessToken = (
  cookies: Record<string, string | undefined>,
  sessionId?: string,
) => {
  if (sessionId) {
    const scopedName = getAccessTokenCookieName(sessionId);
    // When session is explicit, only accept that session's token.
    // Falling back to legacy cookie here can cause cross-session role mismatches.
    return cookies[scopedName];
  }

  // Backward compatibility for older clients
  return cookies.accessToken;
};
