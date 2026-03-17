import { NextFunction, Request, Response } from "express";
import AppError from "../../../utils/appError";
import TeamService from "../services/team.service";
import { generateAccessToken } from "../../../utils/jwtUtils";
import {
  getAccessTokenCookieName,
  setCookieOptions,
} from "../../../utils/cookieOptions";
import SessionService from "../../session/services/session.service";
import { SessionStatus } from "../../session/types/enums";
import { SessionEmitters } from "../../../services/socket/sessionEmitters";
import { Events } from "../../../services/socket/enums/Events";
import GameStateService from "../../gameState/services/gameState.service";

const teamService = new TeamService();
const sessionService = new SessionService();
const gameStateService = new GameStateService();

/**
 * Create a new team (registration)
 * POST /api/v1/teams/create
 */
export const createTeam = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { teamNumber, teamName, sessionId } = req.body;

    // Validation
    if (!teamNumber || !teamName || !sessionId) {
      return next(
        new AppError(
          "Team number, team name, and session ID are required.",
          400,
        ),
      );
    }

    // Check if session exists and is not ended
    const session = await sessionService.fetchSessionById(sessionId);
    if (!session) {
      return next(new AppError("Session not found.", 404));
    }

    if (session.status === SessionStatus.ENDED) {
      const gameState =
        await gameStateService.fetchGameStateBySessionId(sessionId);
      const totalQuestions = session.questions.length;
      const currentQuestionIndex = gameState?.currentQuestionIndex ?? -1;
      const looksStaleEnded =
        totalQuestions > 0 && currentQuestionIndex < totalQuestions - 1;

      if (looksStaleEnded) {
        session.status =
          currentQuestionIndex >= 0
            ? SessionStatus.PLAYING
            : SessionStatus.NOT_STARTED;
        await session.save();
      } else {
        return next(
          new AppError("Session has ended. Cannot create new teams.", 403),
        );
      }
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

    // Set session-scoped cookie to avoid stale cross-session auto-login
    res.cookie(
      getAccessTokenCookieName(team.session.toString()),
      accessToken,
      setCookieOptions,
    );

    // Emit TEAM_JOINED event to admins in the session
    try {
      SessionEmitters.toSessionAdmins(
        team.session.toString(),
        Events.TEAM_JOINED,
        {
          team: {
            _id: team._id,
            teamNumber: team.teamNumber,
            teamName: team.teamName,
            teamScore: team.teamScore,
            joinedAt: team.joinedAt,
          },
        },
      );
    } catch (socketError) {
      console.error("Error emitting TEAM_JOINED event:", socketError);
      // Don't fail the request if socket emission fails
    }

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
  next: NextFunction,
) => {
  try {
    const teamId = req.user?.id;
    const requestedSessionId = req.query.sessionId as string | undefined;

    if (!teamId) {
      return next(new AppError("Team ID not found in token.", 401));
    }

    if (requestedSessionId && req.user?.sessionId !== requestedSessionId) {
      return next(
        new AppError("Session mismatch for team authentication.", 401),
      );
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
  next: NextFunction,
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
  next: NextFunction,
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

/**
 * Fetch joined team numbers in a session
 * GET /api/v1/teams/joined/:sessionId
 */
export const fetchJoinedTeamNumbers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return next(new AppError("Session ID is required.", 400));
    }

    const joinedTeamNumbers =
      await teamService.fetchJoinedTeamNumbers(sessionId);

    res.status(200).json({
      message: "Joined team numbers fetched successfully.",
      data: {
        joinedTeamNumbers,
      },
    });
  } catch (error: any) {
    console.error("Error fetching joined team numbers:", error);
    next(new AppError("Failed to fetch joined team numbers.", 500));
  }
};
