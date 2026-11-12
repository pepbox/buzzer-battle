import { NextFunction, Request, Response } from "express";
import { ensureSessionCaptains } from "../../teams/captain";
import { Types } from "mongoose";
import AppError from "../../../utils/appError";
import GameStateService from "../services/gameState.service";
import QuestionService from "../../questions/services/question.service";
import TeamService from "../../teams/services/team.service";
import { GameStatus } from "../types/enums";
import { SessionEmitters } from "../../../services/socket/sessionEmitters";
import { Events } from "../../../services/socket/enums/Events";
import { timerManager } from "../../../services/timerManager";
import { Session } from "../../session/models/session.model";
import { SessionStatus } from "../../session/types/enums";
import { GameState } from "../models/gameState.model";
import {
  getCorrectPoints,
  getWrongPenalty,
} from "../../questions/constants";
import { setSessionQuestionFlags } from "../../session/questionSettings";
import {
  SpinPassError,
  endSpinTurn,
  handleSpinWrongAnswer,
  passSpinQuestionToTeam,
} from "../services/spinPass";
import mongoose from "mongoose";

const gameStateService = new GameStateService();
const questionService = new QuestionService();
const teamService = new TeamService();

/**
 * Fetch current game state for the session
 * GET /api/v1/game-state/current
 * Requires authentication
 */
