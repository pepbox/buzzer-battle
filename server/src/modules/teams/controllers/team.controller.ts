import { Request, Response } from 'express';
import { NextFunction } from 'express';
import TeamService from '../services/team.service';
import AppError from '../../../utils/appError';

const teamService = new TeamService();

export const getAllTeamsBySessionId = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { sessionId } = req.params;
        if (!sessionId) {
            return next(new AppError('Session ID is required', 400));
        }
        const teams = await teamService.getAllTeamsBySessionId(sessionId);
        res.status(200).json({
            message: "Teams fetched successfully.",
            data: teams,
            success: true,
        });
    } catch (error) {
        console.error("Error fetching teams:", error);
        next(new AppError("Failed to fetch teams.", 500));
    }
};