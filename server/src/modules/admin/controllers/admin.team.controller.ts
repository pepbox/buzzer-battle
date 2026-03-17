import { NextFunction, Request, Response } from "express";
import AppError from "../../../utils/appError";
import TeamService from "../../teams/services/team.service";
import SessionService from "../../session/services/session.service";
import GameStateService from "../../gameState/services/gameState.service";
import QuestionService from "../../questions/services/question.service";

const teamService = new TeamService();
const sessionService = new SessionService();
const gameStateService = new GameStateService();
const questionService = new QuestionService();

/**
 * Fetch complete admin dashboard data
 * GET /api/v1/admin/dashboard
 */
export const fetchDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = req.user?.sessionId;

    if (!sessionId) {
      return next(new AppError("Session ID not found in token.", 401));
    }

    // Fetch session details
    const session = await sessionService.fetchSessionById(sessionId);
    if (!session) {
      return next(new AppError("Session not found.", 404));
    }

    // Fetch game state
    let gameState = null;
    try {
      gameState = await gameStateService.fetchGameStateBySessionId(sessionId);
    } catch (error) {
      // If game state doesn't exist yet, use default values
      gameState = null;
    }

    // Fetch all teams with their details
    const teams = await teamService.fetchTeamsBySession(sessionId);

    // Fetch responses count for each team
    const teamsWithDetails = await Promise.all(
      teams.map(async (team) => {
        const responses = await questionService.fetchResponsesByTeamId(
          team._id,
        );

        return {
          _id: team._id,
          teamNumber: team.teamNumber,
          teamName: team.teamName,
          teamScore: team.teamScore,
          joinedAt: team.joinedAt,
          responsesCount: responses.length,
          // Calculate status based on game state
          status:
            gameState &&
            gameState.currentAnsweringTeam?.toString() === team._id.toString()
              ? "answering"
              : "idle",
        };
      }),
    );

    // Sort teams by score (highest first), then by joinedAt
    const sortedTeams = teamsWithDetails.sort((a, b) => {
      if (b.teamScore !== a.teamScore) {
        return b.teamScore - a.teamScore;
      }
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });

    // Add rank to each team
    const teamsWithRank = sortedTeams.map((team, index) => ({
      ...team,
      rank: index + 1,
    }));

    // Calculate statistics
    const totalTeamsRegistered = teams.length;
    const totalTeamsExpected = session.numberOfTeams || 0;

    res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully.",
      data: {
        session: {
          _id: session._id,
          sessionName: session.sessionName,
          status: session.status,
          questionTimeLimit: session.questionTimeLimit,
          answerTimeLimit: session.answerTimeLimit,
          numberOfTeams: session.numberOfTeams,
          totalQuestions: session.questions.length,
        },
        gameState: {
          currentQuestionIndex: gameState?.currentQuestionIndex ?? -1,
          gameStatus: gameState?.gameStatus || "paused",
          currentAnsweringTeam: gameState?.currentAnsweringTeam || null,
        },
        teams: teamsWithRank,
        statistics: {
          totalTeamsRegistered,
          totalTeamsExpected,
          currentQuestion: Math.max(
            0,
            (gameState?.currentQuestionIndex ?? -1) + 1,
          ),
          totalQuestions: session.questions.length,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching dashboard data:", error);
    next(new AppError(error.message || "Failed to fetch dashboard data.", 500));
  }
};

/**
 * Update team details (name or score)
 * PUT /api/v1/admin/teams/:teamId
 * Body: { teamName?: string, teamScore?: number }
 */
export const updateTeam = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { teamId } = req.params;
    const { teamName, teamScore } = req.body;

    if (!teamId) {
      return next(new AppError("Team ID is required.", 400));
    }

    // Validate at least one field is provided
    if (teamName === undefined && teamScore === undefined) {
      return next(
        new AppError("Either teamName or teamScore must be provided.", 400),
      );
    }

    // Fetch team to verify it exists
    const team = await teamService.fetchTeamById(teamId);
    if (!team) {
      return next(new AppError("Team not found.", 404));
    }

    // Prepare update data
    const updateData: any = {};

    if (teamName !== undefined) {
      if (typeof teamName !== "string" || teamName.trim().length === 0) {
        return next(new AppError("Team name must be a non-empty string.", 400));
      }
      updateData.teamName = teamName.trim();
    }

    if (teamScore !== undefined) {
      if (typeof teamScore !== "number" || teamScore < 0) {
        return next(
          new AppError("Team score must be a non-negative number.", 400),
        );
      }
      updateData.teamScore = teamScore;
    }

    // Update team using findByIdAndUpdate for efficiency
    const updatedTeam = await teamService.updateTeamById(teamId, updateData);

    res.status(200).json({
      success: true,
      message: "Team updated successfully.",
      data: {
        team: {
          _id: updatedTeam._id,
          teamNumber: updatedTeam.teamNumber,
          teamName: updatedTeam.teamName,
          teamScore: updatedTeam.teamScore,
        },
      },
    });
  } catch (error: any) {
    console.error("Error updating team:", error);
    next(new AppError(error.message || "Failed to update team.", 500));
  }
};

/**
 * Fetch team responses (all questions answered by a team)
 * GET /api/v1/admin/teams/:teamId/responses
 */
export const fetchTeamResponses = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { teamId } = req.params;

    if (!teamId) {
      return next(new AppError("Team ID is required.", 400));
    }

    // Fetch team
    const team = await teamService.fetchTeamById(teamId);
    if (!team) {
      return next(new AppError("Team not found.", 404));
    }

    // Fetch all responses for this team
    const responses = await questionService.fetchResponsesByTeamId(teamId);

    // Populate responses with question details
    const detailedResponses = await Promise.all(
      responses.map(async (response: any) => {
        // Response already has question populated
        const question = response.questionId;

        // Find the correct option
        const correctOption = question.options.find(
          (opt: any) => opt.optionId === question.correctAnswer,
        );

        // Find team's selected option
        const teamOption = question.options.find(
          (opt: any) => opt.optionId === response.response,
        );

        const isCorrect = question.correctAnswer === response.response;

        return {
          questionId: question._id,
          questionText: question.questionText,
          questionImage: question.questionImage,
          questionVideo: question.questionVideo,
          options: question.options,
          teamResponse: response.response,
          teamResponseText: teamOption?.optionText || "N/A",
          correctAnswer: question.correctAnswer,
          correctAnswerText: correctOption?.optionText || "N/A",
          isCorrect: isCorrect,
          pointsEarned: isCorrect ? question.score : 0,
          timeElapsed: response.timeElapsed,
          answeredAt: response.createdAt,
        };
      }),
    );

    res.status(200).json({
      success: true,
      message: "Team responses fetched successfully.",
      data: {
        team: {
          _id: team._id,
          teamNumber: team.teamNumber,
          teamName: team.teamName,
          teamScore: team.teamScore,
        },
        responses: detailedResponses,
      },
    });
  } catch (error: any) {
    console.error("Error fetching team responses:", error);
    next(new AppError(error.message || "Failed to fetch team responses.", 500));
  }
};
