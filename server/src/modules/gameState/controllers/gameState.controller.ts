import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import AppError from "../../../utils/appError";
import GameStateService from "../services/gameState.service";
import QuestionService from "../../questions/services/question.service";
import TeamService from "../../teams/services/team.service";
import BuzzerQueueService from "../../buzzerQueue/services/buzzerQueue.service";
import { GameStatus } from "../types/enums";
import { SessionEmitters } from "../../../services/socket/sessionEmitters";
import { Events } from "../../../services/socket/enums/Events";
import { timerManager } from "../../../services/timerManager";
import { Session } from "../../session/models/session.model";
import { Question } from "../../questions/models/question.model";
import { gamistanLiveState } from "../services/gamistanLiveState";

const gameStateService = new GameStateService();
const questionService = new QuestionService();
const teamService = new TeamService();
const buzzerQueueService = new BuzzerQueueService();

export const ALLOWED_SPIN_WHEEL_CATEGORIES = [
  "Who Am I?",
  "English Vinglish",
  "Guess The Song",
  "Rumble Jumble : Guess The Movie and the song",
  "Prop Round : Guess The Movie",
];

const getCategoryKeywords = (cat: string): string[] => {
  const norm = (cat || "").toLowerCase();
  if (norm.includes("who am i")) return ["who am i", "whoami", "who_am_i"];
  if (norm.includes("song")) return ["song", "guess the song", "guessthesong"];
  if (norm.includes("rumble") || norm.includes("jumble"))
    return ["rumble", "jumble", "rumble jumble", "rumblejumble"];
  if (norm.includes("prop")) return ["prop", "prop round", "propround"];
  if (norm.includes("english") || norm.includes("vinglish"))
    return ["english", "vinglish", "english vinglish"];
  return [norm.replace(/[^a-z0-9]/g, "")];
};

const isQuestionMatchingCategory = (q: any, targetCat: string): boolean => {
  if (!q) return false;
  const keywords = getCategoryKeywords(targetCat);

  const fieldsToSearch = [
    q.folder || "",
    q.category || "",
    q.questionText || "",
    q.questionContent?.text || "",
    q.questionImage || "",
    q.quetionVideo || "",
    JSON.stringify(q.questionAssets || []),
  ].map((s) => (s || "").toLowerCase());

  const combinedText = fieldsToSearch.join(" ");
  return keywords.some((kw) => kw && combinedText.includes(kw));
};