export const fetchGameState = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = req.user?.sessionId;

    if (!sessionId) {
      return next(new AppError("Session ID not found in token.", 401));
    }

    let gameState = await gameStateService.fetchGameStateBySessionId(sessionId);

    // If game state doesn't exist, create one
    if (!gameState) {
      gameState = await gameStateService.createGameState(sessionId);
    }

    const session = await Session.findById(sessionId).select("gameMode");

    res.status(200).json({
      message: "Game state fetched successfully.",
      data: {
        gameState: {
          ...gameState.toObject(),
          gameMode: session?.gameMode || null,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching game state:", error);
    next(new AppError("Failed to fetch game state.", 500));
  }
};

/**
 * Unified game state update controller (ADMIN only)
 * PATCH /api/v1/game-state
 * Body: { action: string, payload?: any }
 * Requires admin authentication
 */
export const updateGameStateUnified = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = req.user?.sessionId;
    const { action, payload } = req.body;

    if (!sessionId) {
      return next(new AppError("Session ID not found in token.", 401));
    }

    if (!action) {
      return next(new AppError("Action is required.", 400));
    }

    // Ensure gameState exists before processing any action
    let existingGameState =
      await gameStateService.fetchGameStateBySessionId(sessionId);
    if (!existingGameState) {
      existingGameState = await gameStateService.createGameState(sessionId);
    }

    let gameState;
    let additionalData: any = {};

    switch (action) {
      case "PAUSE":
        // Cancel any active timers for this session
        timerManager.cancelSessionTimers(sessionId);

        gameState = await gameStateService.pauseGame(sessionId);

        // Emit socket event
        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          gameStatus: gameState.gameStatus,
          currentQuestionIndex: gameState.currentQuestionIndex,
          currentAnsweringTeam: gameState.currentAnsweringTeam,
          buzzerRoundStartTime: gameState.buzzerRoundStartTime,
          answeringStartTime: gameState.answeringRoundStartTime,
        });
        break;

      case "RESUME":
        gameState = await gameStateService.resumeGame(sessionId);

        // Emit socket event
        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          gameStatus: gameState.gameStatus,
          currentQuestionIndex: gameState.currentQuestionIndex,
          currentAnsweringTeam: gameState.currentAnsweringTeam,
          buzzerRoundStartTime: gameState.buzzerRoundStartTime,
          answeringStartTime: gameState.answeringRoundStartTime,
        });
        break;

      case "NEXT_QUESTION":
        // Cancel any active timers for this session
        timerManager.cancelSessionTimers(sessionId);

        // Teams without a captain get their first-joined member as captain.
        await ensureSessionCaptains(sessionId);

        const currentSessionForNext = await Session.findById(sessionId);
        if (currentSessionForNext?.gameMode === "SPIN_WHEEL") {
          if (existingGameState.currentQuestionIndex < 0) {
            gameState = await gameStateService.updateGameState(sessionId, {
              gameStatus: GameStatus.IDLE,
              currentAnsweringTeam: null,
            });
            await Session.findByIdAndUpdate(sessionId, {
              status: SessionStatus.PLAYING,
            });
          } else {
            gameState = existingGameState;
          }

          const categoriesData = await gameStateService.getAvailableCategories(sessionId);
          additionalData.availableCategories = categoriesData.categories;
          additionalData.categoryCounts = categoriesData.categoryCounts;
          additionalData.remainingQuestions = categoriesData.remainingQuestions;

          SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
            gameStatus: gameState.gameStatus,
            currentQuestionIndex: gameState.currentQuestionIndex,
            currentAnsweringTeam: gameState.currentAnsweringTeam,
            availableCategories: categoriesData.categories,
            categoryCounts: categoriesData.categoryCounts,
          });
          break;
        }

        // Apply the admin's per-session toggles (from the Next Question preview)
        // to the upcoming question before it starts.
        if (
          typeof payload?.hideFromUsers === "boolean" ||
          typeof payload?.keepBuzzer === "boolean"
        ) {
          const sessionForToggles =
            currentSessionForNext ?? (await Session.findById(sessionId));
          const upcomingQuestionId =
            sessionForToggles?.questions[
              existingGameState.currentQuestionIndex + 1
            ];
          if (upcomingQuestionId) {
            await setSessionQuestionFlags(sessionId, upcomingQuestionId, {
              hideFromUsers: payload.hideFromUsers,
              keepBuzzer: payload.keepBuzzer,
            });
          }
        }

        if (existingGameState.currentQuestionIndex < 0) {
          const joinedTeams = await teamService.fetchTeamsBySession(sessionId);
          const joinedTeamCount = joinedTeams.length;
          const session = await Session.findById(sessionId).select(
            "numberOfTeams",
          );

          if (session && session.numberOfTeams !== joinedTeamCount) {
            session.numberOfTeams = joinedTeamCount;
            await session.save();
          }
        }

        const result =
          await gameStateService.moveToNextQuestionWithCheck(sessionId);
        gameState = result.gameState;
        additionalData.gameEnded = result.gameEnded;

        if (result.gameEnded) {
          // Fetch final leaderboard
          const finalLeaderboard =
            await teamService.fetchOverallLeaderboard(sessionId);
          additionalData.finalLeaderboard = finalLeaderboard;

          // Emit game ended event
          SessionEmitters.toSession(sessionId, Events.GAME_ENDED, {
            finalLeaderboard,
          });
        } else {
          // Get current question
          const currentQuestion = await questionService.fetchCurrentQuestion(
            sessionId,
            gameState.currentQuestionIndex,
          );

          if (!currentQuestion) {
            return next(new AppError("Current question not found.", 404));
          }

          if (currentQuestion.keepBuzzer === false) {
            // For no-buzzer questions, do NOT auto-select a team.
            // Admin will manually select via dropdown in RemoteControl.
            // Keep game in IDLE state waiting for manual team selection.
            gameState = await gameStateService.updateGameState(sessionId, {
              gameStatus: GameStatus.IDLE,
              currentAnsweringTeam: null,
              awaitingTeamSelection: true,
            });

            // Mark as no-buzzer question. Players see a "host is picking a team" screen
            // until the admin selects a team; the question appears only after that.
            gameState.isNoBuzzerQuestion = true;
            gameState.teamsWhoAnsweredThisQuestion = [];
            await gameState.save();

            SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
              gameStatus: gameState.gameStatus,
              currentQuestionIndex: gameState.currentQuestionIndex,
              currentAnsweringTeam: gameState.currentAnsweringTeam,
              keepBuzzer: false,
              isNoBuzzerQuestion: true,
              awaitingTeamSelection: true,
            });

            break;
          }

          // Update to BUZZER_ROUND status and save timestamp
          gameState = await gameStateService.startBuzzerRound(sessionId);

          const buzzerStartTime =
            gameState.buzzerRoundStartTime ?? Date.now() + 1500;

          // Get session to fetch questionTimeLimit
          const session = await Session.findById(sessionId);
          const buzzerDuration = session?.questionTimeLimit || 30; // Default 30 seconds

          // NOTE: For admin-controlled flow, buzzer round has no auto-timer.
          // Admin manually clicks "Allow Top Team" to end buzzer round and select fastest team.
          // The game stays in BUZZER_ROUND until admin takes action.

          // Emit BUZZER_ROUND_STARTED with timestamp for synced timer
          SessionEmitters.toSession(sessionId, Events.BUZZER_ROUND_STARTED, {
            questionId: currentQuestion?._id,
            questionIndex: gameState.currentQuestionIndex,
            startTime: buzzerStartTime,
            duration: buzzerDuration * 1000,
          });

          // Also emit general game state change
          SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
            gameStatus: gameState.gameStatus,
            currentQuestionIndex: gameState.currentQuestionIndex,
            currentAnsweringTeam: gameState.currentAnsweringTeam,
            buzzerRoundStartTime: buzzerStartTime,
            isNoBuzzerQuestion: false,
            awaitingTeamSelection: false,
          });
        }
        break;

      case "SHOW_ANSWER":
        // Must have an active/current question before revealing answer.
        if (existingGameState.currentQuestionIndex < 0) {
          return next(
            new AppError("No active question to reveal answer for.", 400),
          );
        }

        // Move to idle so /questions/current returns answer content for teams.
        gameState = await gameStateService.updateGameState(sessionId, {
          gameStatus: GameStatus.IDLE,
          awaitingTeamSelection: false,
          spinPassPickerTeam: null,
          answerWithheld: false,
        });

        SessionEmitters.toSession(sessionId, Events.SHOW_ANSWER, {
          currentQuestionIndex: gameState.currentQuestionIndex,
          timestamp: Date.now(),
        });

        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          gameStatus: gameState.gameStatus,
          currentQuestionIndex: gameState.currentQuestionIndex,
          currentAnsweringTeam: gameState.currentAnsweringTeam,
          awaitingTeamSelection: false,
          spinPassPickerTeam: null,
          answerWithheld: false,
          forceAnswerReveal: true,
        });
        break;

      case "PASS_TO_SECOND_TEAM":
        if (!payload?.questionId) {
          return next(
            new AppError(
              "Question ID is required for PASS_TO_SECOND_TEAM action.",
              400,
            ),
          );
        }

        // Cancel previous answering timer
        timerManager.cancelTimer(`answering-${sessionId.toString()}-*`);

        gameState = await gameStateService.passToSecondTeam(
          sessionId,
          payload.questionId,
        );

        const secondChanceStartTime = Date.now();

        // Get session to fetch answerTimeLimit
        const sessionForSecond = await Session.findById(sessionId);
        const secondAnswerDuration = sessionForSecond?.answerTimeLimit || 60;

        // NOTE: For verbal answer flow, admin manually marks answers.
        // Auto-transition timer removed - admin uses Mark Correct/Wrong buttons.

        // Emit socket event with second chance info and timestamp
        SessionEmitters.toSession(sessionId, Events.SECOND_CHANCE, {
          teamId: gameState.currentAnsweringTeam,
          gameStatus: gameState.gameStatus,
          startTime: secondChanceStartTime,
          duration: secondAnswerDuration * 1000,
        });

        // Emit answering round started to the specific team
        SessionEmitters.toTeam(
          sessionId,
          gameState.currentAnsweringTeam?.toString() || "",
          Events.ANSWERING_ROUND_STARTED,
          {
            questionId: payload.questionId,
            startTime: secondChanceStartTime,
            duration: secondAnswerDuration * 1000,
          },
        );

        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          gameStatus: gameState.gameStatus,
          currentQuestionIndex: gameState.currentQuestionIndex,
          currentAnsweringTeam: gameState.currentAnsweringTeam,
          answeringStartTime: secondChanceStartTime,
        });
        break;

      case "SET_ANSWERING_TEAM":
        if (!payload?.teamId) {
          return next(
            new AppError(
              "Team ID is required for SET_ANSWERING_TEAM action.",
              400,
            ),
          );
        }

        // Cancel buzzer timer since we're manually selecting a team
        timerManager.cancelTimer(`buzzer-${sessionId.toString()}`);

        gameState = await gameStateService.setAnsweringTeam(
          sessionId,
          payload.teamId,
        );

        const answeringStartTime = Date.now();

        // Get session to fetch answerTimeLimit
        const sessionForAnswering = await Session.findById(sessionId);
        const answerDuration = sessionForAnswering?.answerTimeLimit || 60;

        // NOTE: For verbal answer flow, admin manually marks answers.
        // Auto-transition timer removed - admin uses Mark Correct/Wrong buttons.

        // Emit team selected event
        SessionEmitters.toSession(sessionId, Events.TEAM_SELECTED, {
          teamId: gameState.currentAnsweringTeam,
          startTime: answeringStartTime,
        });

        // Emit answering round started to the specific team
        const questionForAnswering = await questionService.fetchCurrentQuestion(
          sessionId,
          gameState.currentQuestionIndex,
        );

        SessionEmitters.toTeam(
          sessionId,
          payload.teamId,
          Events.ANSWERING_ROUND_STARTED,
          {
            questionId: questionForAnswering?._id,
            startTime: answeringStartTime,
            duration: answerDuration * 1000,
          },
        );

        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          gameStatus: gameState.gameStatus,
          currentQuestionIndex: gameState.currentQuestionIndex,
          currentAnsweringTeam: gameState.currentAnsweringTeam,
          awaitingTeamSelection: false,
          answeringStartTime,
        });
        break;

      case "AUTO_SELECT_FASTEST_TEAM":
        if (!payload?.questionId) {
          return next(
            new AppError(
              "Question ID is required for AUTO_SELECT_FASTEST_TEAM action.",
              400,
            ),
          );
        }

        // Cancel the buzzer timer (admin fast-forwarding the process)
        timerManager.cancelTimer(`buzzer-${sessionId.toString()}`);

        gameState = await gameStateService.autoSelectFastestTeam(
          sessionId,
          payload.questionId,
        );

        const autoSelectStartTime = Date.now();

        // Get session to fetch answerTimeLimit
        const sessionForAuto = await Session.findById(sessionId);
        const autoAnswerDuration = sessionForAuto?.answerTimeLimit || 60;

        // NOTE: For verbal answer flow, admin manually marks answers.
        // Auto-transition timer removed - admin uses Mark Correct/Wrong buttons.

        // Emit team selected event
        SessionEmitters.toSession(sessionId, Events.TEAM_SELECTED, {
          teamId: gameState.currentAnsweringTeam,
          startTime: autoSelectStartTime,
        });

        // Emit answering round started to the selected team
        SessionEmitters.toTeam(
          sessionId,
          gameState.currentAnsweringTeam?.toString() || "",
          Events.ANSWERING_ROUND_STARTED,
          {
            questionId: payload.questionId,
            startTime: autoSelectStartTime,
            duration: autoAnswerDuration * 1000,
          },
        );

        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          gameStatus: gameState.gameStatus,
          currentQuestionIndex: gameState.currentQuestionIndex,
          currentAnsweringTeam: gameState.currentAnsweringTeam,
          answeringStartTime: autoSelectStartTime,
        });
        break;

      case "SHOW_HINT":
        if (existingGameState.gameStatus !== GameStatus.ANSWERING) {
          return next(
            new AppError("Can only show hint during answering phase.", 400),
          );
        }

        if (!existingGameState.currentAnsweringTeam) {
          return next(new AppError("No team is currently answering.", 400));
        }

        if (existingGameState.hintRevealed) {
          return next(
            new AppError(
              "Hint has already been revealed for this question.",
              400,
            ),
          );
        }

        const questionForHint = await questionService.fetchCurrentQuestion(
          sessionId,
          existingGameState.currentQuestionIndex,
        );

        if (!questionForHint) {
          return next(new AppError("Current question not found.", 404));
        }

        const hintPenalty = questionForHint.hintPenalty || 0;
        const currentAnsweringTeamId = existingGameState.currentAnsweringTeam;
        if (!currentAnsweringTeamId) {
          return next(new AppError("No team is currently answering.", 400));
        }

        const targetTeamId = typeof currentAnsweringTeamId === "string"
          ? currentAnsweringTeamId
          : (currentAnsweringTeamId as any)._id?.toString() || currentAnsweringTeamId.toString();

        // Deduct penalty points immediately
        await teamService.updateTeamScore(targetTeamId, -hintPenalty);

        existingGameState.hintRevealed = true;
        gameState = await existingGameState.save();

        // Emit GAME_STATE_CHANGED and TEAM_UPDATED socket events
        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          gameStatus: gameState.gameStatus,
          currentQuestionIndex: gameState.currentQuestionIndex,
          currentAnsweringTeam: gameState.currentAnsweringTeam,
          hintRevealed: true,
        });

        SessionEmitters.toSession(sessionId, Events.TEAM_UPDATED, {
          teamId: targetTeamId,
        });

        // Emit team-specific direct HINT_REVEALED socket event
        try {
          SessionEmitters.toTeam(
            sessionId,
            targetTeamId,
            Events.HINT_REVEALED,
            {
              questionId: questionForHint._id,
              hint: questionForHint.hint,
              hintPenalty,
            },
          );
        } catch (socketError) {
          console.error("Error emitting hint-revealed directly to team:", socketError);
        }
        break;

      case "SET_QUESTION_SETTINGS": {
        // Per-session hide/keepBuzzer for one question (never touches the library).
        const targetQuestionId = payload?.questionId;
        if (
          !targetQuestionId ||
          !mongoose.Types.ObjectId.isValid(String(targetQuestionId))
        ) {
          return next(new AppError("Valid questionId is required.", 400));
        }
        if (
          typeof payload?.hideFromUsers !== "boolean" &&
          typeof payload?.keepBuzzer !== "boolean"
        ) {
          return next(
            new AppError("hideFromUsers or keepBuzzer (boolean) is required.", 400),
          );
        }

        await setSessionQuestionFlags(sessionId, targetQuestionId, {
          hideFromUsers: payload.hideFromUsers,
          keepBuzzer: payload.keepBuzzer,
        });
        gameState = existingGameState;
        additionalData.questionId = targetQuestionId;

        // Players re-fetch the current question so hiding/unhiding applies live.
        SessionEmitters.toSession(sessionId, Events.QUESTION_SETTINGS_UPDATED, {
          questionId: String(targetQuestionId),
          hideFromUsers: payload.hideFromUsers,
          keepBuzzer: payload.keepBuzzer,
        });
        break;
      }

      case "SPIN_PASS_SELECT_TEAM": {
        // Admin picks the next team on the wrong team's captain's behalf.
        if (!payload?.teamId) {
          return next(new AppError("teamId is required.", 400));
        }
        try {
          gameState = await passSpinQuestionToTeam(
            sessionId.toString(),
            String(payload.teamId),
            "admin",
          );
        } catch (err) {
          if (err instanceof SpinPassError) {
            return next(new AppError(err.message, err.status));
          }
          throw err;
        }
        break;
      }

      case "SPIN_END_TURN": {
        // Admin stops passing: question returns to the pool, answer stays hidden.
        if (!existingGameState.spinPassPickerTeam) {
          return next(new AppError("No pass is in progress.", 400));
        }
        gameState = await endSpinTurn(sessionId.toString());
        break;
      }

      case "SET_SPIN_HIDE": {
        // Spin wheel: hide choice applied to whichever question the wheel lands on.
        if (typeof payload?.hideFromUsers !== "boolean") {
          return next(new AppError("hideFromUsers (boolean) is required.", 400));
        }
        gameState = await gameStateService.updateGameState(sessionId, {
          spinHideQuestion: payload.hideFromUsers,
        });
        SessionEmitters.toSessionAdmins(sessionId, Events.GAME_STATE_CHANGED, {
          gameStatus: gameState.gameStatus,
          currentQuestionIndex: gameState.currentQuestionIndex,
          currentAnsweringTeam: gameState.currentAnsweringTeam,
          spinHideQuestion: gameState.spinHideQuestion,
        });
        break;
      }

      case "START_SPIN_ROUND": {
        if (!payload?.teamId) {
          return next(
            new AppError("Team ID is required for START_SPIN_ROUND action.", 400),
          );
        }

        if (typeof payload?.hideFromUsers === "boolean") {
          await gameStateService.updateGameState(sessionId, {
            spinHideQuestion: payload.hideFromUsers,
          });
        }
        // Make sure the spinning team has a captain to press "Spin".
        await ensureSessionCaptains(sessionId);
        gameState = await gameStateService.startSpinRound(sessionId, payload.teamId);
        const categoriesData = await gameStateService.getAvailableCategories(sessionId);
        additionalData.availableCategories = categoriesData.categories;
        additionalData.categoryCounts = categoriesData.categoryCounts;
        additionalData.remainingQuestions = categoriesData.remainingQuestions;

        SessionEmitters.toSession(sessionId, Events.SPIN_ROUND_STARTED, {
          teamId: gameState.currentAnsweringTeam,
          availableCategories: categoriesData.categories,
          categoryCounts: categoriesData.categoryCounts,
          remainingQuestions: categoriesData.remainingQuestions,
        });

        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          gameStatus: gameState.gameStatus,
          currentQuestionIndex: gameState.currentQuestionIndex,
          currentAnsweringTeam: gameState.currentAnsweringTeam,
          availableCategories: categoriesData.categories,
          categoryCounts: categoriesData.categoryCounts,
          spinWheelState: gameState.spinWheelState,
        });
        break;
      }

      case "TRIGGER_SPIN_WHEEL": {
        const targetTeamId = payload?.teamId || existingGameState.currentAnsweringTeam;
        if (!targetTeamId) {
          return next(
            new AppError("No team currently assigned to spin.", 400),
          );
        }

        const spinResult = await gameStateService.triggerSpinWheel(
          sessionId,
          targetTeamId,
        );
        gameState = spinResult.gameState;
        additionalData.targetCategory = spinResult.targetCategory;
        additionalData.winningIndex = spinResult.winningIndex;
        additionalData.durationMs = spinResult.durationMs;
        additionalData.availableCategories = spinResult.availableCategories;

        // Broadcast spin event to session (Presenter and all teams)
        SessionEmitters.toSession(sessionId, Events.WHEEL_SPIN_TRIGGERED, {
          teamId: targetTeamId,
          targetCategory: spinResult.targetCategory,
          winningIndex: spinResult.winningIndex,
          durationMs: spinResult.durationMs,
          availableCategories: spinResult.availableCategories,
          startTime: gameState.spinWheelState?.startTime,
        });

        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          gameStatus: gameState.gameStatus,
          currentQuestionIndex: gameState.currentQuestionIndex,
          currentAnsweringTeam: gameState.currentAnsweringTeam,
          spinWheelState: gameState.spinWheelState,
        });

        // When the spinner stops (at durationMs): broadcast WHEEL_LANDED so clients show the category chip
        setTimeout(async () => {
          try {
            await GameState.updateOne(
              { sessionId },
              { $set: { "spinWheelState.isSpinning": false } }
            );
          } catch (err) {
            console.error("Error setting isSpinning to false in trigger spin:", err);
          }
          SessionEmitters.toSession(sessionId, Events.WHEEL_LANDED, {
            targetCategory: spinResult.targetCategory,
            questionIndex: spinResult.gameState.currentQuestionIndex,
          });
        }, spinResult.durationMs);

        // After displaying the landed category chip for 2.5 seconds, transition to ANSWERING to show the question
        setTimeout(async () => {
          try {
            const landedState = await gameStateService.landSpinWheel(sessionId);
            SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
              gameStatus: landedState.gameStatus,
              currentQuestionIndex: landedState.currentQuestionIndex,
              currentAnsweringTeam: landedState.currentAnsweringTeam,
              currentCategory: landedState.currentCategory,
              spinWheelState: landedState.spinWheelState,
            });
          } catch (autoLandError) {
            console.error("Auto land spin wheel error:", autoLandError);
          }
        }, spinResult.durationMs + 2500);

        break;
      }

      case "WHEEL_LANDED": {
        gameState = await gameStateService.landSpinWheel(sessionId);

        SessionEmitters.toSession(sessionId, Events.WHEEL_LANDED, {
          targetCategory: gameState.currentCategory,
          questionIndex: gameState.currentQuestionIndex,
        });

        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          gameStatus: gameState.gameStatus,
          currentQuestionIndex: gameState.currentQuestionIndex,
          currentAnsweringTeam: gameState.currentAnsweringTeam,
          currentCategory: gameState.currentCategory,
          spinWheelState: gameState.spinWheelState,
        });
        break;
      }

      default:
        return next(new AppError(`Invalid action: ${action}`, 400));
    }

    res.status(200).json({
      message: `Action ${action} completed successfully.`,
      data: {
        gameState,
        ...additionalData,
      },
    });
  } catch (error: any) {
    console.error(`Error executing game state action:`, error);

    // Handle specific errors
    if (
      error.message === "Game state not found" ||
      error.message === "Session not found"
    ) {
      return next(new AppError(error.message, 404));
    }
    if (error.message === "No questions configured for this session") {
      return next(new AppError(error.message, 400));
    }
    if (error.message === "No second team available in buzzer queue") {
      return next(new AppError(error.message, 400));
    }
    if (error.message === "No teams in buzzer queue") {
      return next(new AppError(error.message, 400));
    }

    next(new AppError(`Failed to execute action: ${error.message}`, 500));
  }
};

