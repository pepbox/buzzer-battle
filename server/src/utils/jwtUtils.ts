import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export interface AccessTokenPayload {
  id: string;
  role: "USER" | "ADMIN" | "TEAM";
  sessionId: string;
}

export const generateAccessToken = (payload: AccessTokenPayload) => {
  const { id, role, sessionId } = payload;
  return jwt.sign(
    { id, role, sessionId },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: parseInt(process.env.ACCESS_TOKEN_EXPIRY || "900", 10),
    },
  );
};

export const generateRefreshToken = (id: string) => {
  return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET as string, {
    expiresIn: parseInt(process.env.REFRESH_TOKEN_EXPIRY || "604800", 10),
  });
};

export const verifyAccessToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string);
  } catch (error) {
    throw new Error("Invalid access token");
  }
};

export const verifyRefreshToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET as string);
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
};

// Backward compatibility alias
export const verifyToken = verifyAccessToken;
