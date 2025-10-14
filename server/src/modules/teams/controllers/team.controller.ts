import { NextFunction, Request, Response } from 'express';
import AppError from '../../../utils/appError';
import TeamService from '../services/team.service';
import { generateAccessToken } from '../../../utils/jwtUtils';
import { setCookieOptions } from '../../../utils/cookieOptions';
import SessionService from '../../session/services/session.service';
import { SessionStatus } from '../../session/types/enums';

const teamService = new TeamService();
const sessionService = new SessionService();

/**
 * Create a new team (registration)
 * POST /api/v1/teams/create
 */
export const createTeam = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { teamNumber, teamName, sessionId } = req.body;

        // Validation
        if (!teamNumber || !teamName || !sessionId) {
            return next(
                new AppError("Team number, team name, and session ID are required.", 400)
            );
        }

        // Check if session exists and is not ended
        const session = await sessionService.fetchSessionById(sessionId);
        if (!session) {
            return next(new AppError("Session not found.", 404));
        }

        if (session.status === SessionStatus.ENDED) {
            return next(
                new AppError("Session has ended. Cannot create new teams.", 403)
            );
        }

        // Create team
        const team = await teamService.createTeam({
            teamNumber,
            teamName,
            sessionId,
        });

        // Generate JWT token
        const accessToken = generateAccessToken({
            id: team._id.toString(),
            role: "TEAM",
            sessionId: team.session.toString(),
        });

        // Set cookie
        res.cookie("accessToken", accessToken, setCookieOptions);

        res.status(201).json({
            message: "Team created successfully.",
            data: {
                team: {
                    _id: team._id,
                    teamNumber: team.teamNumber,
                    teamName: team.teamName,
                    teamScore: team.teamScore,
                    joinedAt: team.joinedAt,
                    sessionId: team.session,
                },
                accessToken,
            },
        });
    } catch (error: any) {
        console.error("Error creating team:", error);
        if (error.message === "Team number already exists in this session") {
            return next(new AppError(error.message, 409));
        }
        next(new AppError("Failed to create team.", 500));
    }
};

/**
 * Fetch current team details
 * GET /api/v1/teams/me
 * Requires authentication
 */
export const fetchTeam = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const teamId = req.user?.id;

        if (!teamId) {
            return next(new AppError("Team ID not found in token.", 401));
        }

        const team = await teamService.fetchTeamById(teamId);

        res.status(200).json({
            message: "Team fetched successfully.",
            data: {
                team: {
                    _id: team._id,
                    teamNumber: team.teamNumber,
                    teamName: team.teamName,
                    teamScore: team.teamScore,
                    joinedAt: team.joinedAt,
                    sessionId: team.session,
                },
            },
        });
    } catch (error: any) {
        console.error("Error fetching team:", error);
        if (error.message === "Team not found") {
            return next(new AppError(error.message, 404));
        }
        next(new AppError("Failed to fetch team.", 500));
    }
};

/**
 * Fetch overall leaderboard for the session
 * GET /api/v1/teams/leaderboard
 * Requires authentication
 */
export const fetchOverallLeaderboard = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sessionId = req.user?.sessionId;

        if (!sessionId) {
            return next(new AppError("Session ID not found in token.", 401));
        }

        const leaderboard = await teamService.fetchOverallLeaderboard(sessionId);

        res.status(200).json({
            message: "Leaderboard fetched successfully.",
            data: {
                leaderboard,
            },
        });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        next(new AppError("Failed to fetch leaderboard.", 500));
    }
};

/**
 * Fetch the total number of teams in a session
 * GET /api/v1/teams/total/:sessionId
 */
export const fetchTotalTeamsInSession = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return next(new AppError("Session ID is required.", 400));
        }

        const totalTeams = await teamService.fetchTotalTeamsInSession(sessionId);

        res.status(200).json({
            message: "Total number of teams fetched successfully.",
            data: {
                totalTeams,
            },
        });
    } catch (error: any) {
        console.error("Error fetching total teams in session:", error);
        if (error.message === "Session not found or numberOfTeams not set") {
            return next(new AppError(error.message, 404));
        }
        next(new AppError("Failed to fetch total teams in session.", 500));
    }
};