// Keep old methods for backward compatibility (deprecated)
/**
 * @deprecated Use updateGameStateUnified instead
 * Update game status (ADMIN only)
 * PATCH /api/v1/game-state/status
 * Body: { status: "paused" | "buzzer_round" | "answering", currentAnsweringTeam?: teamId }
 * Requires admin authentication
 */
export const updateGameStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = req.user?.sessionId;
    const { status, currentAnsweringTeam } = req.body;

    if (!sessionId) {
      return next(new AppError("Session ID not found in token.", 401));
    }

    // Validate status
    if (!status || !Object.values(GameStatus).includes(status)) {
      return next(
        new AppError(
          `Invalid status. Must be one of: ${Object.values(GameStatus).join(", ")}`,
          400,
        ),
      );
    }

    // Update game state
    const updates: any = { gameStatus: status };

    if (currentAnsweringTeam !== undefined) {
      updates.currentAnsweringTeam = currentAnsweringTeam;
    }

    const gameState = await gameStateService.updateGameState(
      sessionId,
      updates,
    );

    // Emit socket event to all users in the session
    try {
      SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
        gameStatus: gameState.gameStatus,
        currentQuestionIndex: gameState.currentQuestionIndex,
        currentAnsweringTeam: gameState.currentAnsweringTeam,
      });
    } catch (socketError) {
      console.error("Error emitting game state change:", socketError);
      // Continue even if socket emission fails
    }

    res.status(200).json({
      message: "Game status updated successfully.",
      data: {
        gameState,
      },
    });
  } catch (error: any) {
    console.error("Error updating game status:", error);
    if (error.message === "Game state not found") {
      return next(new AppError(error.message, 404));
    }
    next(new AppError("Failed to update game status.", 500));
  }
};

