import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import AppError from "../../../utils/appError";

/** True only for a 24-hex-char ObjectId string (or an ObjectId instance). */
export const isValidObjectId = (value: unknown): boolean => {
  if (value instanceof Types.ObjectId) return true;
  return typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
};

/** Error for a token whose sessionId is not a real session (e.g. superadmin "global"). */
export const sessionScopeError = (sessionId: unknown): AppError | null => {
  if (!sessionId) {
    return new AppError("Session ID not found in token.", 401);
  }
  if (!isValidObjectId(sessionId)) {
    return new AppError("This action requires a session-scoped login.", 403);
  }
  return null;
};

/**
 * Express middleware (use after authenticateUser): rejects tokens whose sessionId
 * is not an ObjectId, so session-scoped queries never hit a CastError.
 */
export const requireSessionScope = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const error = sessionScopeError(req.user?.sessionId);
  if (error) return next(error);
  next();
};
