import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { parseSessionScopedAccessToken } from "../utils/cookieOptions";

dotenv.config();

export const authenticateUser = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const sessionIdFromRequest =
    req.header("x-session-id") ||
    (typeof req.query.sessionId === "string" ? req.query.sessionId : undefined);
  const token = parseSessionScopedAccessToken(
    req.cookies,
    sessionIdFromRequest,
  );

  if (!token) {
    res
      .status(401)
      .json({ success: false, message: "Unauthorized: No token provided" });
    return; // Ensure function exits here
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string,
    ) as { id: string; role: "USER" | "ADMIN" | "TEAM"; sessionId: string };
    req.user = decoded;
    next();
  } catch (error) {
    console.log(error);
    res
      .status(401)
      .json({ success: false, message: "Unauthorized: Invalid token" });
    return;
  }
};

export const authorizeRoles = (...roles: ("USER" | "ADMIN" | "TEAM")[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("for user:", req.user.role);
    if (!req.user || !roles.includes(req.user.role)) {
      res
        .status(403)
        .json({
          success: false,
          message: "Forbidden: Insufficient permissions",
        });
      return;
    }
    next();
  };
};
