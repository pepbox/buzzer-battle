import { Request, Response, NextFunction } from "express";
import AppError from "../../../utils/appError"; // Adjust path as needed
import { ISession } from "../types/interfaces";
import { SessionStatus } from "../types/enums";
import SessionService from "../services/session.service";
import { SessionEmitters } from "../../../services/socket/sessionEmitters";
import { Events } from "../../../services/socket/enums/Events";
import AdminServices from "../../admin/services/admin.service";
import axios from "axios";
// import PlayerService from "../../players/services/player.service";
// import { Player } from "../../players/models/player.model";


const sessionService = new SessionService();
const adminService = new AdminServices();
// const playerService = new PlayerService(Player);


export const updateSession = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sessionId = req.user?.sessionId;
        const updateData: Partial<ISession> = req.body;

        if (!sessionId) {
            return next(new AppError("Session ID is required.", 400));
        }

        if (updateData.status && !Object.values(SessionStatus).includes(updateData.status)) {
            return next(new AppError("Invalid session status.", 400));
        }

        // Assuming you have imported the service as sessionService
        updateData.updatedAt = new Date();
        const updatedSession = await sessionService.updateSessionById(sessionId, updateData);

        if (!updatedSession) {
            return next(new AppError("Session not found.", 404));
        }
        SessionEmitters.toSession(sessionId.toString(), Events.SESSION_UPDATE, {});
        if (updateData.status === "ended") {
            // Notify the super admin server about the session end
            // const players = await playerService.getPlayersBySession(sessionId as Types.ObjectId);
            await axios.post(
                `${process.env.SUPER_ADMIN_SERVER_URL}/update`,
                {
                    gameSessionId: sessionId.toString(),
                    status: "ENDED",
                    completedOn: new Date().toISOString(),
                    // totalPlayers: players.length,
                    totalTeams: "0",
                }
            );
        }
        res.status(200).json({
            message: "Session updated successfully.",
            data: {
                session: updatedSession,
            },
            success: true,
        });
    } catch (error) {
        console.error("Error updating session:", error);
        next(new AppError("Failed to update session.", 500));
    }
};

export const getSession = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sessionId = req.user?.sessionId;
        if (!sessionId) {
            return next(new AppError("Session ID is required.", 400));
        }

        const session = await sessionService.fetchSessionById(sessionId);

        res.status(200).json({
            message: "Session fetched successfully.",
            data: session,

            success: true,
        });
    } catch (error: any) {
        if (error.message === "Session not found") {
            return next(new AppError("Session not found.", 404));
        }
        console.error("Error fetching session:", error);
        next(new AppError("Failed to fetch session.", 500));
    }
};

export const createSession = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // try {
    //     const { name, adminName, adminPin: password, gameConfig } = req.body;
    //     const { numberOfTeams } = gameConfig;
    //     const newSession = await sessionService.createSession({
    //         name,
    //         numberOfTeams: numberOfTeams || null,
    //     });

    //     await adminService.createAdmin({
    //         name: adminName,
    //         sessionId: newSession._id as Types.ObjectId,
    //         password: password,
    //     });
    //     await teamService.createMultipleTeams(numberOfTeams, {
    //         session: newSession._id as Types.ObjectId,
    //     });

    //     res.status(201).json({
    //         message: "Session created successfully.",
    //         data: {
    //             sessionId: newSession._id,
    //             adminLink: `${process.env.FRONTEND_URL}/admin/${newSession._id}/login`,
    //             playerLink: `${process.env.FRONTEND_URL}/game/${newSession._id}`,
    //             session: newSession,
    //         },
    //         success: true,
    //     });
    // } catch (error) {
    //     console.error("Error creating session:", error);
    //     next(new AppError("Failed to create session.", 500));
    // }
};


export const updateSessionServer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { sessionId, name, adminName, adminPin: password } = req.body;

        if (!sessionId) {
            return next(new AppError("Session ID and Admin ID are required.", 400));
        }

        // Prepare session update data
        const sessionUpdateData: Partial<ISession> = {};
        // if (name) sessionUpdateData.name = name;
        sessionUpdateData.updatedAt = new Date();

        // Update session
        const updatedSession = await sessionService.updateSessionById(sessionId, sessionUpdateData);
        if (!updatedSession) {
            return next(new AppError("Session not found.", 404));
        }

        // Prepare admin update data
        const adminUpdateData: Partial<{ name: string; password: string }> = {};
        if (adminName) adminUpdateData.name = adminName;
        if (password) adminUpdateData.password = password;

        let updatedAdmin = null;
        if (Object.keys(adminUpdateData).length > 0) {
            updatedAdmin = await adminService.updateAdmin(sessionId, adminUpdateData);
        }

        res.status(200).json({
            message: "Session server updated successfully.",
            data: {
                session: updatedSession,
                ...(updatedAdmin && { admin: updatedAdmin }),
            },
            success: true,
        });
    } catch (error) {
        console.error("Error updating session server:", error);
        next(new AppError("Failed to update session server.", 500));
    }
};