/**
 * Move to next question (ADMIN only)
 * POST /api/v1/game-state/next-question
 * Requires admin authentication
 */
export const moveToNextQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = req.user?.sessionId;

    if (!sessionId) {
      return next(new AppError("Session ID not found in token.", 401));
    }

    const gameState = await gameStateService.moveToNextQuestion(sessionId);

    // Emit socket event to all users in the session
    try {
      SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
        gameStatus: gameState.gameStatus,
        currentQuestionIndex: gameState.currentQuestionIndex,
        currentAnsweringTeam: gameState.currentAnsweringTeam,
      });
    } catch (socketError) {
      console.error("Error emitting game state change:", socketError);
    }

    res.status(200).json({
      message: "Moved to next question successfully.",
      data: {
        gameState,
      },
    });
  } catch (error: any) {
    console.error("Error moving to next question:", error);
    if (error.message === "Game state not found") {
      return next(new AppError(error.message, 404));
    }
    next(new AppError("Failed to move to next question.", 500));
  }
};

/**
 * Validate timer expiration and update state if needed
 * GET /api/v1/game-state/validate-timer
 * Checks if current timer has expired and updates game state accordingly
 * Requires team/admin authentication
 */
export const validateTimerExpiration = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = req.user?.sessionId;

    if (!sessionId) {
      return next(new AppError("Session ID not found in token.", 401));
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return next(new AppError("Session not found.", 404));
    }

    const gameState =
      await gameStateService.fetchGameStateBySessionId(sessionId);
    if (!gameState) {
      return next(new AppError("Game state not found.", 404));
    }

    const currentTime = Date.now();
    let stateChanged = false;
    let action = "";

    // Check buzzer round timer
    if (
      gameState.gameStatus === GameStatus.BUZZER_ROUND &&
      gameState.buzzerRoundStartTime
    ) {
      const elapsedTime = currentTime - gameState.buzzerRoundStartTime;
      const timeLimit = (session.questionTimeLimit || 30) * 1000;

      if (elapsedTime >= timeLimit) {
        // Buzzer round expired - transition to answering or idle
        console.log("⏰ Buzzer round timer expired - triggering transition");

        // Cancel existing timers first
        timerManager.cancelTimer(`buzzer-${sessionId.toString()}`);

        // Get current question to pass to transition
        const currentQuestion = await questionService.fetchCurrentQuestion(
          sessionId,
          gameState.currentQuestionIndex,
        );

        if (!currentQuestion) {
          return next(new AppError("Current question not found.", 404));
        }

        // Transition to answering (will auto-select fastest team)
        await gameStateService.transitionToAnswering(
          sessionId,
          currentQuestion._id as Types.ObjectId,
        );

        stateChanged = true;
        action = "BUZZER_EXPIRED_TO_ANSWERING";
      }
    }

    // Check answering round timer
    if (
      gameState.gameStatus === GameStatus.ANSWERING &&
      gameState.answeringRoundStartTime &&
      gameState.currentAnsweringTeam
    ) {
      const elapsedTime = currentTime - gameState.answeringRoundStartTime;
      const timeLimit = (session.answerTimeLimit || 60) * 1000;

      if (elapsedTime >= timeLimit) {
        // Answering round expired - transition to idle
        console.log("⏰ Answering round timer expired - triggering transition");

        const teamId =
          typeof gameState.currentAnsweringTeam === "string"
            ? gameState.currentAnsweringTeam
            : (gameState.currentAnsweringTeam as any)?._id?.toString() ||
              gameState.currentAnsweringTeam.toString();

        // Cancel existing timers first
        timerManager.cancelTimer(`answering-${sessionId.toString()}-${teamId}`);

        // Transition to idle
        await gameStateService.transitionToIdle(sessionId);

        stateChanged = true;
        action = "ANSWERING_EXPIRED_TO_IDLE";
      }
    }

    // Fetch updated game state if changed
    const finalGameState = stateChanged
      ? await gameStateService.fetchGameStateBySessionId(sessionId)
      : gameState;

    res.status(200).json({
      message: stateChanged
        ? "Timer expired - game state updated"
        : "Timer validation successful - no update needed",
      data: {
        gameState: finalGameState,
        stateChanged,
        action,
      },
    });
  } catch (error: any) {
    console.error("Error validating timer expiration:", error);
    next(new AppError("Failed to validate timer.", 500));
  }
};

