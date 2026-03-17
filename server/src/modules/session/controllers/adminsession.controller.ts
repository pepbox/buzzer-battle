import { Request, Response, NextFunction } from "express";
import AppError from "../../../utils/appError";
import { ISession, Session } from "../models/session.model";
import adminModel from "../../admin/models/admin.model";
import { Types } from "mongoose";
import { SessionStatus } from "../types/enums";
import { SessionEmitters } from "../../../services/socket/sessionEmitters";
import { Events } from "../../../services/socket/enums/Events";

/**
 * POST /api/v1/session/create-session
 * Called by the super-admin server to create a new game session + admin credentials.
 * No user auth required (server-to-server).
 *
 * Body: { name, adminName, adminPin }
 */
export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, adminName, adminPin: password } = req.body;

    if (!name || !adminName || !password) {
      return next(
        new AppError("name, adminName and adminPin are required.", 400),
      );
    }

    const newSession = new Session({ sessionName: name });
    await newSession.save();

    const existingAdmin = await adminModel.findOne({
      sessionId: newSession._id,
    });
    if (existingAdmin) {
      return next(
        new AppError("Admin with this session ID already exists.", 400),
      );
    }

    const admin = new adminModel({
      name: adminName,
      sessionId: newSession._id as unknown as Types.ObjectId,
      password: password,
    });
    await admin.save();

    res.status(201).json({
      message: "Session created successfully.",
      data: {
        sessionId: newSession._id,
        adminLink: `${process.env.FRONTEND_URL}/admin/${newSession._id}/login`,
        playerLink: `${process.env.FRONTEND_URL}/game/${newSession._id}`,
        session: newSession,
      },
      success: true,
    });
  } catch (error) {
    console.error("Error creating session:", error);
    next(new AppError("Failed to create session.", 500));
  }
};

/**
 * POST /api/v1/session/update-session
 * Called by the super-admin server to update session name and/or admin credentials.
 * No user auth required (server-to-server).
 *
 * Body: { sessionId, name?, adminName?, adminPin? }
 */
export const updateSessionServer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId, name, adminName, adminPin: password } = req.body;

    if (!sessionId) {
      return next(new AppError("sessionId is required.", 400));
    }

    // Prepare session update data
    const sessionUpdateData: Partial<ISession> = {};
    if (name) sessionUpdateData.sessionName = name;
    sessionUpdateData.updatedAt = new Date();

    // Update session
    const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      sessionUpdateData,
      { new: true, runValidators: true },
    );
    if (!updatedSession) {
      return next(new AppError("Session not found.", 404));
    }

    // Prepare admin update data
    const adminUpdateData: Partial<{ name: string; password: string }> = {};
    if (adminName) adminUpdateData.name = adminName;
    if (password) adminUpdateData.password = password;

    let updatedAdmin = null;
    if (Object.keys(adminUpdateData).length > 0) {
      const adminDoc = await adminModel.findOneAndUpdate(
        { sessionId },
        { $set: adminUpdateData },
        { new: true },
      );
      if (!adminDoc) {
        return next(new AppError("Admin not found.", 404));
      }
      updatedAdmin = { ...adminDoc.toObject(), password: undefined };
    }

    res.status(200).json({
      message: "Session updated successfully.",
      data: {
        session: updatedSession,
        ...(updatedAdmin && { admin: updatedAdmin }),
      },
      success: true,
    });
  } catch (error) {
    console.error("Error updating session:", error);
    next(new AppError("Failed to update session.", 500));
  }
};

/**
 * POST /api/v1/session/end-session
 * Called by the super-admin server to mark a session as ENDED.
 * No user auth required (server-to-server).
 *
 * Body: { sessionId }
 */
export const endSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { sessionId } = req.body;
  try {
    if (!sessionId) {
      return next(new AppError("sessionId is required.", 400));
    }

    const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      {
        status: SessionStatus.ENDED,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true },
    );

    if (!updatedSession) {
      return next(new AppError("Session not found.", 404));
    }

    // Emit SESSION_ENDED event to all users in this session (both admins and teams)
    SessionEmitters.toSession(sessionId.toString(), Events.SESSION_ENDED, {
      message:
        "Session has been ended by super admin. You have been logged out.",
    });

    res.status(200).json({
      message: "Session ended successfully.",
      data: {
        session: updatedSession,
      },
      success: true,
    });
  } catch (error) {
    console.error("Error ending session:", error);
    next(new AppError("Failed to end session.", 500));
  }
};