const selectUnusedQuestionForCategory = async (
  sessionId: string,
  winningCategory: string,
  usedQuestionIds: string[],
) => {
  const sessionData = await Session.findById(sessionId).populate("questions");
  if (!sessionData) return null;

  const sessionQuestions = (sessionData.questions || []) as any[];

  // 1. Search matching unused questions in session questions
  const matchingSessionQuestions = sessionQuestions.filter((q: any) => {
    if (!q || !q._id) return false;
    const matches = isQuestionMatchingCategory(q, winningCategory);
    const isUnused = !usedQuestionIds.includes(q._id.toString());
    return matches && isUnused;
  });

  if (matchingSessionQuestions.length > 0) {
    const selectedQuestion = matchingSessionQuestions[0];
    const qIndex = sessionQuestions.findIndex(
      (q: any) => q._id.toString() === selectedQuestion._id.toString(),
    );
    return {
      question: selectedQuestion,
      questionIndex: qIndex >= 0 ? qIndex : 0,
      questionId: selectedQuestion._id.toString(),
    };
  }

  // 2. Fallback: search global Question collection if not currently attached to session
  const globalMatchingQuestions = await Question.find({
    _id: { $nin: usedQuestionIds },
  });

  const matchingGlobal = globalMatchingQuestions.filter((q: any) =>
    isQuestionMatchingCategory(q, winningCategory),
  );

  if (matchingGlobal.length > 0) {
    const selectedQuestion = matchingGlobal[0];
    sessionData.questions.push(selectedQuestion._id as any);
    await sessionData.save();

    const qIndex = sessionData.questions.length - 1;
    return {
      question: selectedQuestion,
      questionIndex: qIndex,
      questionId: selectedQuestion._id.toString(),
    };
  }

  // 3. Fallback: if no question matched by keyword, pick any unused question from session so game can proceed
  const unusedSessionQuestions = sessionQuestions.filter(
    (q: any) => q && q._id && !usedQuestionIds.includes(q._id.toString()),
  );

  if (unusedSessionQuestions.length > 0) {
    const selectedQuestion = unusedSessionQuestions[0];
    const qIndex = sessionQuestions.findIndex(
      (q: any) => q._id.toString() === selectedQuestion._id.toString(),
    );
    return {
      question: selectedQuestion,
      questionIndex: qIndex >= 0 ? qIndex : 0,
      questionId: selectedQuestion._id.toString(),
    };
  }

  return null;
};

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
    const sessionId =
      req.user?.sessionId ||
      (req.headers["x-session-id"] as string) ||
      (req.query?.sessionId as string);

    if (!sessionId) {
      return next(new AppError("Session ID is required.", 401));
    }

    let gameState = await gameStateService.fetchGameStateBySessionId(sessionId);

    // If game state doesn't exist, create one
    if (!gameState) {
      gameState = await gameStateService.createGameState(sessionId);
    }

    const liveState = await gamistanLiveState.getState(sessionId, {
      isSpinWheelEnabled: gameState.isSpinWheelEnabled,
      roundType: gameState.roundType,
      selectedCategory: gameState.selectedCategory,
      availableCategories: gameState.availableCategories,
      spinPermissionGranted: gameState.spinPermissionGranted,
    });

    // If MongoDB has spin mode enabled but liveState defaulted to false, sync liveState
    if (gameState.isSpinWheelEnabled && !liveState.isSpinWheelEnabled) {
      liveState.isSpinWheelEnabled = true;
      liveState.roundType = "SPIN_WHEEL";
      await gamistanLiveState.updateState(sessionId, {
        isSpinWheelEnabled: true,
        roundType: "SPIN_WHEEL",
      });
    }

    const mergedState = {
      ...gameState.toObject(),
      ...liveState,
    };

    res.status(200).json({
      message: "Game state fetched successfully.",
      data: {
        gameState: mergedState,
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

      case "RESUME": {
        const curLive = await gamistanLiveState.getState(sessionId);
        const isSpinMode = curLive.roundType === "SPIN_WHEEL" || curLive.isSpinWheelEnabled;

        if (isSpinMode) {
          gameState = await gameStateService.updateGameState(sessionId, {
            gameStatus: existingGameState.currentAnsweringTeam ? GameStatus.ANSWERING : GameStatus.IDLE,
          });

          SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
            gameStatus: gameState.gameStatus,
            currentQuestionIndex: gameState.currentQuestionIndex,
            currentAnsweringTeam: gameState.currentAnsweringTeam,
            isSpinWheelEnabled: true,
            roundType: "SPIN_WHEEL",
            spinPermissionGranted: curLive.spinPermissionGranted,
            canSpinTeam: curLive.canSpinTeam,
            selectedCategory: curLive.selectedCategory,
          });
          break;
        }

        // Check if current question has keepBuzzer: false
        let isNoBuzzer = false;
        try {
          const currentQuestion = await questionService.fetchCurrentQuestion(
            sessionId,
            existingGameState.currentQuestionIndex,
          );
          if (currentQuestion && currentQuestion.keepBuzzer === false) {
            isNoBuzzer = true;
          }
        } catch (_) {}

        if (isNoBuzzer) {
          gameState = await gameStateService.updateGameState(sessionId, {
            gameStatus: existingGameState.currentAnsweringTeam ? GameStatus.ANSWERING : GameStatus.IDLE,
          });

          SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
            gameStatus: gameState.gameStatus,
            currentQuestionIndex: gameState.currentQuestionIndex,
            currentAnsweringTeam: gameState.currentAnsweringTeam,
            keepBuzzer: false,
            isNoBuzzerQuestion: true,
          });
          break;
        }

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
      }

      case "NEXT_QUESTION": {
        // Cancel any active timers for this session
        timerManager.cancelSessionTimers(sessionId);

        const session = await Session.findById(sessionId);
        if (!session) {
          return next(new AppError("Session not found.", 404));
        }

        const curLive = await gamistanLiveState.getState(sessionId);
        const isSpinMode = curLive.roundType === "SPIN_WHEEL" || curLive.isSpinWheelEnabled;

        if (!isSpinMode && (!session.questions || session.questions.length === 0)) {
          return next(
            new AppError(
              "Cannot start game. Please add questions to the session first.",
              400,
            ),
          );
        }

        if (existingGameState.currentQuestionIndex < 0) {
          const joinedTeams = await teamService.fetchTeamsBySession(sessionId);
          const joinedTeamCount = joinedTeams.length;

          if (session && session.numberOfTeams !== joinedTeamCount) {
            session.numberOfTeams = joinedTeamCount;
            await session.save();
          }
        }

        if (isSpinMode) {
          await gamistanLiveState.updateState(sessionId, {
            selectedCategory: "",
            spinPermissionGranted: false,
            canSpinTeam: "",
          });

          const nextIndex =
            existingGameState.currentQuestionIndex < 0
              ? 0
              : existingGameState.currentQuestionIndex;

          gameState = await gameStateService.updateGameState(sessionId, {
            gameStatus: GameStatus.IDLE,
            currentQuestionIndex: nextIndex,
            currentAnsweringTeam: null,
          });

          SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
            gameStatus: GameStatus.IDLE,
            currentQuestionIndex: gameState.currentQuestionIndex,
            currentAnsweringTeam: null,
            selectedCategory: "",
            spinPermissionGranted: false,
            isSpinWheelEnabled: true,
            roundType: "SPIN_WHEEL",
          });

          break;
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
            });

            // Mark as no-buzzer question so frontend knows to show question, not answer
            gameState.isNoBuzzerQuestion = true;
            gameState.teamsWhoAnsweredThisQuestion = [];
            await gameState.save();

            SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
              gameStatus: gameState.gameStatus,
              currentQuestionIndex: gameState.currentQuestionIndex,
              currentAnsweringTeam: gameState.currentAnsweringTeam,
              keepBuzzer: false,
              isNoBuzzerQuestion: true,
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
          });
        }
        break;
      }

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
        });

        SessionEmitters.toSession(sessionId, Events.SHOW_ANSWER, {
          currentQuestionIndex: gameState.currentQuestionIndex,
          timestamp: Date.now(),
        });

        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          gameStatus: gameState.gameStatus,
          currentQuestionIndex: gameState.currentQuestionIndex,
          currentAnsweringTeam: gameState.currentAnsweringTeam,
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

      case "TOGGLE_LEADERBOARD":
      case "SHOW_LEADERBOARD":
        const isVisible = typeof payload?.isVisible === "boolean"
          ? payload.isVisible
          : !existingGameState.isLeaderboardVisible;

        existingGameState.isLeaderboardVisible = isVisible;
        gameState = await existingGameState.save();

        SessionEmitters.toSession(sessionId, Events.SHOW_LEADERBOARD, {
          isLeaderboardVisible: gameState.isLeaderboardVisible,
        });

        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          gameStatus: gameState.gameStatus,
          currentQuestionIndex: gameState.currentQuestionIndex,
          currentAnsweringTeam: gameState.currentAnsweringTeam,
          isLeaderboardVisible: gameState.isLeaderboardVisible,
        });
        break;

      case "TOGGLE_SPIN_WHEEL": {
        const curLive = await gamistanLiveState.getState(sessionId);
        const isSpinEnabled = typeof payload?.isEnabled === "boolean"
          ? payload.isEnabled
          : !curLive.isSpinWheelEnabled;

        const live = await gamistanLiveState.updateState(sessionId, {
          isSpinWheelEnabled: isSpinEnabled,
        });

        let currentDoc = existingGameState;
        currentDoc.isSpinWheelEnabled = isSpinEnabled;
        currentDoc.roundType = isSpinEnabled ? "SPIN_WHEEL" : "BUZZER";
        if (isSpinEnabled && currentDoc.gameStatus === GameStatus.PAUSED) {
          currentDoc.gameStatus = GameStatus.IDLE;
        }
        currentDoc = await currentDoc.save();

        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          isSpinWheelEnabled: live.isSpinWheelEnabled,
          roundType: live.roundType,
          gameStatus: currentDoc.gameStatus,
        });
        break;
      }

      case "SET_AVAILABLE_CATEGORIES": {
        if (Array.isArray(payload?.categories)) {
          const live = await gamistanLiveState.updateState(sessionId, {
            availableCategories: payload.categories,
          });

          existingGameState.availableCategories = payload.categories;
          await existingGameState.save();

          SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
            availableCategories: live.availableCategories,
          });
        }
        break;
      }

      case "GRANT_SPIN_PERMISSION": {
        let currentDoc = existingGameState;
        if (currentDoc.gameStatus === GameStatus.PAUSED) {
          currentDoc.gameStatus = GameStatus.IDLE;
        }

        const targetTeamId = payload?.teamId || payload?.targetTeamId || payload?.teamName || "";
        if (targetTeamId) {
          currentDoc.currentAnsweringTeam = targetTeamId as any;
        }
        currentDoc.spinPermissionGranted = true;
        currentDoc.selectedCategory = "";
        currentDoc = await currentDoc.save();

        const live = await gamistanLiveState.updateState(sessionId, {
          spinPermissionGranted: true,
          canSpinTeam: targetTeamId,
          selectedCategory: "",
        });

        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          spinPermissionGranted: true,
          canSpinTeam: live.canSpinTeam,
          currentAnsweringTeam: currentDoc.currentAnsweringTeam,
          selectedCategory: "",
          gameStatus: currentDoc.gameStatus,
        });
        break;
      }

      case "SPIN_WHEEL_REQUEST": {
        const curLive = await gamistanLiveState.getState(sessionId);
        if (!curLive.isSpinWheelEnabled) {
          return next(new AppError("Spin Wheel is not currently enabled for this session.", 400));
        }

        const validCategories = (curLive.availableCategories || []).filter((c: string) =>
          ALLOWED_SPIN_WHEEL_CATEGORIES.includes(c)
        );
        const categoriesList = validCategories.length > 0
          ? validCategories
          : ALLOWED_SPIN_WHEEL_CATEGORIES;

        const spinIndex = Math.floor(Math.random() * categoriesList.length);
        const winCategory = categoriesList[spinIndex];

        const questionResult = await selectUnusedQuestionForCategory(
          sessionId,
          winCategory,
          curLive.usedQuestionIds || [],
        );

        if (!questionResult) {
          return next(new AppError(`No unused questions available in category "${winCategory}".`, 400));
        }

        let existingGameStateDoc = await gameStateService.fetchGameStateBySessionId(sessionId);
        const answeringStartTime = Date.now();
        const live = await gamistanLiveState.updateState(sessionId, {
          selectedCategory: winCategory,
          spinPermissionGranted: false,
          isQuestionVisible: true,
        });
        await gamistanLiveState.addUsedQuestionId(sessionId, questionResult.questionId);

        const targetTeamId = live.canSpinTeam || existingGameStateDoc?.currentAnsweringTeam;
        if (existingGameStateDoc) {
          existingGameStateDoc.currentQuestionIndex = questionResult.questionIndex;
          existingGameStateDoc.gameStatus = GameStatus.ANSWERING;
          existingGameStateDoc.currentAnsweringTeam = targetTeamId ? (targetTeamId as any) : undefined;
          existingGameStateDoc.answeringRoundStartTime = answeringStartTime;
          existingGameStateDoc.isNoBuzzerQuestion = true;
          existingGameStateDoc.selectedCategory = winCategory;
          existingGameStateDoc.spinPermissionGranted = false;
          existingGameStateDoc.isSpinWheelEnabled = true;
          existingGameStateDoc.roundType = "SPIN_WHEEL";
          gameState = await existingGameStateDoc.save();
        }

        const session = await Session.findById(sessionId);
        const answerDuration = session?.answerTimeLimit || 60;

        additionalData.category = winCategory;
        additionalData.questionIndex = questionResult.questionIndex;
        additionalData.questionId = questionResult.questionId;

        SessionEmitters.toSession(sessionId, Events.SPIN_WHEEL_RESULT, {
          category: winCategory,
          questionId: questionResult.questionId,
          questionIndex: questionResult.questionIndex,
          timestamp: Date.now(),
        });

        if (targetTeamId) {
          SessionEmitters.toTeam(
            sessionId,
            targetTeamId.toString(),
            Events.ANSWERING_ROUND_STARTED,
            {
              questionId: questionResult.questionId,
              startTime: answeringStartTime,
              duration: answerDuration * 1000,
            },
          );
        }

        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          selectedCategory: winCategory,
          spinPermissionGranted: false,
          currentQuestionIndex: questionResult.questionIndex,
          gameStatus: GameStatus.ANSWERING,
          currentAnsweringTeam: targetTeamId,
          answeringStartTime,
          isQuestionVisible: true,
          isNoBuzzerQuestion: true,
        });
        break;
      }

      case "SHOW_QUESTION_TO_PARTICIPANTS": {
        let live = await gamistanLiveState.updateState(sessionId, { isQuestionVisible: true });
        if (payload?.questionId) {
          live = await gamistanLiveState.addUsedQuestionId(sessionId, payload.questionId.toString());
        }

        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          isQuestionVisible: true,
          usedQuestionIds: live.usedQuestionIds,
        });
        break;
      }

      default:
        return next(new AppError(`Invalid action: ${action}`, 400));
    }

    const currentDoc = gameState || existingGameState;
    const finalLiveState = await gamistanLiveState.getState(sessionId);
    const responseGameState = {
      ...currentDoc.toObject(),
      ...finalLiveState,
    };

    res.status(200).json({
      message: `Action ${action} completed successfully.`,
      data: {
        gameState: responseGameState,
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

    const session = await Session.findById(sessionId);
    if (!session || !session.questions || session.questions.length === 0) {
      return next(
        new AppError(
          "Cannot start or advance game. No questions have been added to this session.",
          400,
        ),
      );
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
            : gameState.currentAnsweringTeam._id.toString();

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
      typeof currentTeam === "string" ? currentTeam : currentTeam._id;

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
    );

    if (isCorrect) {
      pointsAwarded = currentQuestion.score || 100;
      // Update team score
      await teamService.updateTeamScore(teamId, pointsAwarded);

      // Emit ANSWER_MARKED_CORRECT to the session
      SessionEmitters.toSession(sessionId.toString(), Events.ANSWER_MARKED_CORRECT, {
        teamId: teamId.toString(),
        isCorrect: true,
        pointsAwarded,
        timestamp: Date.now(),
      });

      // Transition to IDLE state
      const idleGameState = await gameStateService.transitionToIdle(sessionId);

      // Emit game state change
      SessionEmitters.toSession(sessionId.toString(), Events.GAME_STATE_CHANGED, {
        gameStatus: idleGameState.gameStatus,
        currentQuestionIndex: idleGameState.currentQuestionIndex,
        currentAnsweringTeam: idleGameState.currentAnsweringTeam,
        idleStartTime: idleGameState.idleStartTime,
      });

      // Emit team updated event to refresh leaderboards/scores in real-time
      SessionEmitters.toSession(sessionId.toString(), Events.TEAM_UPDATED, {
        teamId: teamId.toString(),
        pointsAwarded,
      });

      res.status(200).json({
        message: "Answer marked as correct. Score updated.",
        data: {
          gameState: idleGameState,
          isCorrect: true,
          pointsAwarded,
          teamId,
        },
      });
    } else {
      const liveState = await gamistanLiveState.getState(sessionId);
      const isSpinMode = liveState.roundType === "SPIN_WHEEL" || liveState.isSpinWheelEnabled;

      let wrongPenalty = 0;
      if (!isSpinMode) {
        wrongPenalty = req.body.penalty !== undefined
          ? Math.abs(Number(req.body.penalty))
          : (req.body.negativePoints !== undefined
            ? Math.abs(Number(req.body.negativePoints))
            : (req.body.scorePenalty !== undefined ? Math.abs(Number(req.body.scorePenalty)) : 0));
      }

      if (wrongPenalty > 0) {
        pointsAwarded = -wrongPenalty;
        await teamService.updateTeamScore(teamId, pointsAwarded);
      }

      // Emit ANSWER_MARKED_WRONG to the session
      SessionEmitters.toSession(sessionId.toString(), Events.ANSWER_MARKED_WRONG, {
        teamId: teamId.toString(),
        isCorrect: false,
        pointsAwarded,
        timestamp: Date.now(),
      });

      if (pointsAwarded !== 0) {
        SessionEmitters.toSession(sessionId.toString(), Events.TEAM_UPDATED, {
          teamId: teamId.toString(),
          pointsAwarded,
        });
      }

      if (currentQuestion?.keepBuzzer === false || isSpinMode) {
        const updatedState = await gameStateService.updateGameState(sessionId, {
          gameStatus: GameStatus.IDLE,
          currentAnsweringTeam: null,
        });

        SessionEmitters.toSession(sessionId.toString(), Events.GAME_STATE_CHANGED, {
          gameStatus: updatedState.gameStatus,
          currentQuestionIndex: updatedState.currentQuestionIndex,
          currentAnsweringTeam: updatedState.currentAnsweringTeam,
          isSpinWheelEnabled: isSpinMode,
          keepBuzzer: !isSpinMode ? false : undefined,
        });

        res.status(200).json({
          message: isSpinMode
            ? "Answer marked as wrong (0 penalty). Admin can move to next spin turn."
            : "Answer marked as wrong. Select another team for this no-buzzer question.",
          data: {
            gameState: updatedState,
            isCorrect: false,
            pointsAwarded,
            teamId,
          },
        });
        return;
      }

      // For standard buzzer questions:
      // Clear current answering team in database so user side transitions back from answering screen
      const updatedState = await gameStateService.updateGameState(sessionId, {
        currentAnsweringTeam: null,
      });

      SessionEmitters.toSession(sessionId.toString(), Events.GAME_STATE_CHANGED, {
        gameStatus: updatedState.gameStatus,
        currentQuestionIndex: updatedState.currentQuestionIndex,
        currentAnsweringTeam: null,
        lastAnswerWasWrong: true,
      });

      res.status(200).json({
        message:
          "Answer marked as wrong. Admin can pass to second team or move to next question.",
        data: {
          gameState: updatedState,
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
 * Perform spin wheel request (Participant Buzzer Person or Admin)
 * POST /api/v1/game-state/spin-wheel
 * Server validates permissions, selects winning category, updates game state and broadcasts result.
 */
export const spinWheelParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = req.user?.sessionId;
    const user = req.user;

    if (!sessionId) {
      return next(new AppError("Session ID not found in token.", 401));
    }

    const liveState = await gamistanLiveState.getState(sessionId);
    if (!liveState.isSpinWheelEnabled && liveState.roundType !== "SPIN_WHEEL") {
      return next(new AppError("Spin Wheel is not currently enabled.", 400));
    }

    const isAdmin = (user as any)?.role === "ADMIN";

    // Spin permission check for non-admin
    if (!isAdmin && !liveState.spinPermissionGranted) {
      return next(new AppError("Spin permission has not been granted by the operator.", 403));
    }

    // Role validation: Only BUZZER_PERSON or ADMIN can spin
    const isBuzzerPerson =
      (user as any)?.role === "BUZZER_PERSON" ||
      (user as any)?.memberRole === "BUZZER_PERSON" ||
      (user as any)?.playerRole === "BUZZER_PERSON";
    if (!isAdmin && !isBuzzerPerson) {
      return next(
        new AppError(
          "Only the team's designated Buzzer Person is permitted to spin the wheel.",
          403,
        ),
      );
    }

    // Team turn validation if canSpinTeam is specified for non-admin
    if (!isAdmin && liveState.canSpinTeam) {
      const userTeamId = user?.id || (user as any)?.teamId;
      const userTeamName = (user as any)?.teamName;
      if (
        (!userTeamId || liveState.canSpinTeam.toString() !== userTeamId.toString()) &&
        (!userTeamName || liveState.canSpinTeam.toString() !== userTeamName.toString())
      ) {
        return next(new AppError("It is not your team's turn to spin the wheel.", 403));
      }
    }

    const validCategories = (liveState.availableCategories || []).filter((c: string) =>
      ALLOWED_SPIN_WHEEL_CATEGORIES.includes(c)
    );
    const categoriesList = validCategories.length > 0
      ? validCategories
      : ALLOWED_SPIN_WHEEL_CATEGORIES;

    const randomIndex = Math.floor(Math.random() * categoriesList.length);
    const winningCategory = categoriesList[randomIndex];

    const questionResult = await selectUnusedQuestionForCategory(
      sessionId,
      winningCategory,
      liveState.usedQuestionIds || [],
    );

    if (!questionResult) {
      return next(new AppError(`No unused questions available in category "${winningCategory}".`, 400));
    }

    const userTeamId = user?.id || (user as any)?.teamId;
    const spinningTeamId = liveState.canSpinTeam || userTeamId;

    let gameStateDoc = await gameStateService.fetchGameStateBySessionId(sessionId);
    const answeringStartTime = Date.now();
    if (gameStateDoc) {
      gameStateDoc.currentQuestionIndex = questionResult.questionIndex;
      gameStateDoc.gameStatus = GameStatus.ANSWERING;
      gameStateDoc.currentAnsweringTeam = spinningTeamId ? (spinningTeamId as any) : undefined;
      gameStateDoc.answeringRoundStartTime = answeringStartTime;
      gameStateDoc.isNoBuzzerQuestion = true;
      await gameStateDoc.save();
    }

    const updatedLive = await gamistanLiveState.updateState(sessionId, {
      selectedCategory: winningCategory,
      spinPermissionGranted: false,
      isQuestionVisible: true,
    });
    await gamistanLiveState.addUsedQuestionId(sessionId, questionResult.questionId);

    const session = await Session.findById(sessionId);
    const answerDuration = session?.answerTimeLimit || 60;

    const mergedState = {
      ...(gameStateDoc ? gameStateDoc.toObject() : {}),
      ...updatedLive,
      currentQuestionIndex: questionResult.questionIndex,
      gameStatus: GameStatus.ANSWERING,
      currentAnsweringTeam: spinningTeamId,
      answeringStartTime,
      isNoBuzzerQuestion: true,
    };

    SessionEmitters.toSession(sessionId, Events.SPIN_WHEEL_RESULT, {
      category: winningCategory,
      questionId: questionResult.questionId,
      questionIndex: questionResult.questionIndex,
      timestamp: Date.now(),
    });

    if (spinningTeamId) {
      SessionEmitters.toTeam(
        sessionId,
        spinningTeamId.toString(),
        Events.ANSWERING_ROUND_STARTED,
        {
          questionId: questionResult.questionId,
          startTime: answeringStartTime,
          duration: answerDuration * 1000,
        },
      );
    }

    SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, mergedState);

    res.status(200).json({
      message: "Spin completed successfully. Question assigned automatically.",
      data: {
        category: winningCategory,
        questionIndex: questionResult.questionIndex,
        questionId: questionResult.questionId,
        gameState: mergedState,
      },
    });
  } catch (error: any) {
    console.error("Error executing spin wheel:", error);
    next(new AppError("Failed to execute spin wheel.", 500));
  }
};