/**
 * Mark answer as correct or wrong (ADMIN only)
 * POST /api/v1/game-state/mark-answer
 * Body: { isCorrect: boolean }
 * Requires admin authentication
 *
 * This is used in the verbal answer flow where users speak their answers
 * and admin manually marks them as correct/wrong.
 */
export const markAnswer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = req.user?.sessionId;
    const { isCorrect } = req.body;

    if (!sessionId) {
      return next(new AppError("Session ID not found in token.", 401));
    }

    if (typeof isCorrect !== "boolean") {
      return next(new AppError("isCorrect must be a boolean value.", 400));
    }

    // Fetch current game state
    const gameState =
      await gameStateService.fetchGameStateBySessionId(sessionId);
    if (!gameState) {
      return next(new AppError("Game state not found.", 404));
    }

    // Must be in ANSWERING state to mark an answer
    if (gameState.gameStatus !== GameStatus.ANSWERING) {
      return next(
        new AppError("Can only mark answers during the answering phase.", 400),
      );
    }

    // Must have a current answering team
    if (!gameState.currentAnsweringTeam) {
      return next(new AppError("No team is currently answering.", 400));
    }

    const currentTeam = gameState.currentAnsweringTeam;
    const teamId =
      typeof currentTeam === "string"
        ? currentTeam
        : (currentTeam as any)?._id?.toString() || currentTeam.toString();

    // Cancel the answering timer since admin has made a decision
    timerManager.cancelTimer(
      `answering-${sessionId.toString()}-${teamId.toString()}`,
    );

    let pointsAwarded = 0;
    const currentQuestion = await questionService.fetchCurrentQuestion(
      sessionId,
      gameState.currentQuestionIndex,
    );

    if (!currentQuestion) {
      return next(new AppError("Current question not found.", 404));
    }

    // Save the response to database for dashboard tracking
    await questionService.createBuzzerResponse(
      currentQuestion._id as Types.ObjectId,
      teamId,
      isCorrect,
      isCorrect
        ? getCorrectPoints(currentQuestion)
        : -getWrongPenalty(currentQuestion),
    );

    let teamName = "A team";
    try {
      const answeringTeamDoc = await teamService.fetchTeamById(teamId);
      if (answeringTeamDoc?.teamName) {
        teamName = answeringTeamDoc.teamName;
      }
    } catch (e) {
      // ignore
    }

    if (isCorrect) {
      pointsAwarded = getCorrectPoints(currentQuestion);
      // Update team score
      await teamService.updateTeamScore(teamId, pointsAwarded);

      const session = await Session.findById(sessionId);
      let categoryExhausted = false;
      let gameEnded = false;
      let finalLeaderboard: any = null;

      if (session?.gameMode === "SPIN_WHEEL") {
        await gameStateService.markQuestionCompleted(
          sessionId,
          currentQuestion._id,
        );
        const remainingData =
          await gameStateService.getAvailableCategories(sessionId);

        const currentCat = gameState.currentCategory;
        if (currentCat && !remainingData.categories.includes(currentCat)) {
          categoryExhausted = true;
          SessionEmitters.toSession(sessionId, Events.CATEGORY_EXHAUSTED, {
            category: currentCat,
            remainingCategories: remainingData.categories,
          });
        }

        if (remainingData.remainingQuestions === 0) {
          gameEnded = true;
          finalLeaderboard =
            await teamService.fetchOverallLeaderboard(sessionId);
          SessionEmitters.toSession(sessionId, Events.GAME_ENDED, {
            finalLeaderboard,
          });
        }
      }

      // Emit ANSWER_MARKED_CORRECT to the session
      SessionEmitters.toSession(sessionId, Events.ANSWER_MARKED_CORRECT, {
        teamId,
        teamName,
        isCorrect: true,
        pointsAwarded,
        timestamp: Date.now(),
      });

      // Transition to IDLE state
      const idleGameState = await gameStateService.transitionToIdle(sessionId);

      // Emit game state change
      SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
        gameStatus: idleGameState.gameStatus,
        currentQuestionIndex: idleGameState.currentQuestionIndex,
        currentAnsweringTeam: idleGameState.currentAnsweringTeam,
        idleStartTime: idleGameState.idleStartTime,
        gameEnded,
      });

      res.status(200).json({
        message: "Answer marked as correct. Score updated.",
        data: {
          gameState: idleGameState,
          isCorrect: true,
          pointsAwarded,
          teamId,
          teamName,
          gameEnded,
          categoryExhausted,
          finalLeaderboard,
        },
      });
    } else {
      // Deduct the wrong-answer penalty before notifying clients,
      // so leaderboard refetches triggered by the event see the new score.
      const wrongPenalty = getWrongPenalty(currentQuestion);
      if (wrongPenalty > 0) {
        await teamService.updateTeamScore(teamId, -wrongPenalty);
      }
      pointsAwarded = -wrongPenalty;

      // Emit ANSWER_MARKED_WRONG to the session
      SessionEmitters.toSession(sessionId, Events.ANSWER_MARKED_WRONG, {
        teamId,
        teamName,
        isCorrect: false,
        pointsAwarded,
        timestamp: Date.now(),
      });

      const session = await Session.findById(sessionId);
      if (session?.gameMode === "SPIN_WHEEL") {
        // Spin Wheel: the wrong team's captain picks the next team for the SAME question
        // (each team gets one attempt). If no team is left, the turn ends and the
        // question returns to the pool with its answer withheld.
        const { gameState: spinState, passing } = await handleSpinWrongAnswer(
          sessionId.toString(),
          teamId.toString(),
        );

        return res.status(200).json({
          message: passing
            ? "Answer marked as wrong. The team's captain will choose the next team."
            : "Answer marked as wrong. All teams have tried; question returns to the pool.",
          data: {
            gameState: spinState,
            isCorrect: false,
            pointsAwarded,
            teamId,
            spinPassPending: passing,
          },
        });
      }

      if (currentQuestion?.keepBuzzer === false) {
        const updatedState = await gameStateService.updateGameState(sessionId, {
          gameStatus: GameStatus.IDLE,
          currentAnsweringTeam: null,
          awaitingTeamSelection: true,
        });

        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          gameStatus: updatedState.gameStatus,
          currentQuestionIndex: updatedState.currentQuestionIndex,
          currentAnsweringTeam: updatedState.currentAnsweringTeam,
          keepBuzzer: false,
          isNoBuzzerQuestion: true,
          awaitingTeamSelection: true,
        });

        res.status(200).json({
          message:
            "Answer marked as wrong. Select another team for this no-buzzer question.",
          data: {
            gameState: updatedState,
            isCorrect: false,
            pointsAwarded,
            teamId,
          },
        });
        return;
      }

      res.status(200).json({
        message:
          "Answer marked as wrong. Admin can pass to second team or move to next question.",
        data: {
          gameState,
          isCorrect: false,
          pointsAwarded,
          teamId,
        },
      });
    }
  } catch (error: any) {
    console.error("Error marking answer:", error);
    if (error.message === "Game state not found") {
      return next(new AppError(error.message, 404));
    }
    if (error.message === "Team not found") {
      return next(new AppError(error.message, 404));
    }
    next(new AppError("Failed to mark answer.", 500));
  }
};

/**
 * Fetch available categories for Spin Wheel mode
 * GET /api/v1/game-state/categories
 */
export const fetchAvailableCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = req.user?.sessionId;
    if (!sessionId) {
      return next(new AppError("Session ID not found in token.", 401));
    }

    const { categories, categoryCounts, remainingQuestions } =
      await gameStateService.getAvailableCategories(sessionId);
    res.status(200).json({
      message: "Available categories fetched successfully.",
      // Never send the question documents themselves: players call this endpoint
      // and those include answers.
      data: { categories, categoryCounts, remainingQuestions },
    });
  } catch (error: any) {
    console.error("Error fetching available categories:", error);
    next(new AppError("Failed to fetch available categories.", 500));
  }
};
