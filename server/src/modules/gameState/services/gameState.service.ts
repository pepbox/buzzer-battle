import mongoose, { Types } from "mongoose";
import { GameState } from "../models/gameState.model";
import { IGameState } from "../types/interfaces";
import { GameStatus } from "../types/enums";
import { Session } from "../../session/models/session.model";
import { SessionStatus } from "../../session/types/enums";
import BuzzerQueueService from "../../buzzerQueue/services/buzzerQueue.service";
import QuestionService from "../../questions/services/question.service";
import { IBuzzerQueue } from "../../buzzerQueue/types/buzzerQueue.interface";

export default class GameStateService {
  private session?: mongoose.ClientSession;

  constructor(session?: mongoose.ClientSession) {
    this.session = session;
  }

  // Fetch game state by session ID
  async fetchGameStateBySessionId(
    sessionId: Types.ObjectId | string,
  ): Promise<IGameState | null> {
    const query = GameState.findOne({ sessionId })
      .populate("currentAnsweringTeam", "teamNumber teamName teamScore")
      .populate(
        "sessionId",
        "sessionName status questionTimeLimit answerTimeLimit",
      );

    if (this.session) {
      query.session(this.session);
    }

    return await query;
  }

  // Create initial game state for a session
  async createGameState(
    sessionId: Types.ObjectId | string,
  ): Promise<IGameState> {
    const gameState = new GameState({
      sessionId,
      // Start at -1 so first NEXT_QUESTION transitions to question index 0
      currentQuestionIndex: -1,
      gameStatus: GameStatus.PAUSED,
    });

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await gameState.save(options);
    return gameState;
  }

  // Update game status
  async updateGameStatus(
    sessionId: Types.ObjectId | string,
    status: GameStatus,
  ): Promise<IGameState> {
    const query = GameState.findOne({ sessionId });
    if (this.session) {
      query.session(this.session);
    }

    const gameState = await query;
    if (!gameState) {
      throw new Error("Game state not found");
    }

    gameState.gameStatus = status;

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await gameState.save(options);
    return gameState;
  }

  // Set current answering team
  async setCurrentAnsweringTeam(
    sessionId: Types.ObjectId | string,
    teamId: Types.ObjectId | string | null,
  ): Promise<IGameState> {
    const query = GameState.findOne({ sessionId });
    if (this.session) {
      query.session(this.session);
    }

    const gameState = await query;
    if (!gameState) {
      throw new Error("Game state not found");
    }

    if (teamId === null) {
      gameState.currentAnsweringTeam = undefined;
    } else {
      gameState.currentAnsweringTeam = teamId as Types.ObjectId;
    }

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await gameState.save(options);
    return gameState;
  }

  // Move to next question
  async moveToNextQuestion(
    sessionId: Types.ObjectId | string,
  ): Promise<IGameState> {
    const query = GameState.findOne({ sessionId });
    if (this.session) {
      query.session(this.session);
    }

    const gameState = await query;
    if (!gameState) {
      throw new Error("Game state not found");
    }

    gameState.currentQuestionIndex += 1;
    gameState.currentAnsweringTeam = undefined;
    gameState.buzzerRoundStartTime = undefined; // Clear timestamps
    gameState.answeringRoundStartTime = undefined;

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await gameState.save(options);
    return gameState;
  }

  // Update game state (comprehensive)
  async updateGameState(
    sessionId: Types.ObjectId | string,
    updates: {
      gameStatus?: GameStatus;
      currentQuestionIndex?: number;
      currentAnsweringTeam?: Types.ObjectId | string | null;
    },
  ): Promise<IGameState> {
    const query = GameState.findOne({ sessionId });
    if (this.session) {
      query.session(this.session);
    }

    const gameState = await query;
    if (!gameState) {
      throw new Error("Game state not found");
    }

    if (updates.gameStatus !== undefined) {
      gameState.gameStatus = updates.gameStatus;
    }

    if (updates.currentQuestionIndex !== undefined) {
      gameState.currentQuestionIndex = updates.currentQuestionIndex;
    }

    if (updates.currentAnsweringTeam !== undefined) {
      if (updates.currentAnsweringTeam === null) {
        gameState.currentAnsweringTeam = undefined;
      } else {
        gameState.currentAnsweringTeam =
          updates.currentAnsweringTeam as Types.ObjectId;
      }
    }

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await gameState.save(options);
    return gameState;
  }

  // Start buzzer round
  async startBuzzerRound(
    sessionId: Types.ObjectId | string,
  ): Promise<IGameState> {
    const query = GameState.findOne({ sessionId });
    if (this.session) {
      query.session(this.session);
    }

    const gameState = await query;
    if (!gameState) {
      throw new Error("Game state not found");
    }

    gameState.gameStatus = GameStatus.BUZZER_ROUND;
    gameState.currentAnsweringTeam = undefined;
    gameState.buzzerRoundStartTime = Date.now() + 1500;
    gameState.answeringRoundStartTime = undefined; // Clear answering time

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await gameState.save(options);

    // Mark session as active once gameplay starts.
    await Session.findByIdAndUpdate(sessionId, {
      status: SessionStatus.PLAYING,
    });

    // Clear buzzer queue for the current question (cleanup from previous question)
    const questionService = new QuestionService(this.session);
    try {
      const currentQuestion = await questionService.fetchCurrentQuestion(
        sessionId,
        gameState.currentQuestionIndex,
      );

      if (currentQuestion) {
        const buzzerQueueService = new BuzzerQueueService(this.session);
        await buzzerQueueService.clearBuzzerQueueForQuestion(
          String(currentQuestion._id),
        );
        console.log(
          `🧹 Cleared buzzer queue for question ${currentQuestion._id}`,
        );
      }
    } catch (error) {
      console.error("Error clearing buzzer queue:", error);
      // Don't throw - this is cleanup, game should continue
    }

    return gameState;
  }

  // Pause game
  async pauseGame(sessionId: Types.ObjectId | string): Promise<IGameState> {
    const query = GameState.findOne({ sessionId });
    if (this.session) {
      query.session(this.session);
    }

    const gameState = await query;
    if (!gameState) {
      throw new Error("Game state not found");
    }

    gameState.gameStatus = GameStatus.PAUSED;
    // Do not clear round timestamps on pause.
    // Frontend uses these for elapsed-time displays (e.g. buzzer leaderboard)
    // and clearing them causes 00:00:00 or invalid fallback values after resume.

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await gameState.save(options);
    return gameState;
  }

  // Resume game (go back to buzzer round)
  async resumeGame(sessionId: Types.ObjectId | string): Promise<IGameState> {
    const query = GameState.findOne({ sessionId });
    if (this.session) {
      query.session(this.session);
    }

    const gameState = await query;
    if (!gameState) {
      throw new Error("Game state not found");
    }

    // Resume to BUZZER_ROUND by default
    gameState.gameStatus = GameStatus.BUZZER_ROUND;

    // If buzzer start time is missing (legacy records), initialize a fresh one.
    if (
      !gameState.buzzerRoundStartTime &&
      gameState.currentQuestionIndex >= 0
    ) {
      gameState.buzzerRoundStartTime = Date.now() + 1500;
    }

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await gameState.save(options);
    return gameState;
  }

  // Move to next question with auto-end game check
  async moveToNextQuestionWithCheck(
    sessionId: Types.ObjectId | string,
  ): Promise<{ gameState: IGameState; gameEnded: boolean }> {
    const query = GameState.findOne({ sessionId }).populate("sessionId");
    if (this.session) {
      query.session(this.session);
    }

    const gameState = await query;
    if (!gameState) {
      throw new Error("Game state not found");
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const totalQuestions = session.questions.length;

    if (totalQuestions === 0) {
      throw new Error("No questions configured for this session");
    }

    const nextIndex = gameState.currentQuestionIndex + 1;

    if (nextIndex >= totalQuestions) {
      // Last question completed - End game
      // NOTE: Don't set session.status to ENDED automatically.
      // This would cause all API calls to fail and force users to logout.
      // Let admin explicitly end the session after viewing final results.
      // session.status = SessionStatus.ENDED;
      // await session.save();

      gameState.gameStatus = GameStatus.PAUSED;
      gameState.currentAnsweringTeam = undefined;
      gameState.buzzerRoundStartTime = undefined; // Clear timestamps
      gameState.answeringRoundStartTime = undefined;

      const options: any = {};
      if (this.session) {
        options.session = this.session;
      }

      await gameState.save(options);

      return { gameState, gameEnded: true };
    } else {
      // Move to next question
      gameState.currentQuestionIndex = nextIndex;
      gameState.currentAnsweringTeam = undefined;
      gameState.gameStatus = GameStatus.BUZZER_ROUND;
      gameState.buzzerRoundStartTime = Date.now() + 1500; // 1.5s delay
      gameState.answeringRoundStartTime = undefined;
      gameState.teamsWhoAnsweredThisQuestion = []; // Reset for new question
      gameState.isNoBuzzerQuestion = false; // Reset no-buzzer flag

      const options: any = {};
      if (this.session) {
        options.session = this.session;
      }

      await gameState.save(options);

      return { gameState, gameEnded: false };
    }
  }

  // Pass question to second team
  async passToSecondTeam(
    sessionId: Types.ObjectId | string,
    currentQuestionId: Types.ObjectId | string,
  ): Promise<IGameState> {
    const buzzerQueueService = new BuzzerQueueService(this.session);

    // Get buzzer leaderboard for current question
    const leaderboard = await buzzerQueueService.fetchBuzzerLeaderboard(
      currentQuestionId,
      sessionId,
    );

    const query = GameState.findOne({ sessionId });
    if (this.session) {
      query.session(this.session);
    }

    const gameState = await query;
    if (!gameState) {
      throw new Error("Game state not found");
    }

    const getTeamId = (entry: IBuzzerQueue): string => {
      const teamRef: any = entry.teamId as any;
      if (typeof teamRef === "string") return teamRef;
      return String(teamRef?._id ?? teamRef);
    };

    const currentAnsweringTeamId = gameState.currentAnsweringTeam
      ? String(gameState.currentAnsweringTeam)
      : undefined;

    // Filter out teams that have already answered this question OR are currently answering.
    // This ensures each pass moves to the next eligible team in queue order.
    const unansweredTeams = leaderboard.filter((team) => {
      const teamId = getTeamId(team);

      const alreadyAnswered = gameState.teamsWhoAnsweredThisQuestion.some(
        (answeredTeamId) => answeredTeamId.toString() === teamId,
      );

      const isCurrentTeam =
        !!currentAnsweringTeamId && currentAnsweringTeamId === teamId;

      return !alreadyAnswered && !isCurrentTeam;
    });

    if (unansweredTeams.length === 0) {
      throw new Error("No unanswered teams available in buzzer queue");
    }

    // Get the first unanswered team (highest ranked unanswered team)
    const nextTeam = unansweredTeams[0];

    // Add the current answering team to the answered list once.
    if (gameState.currentAnsweringTeam) {
      const currentTeamId = String(gameState.currentAnsweringTeam);
      const alreadyTracked = gameState.teamsWhoAnsweredThisQuestion.some(
        (teamId) => teamId.toString() === currentTeamId,
      );

      if (!alreadyTracked) {
        gameState.teamsWhoAnsweredThisQuestion.push(
          gameState.currentAnsweringTeam,
        );
      }
    }

    // Set next team as answering team
    gameState.currentAnsweringTeam = getTeamId(nextTeam) as any;
    gameState.gameStatus = GameStatus.ANSWERING;
    gameState.answeringRoundStartTime = Date.now();
    // Keep buzzerRoundStartTime so waiting teams can still render stable elapsed buzzer times.

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await gameState.save(options);
    return gameState;
  }

  // Set specific team as answering team (used by auto-selection and manual selection)
  async setAnsweringTeam(
    sessionId: Types.ObjectId | string,
    fastestTeamOrTeamId: IBuzzerQueue | Types.ObjectId | string,
  ): Promise<IGameState> {
    const query = GameState.findOne({ sessionId });
    if (this.session) {
      query.session(this.session);
    }

    const gameState = await query;
    if (!gameState) {
      throw new Error("Game state not found");
    }

    const answeringTeamId =
      typeof fastestTeamOrTeamId === "string" ||
      fastestTeamOrTeamId instanceof Types.ObjectId
        ? fastestTeamOrTeamId
        : (fastestTeamOrTeamId.teamId as any)?._id ||
          fastestTeamOrTeamId.teamId;

    gameState.currentAnsweringTeam = answeringTeamId as any;
    gameState.gameStatus = GameStatus.ANSWERING;
    gameState.answeringRoundStartTime = Date.now();
    // gameState.buzzerRoundStartTime = undefined; // Clear buzzer time

    console.log("Answering team selected", answeringTeamId);
    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await gameState.save(options);
    return gameState;
  }

  // Auto-select fastest team from buzzer leaderboard
  async autoSelectFastestTeam(
    sessionId: Types.ObjectId | string,
    questionId: Types.ObjectId | string,
  ): Promise<IGameState> {
    const buzzerQueueService = new BuzzerQueueService(this.session);

    // Get buzzer leaderboard
    const leaderboard = await buzzerQueueService.fetchBuzzerLeaderboard(
      questionId,
      sessionId,
    );

    if (leaderboard.length === 0) {
      throw new Error("No teams in buzzer queue");
    }

    // Get fastest team (1st place)
    const fastestTeam = leaderboard[0];

    return await this.setAnsweringTeam(sessionId, fastestTeam);
  }

  /**
   * Auto-transition from BUZZER_ROUND to ANSWERING
   * Selects the fastest team from buzzer queue
   */
  async transitionToAnswering(
    sessionId: Types.ObjectId | string,
    questionId: Types.ObjectId | string,
  ): Promise<IGameState> {
    console.log(`🔄 Auto-transitioning to ANSWERING for session ${sessionId}`);

    const gameState = await this.fetchGameStateBySessionId(sessionId);
    if (!gameState) {
      throw new Error("Game state not found");
    }

    // Only transition if still in buzzer round
    if (gameState.gameStatus !== GameStatus.BUZZER_ROUND) {
      console.log(
        `⚠️ Game state is ${gameState.gameStatus}, skipping transition to ANSWERING`,
      );
      return gameState;
    }

    // Auto-select fastest team
    try {
      return await this.autoSelectFastestTeam(sessionId, questionId);
    } catch (error: any) {
      if (error.message === "No teams in buzzer queue") {
        // No teams pressed buzzer, transition to IDLE
        console.log("⚠️ No teams pressed buzzer, transitioning to IDLE");
        return await this.transitionToIdle(sessionId);
      }
      throw error;
    }
  }

  /**
   * Auto-transition from ANSWERING to IDLE
   * Called when answering time expires
   */
  async transitionToIdle(
    sessionId: Types.ObjectId | string,
  ): Promise<IGameState> {
    console.log(`🔄 Auto-transitioning to IDLE for session ${sessionId}`);

    const query = GameState.findOne({ sessionId });
    if (this.session) {
      query.session(this.session);
    }

    const gameState = await query;
    if (!gameState) {
      throw new Error("Game state not found");
    }

    gameState.gameStatus = GameStatus.IDLE;
    gameState.idleStartTime = Date.now();
    gameState.buzzerRoundStartTime = undefined;
    gameState.answeringRoundStartTime = undefined;

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await gameState.save(options);
    console.log(`✅ Transitioned to IDLE for session ${sessionId}`);

    return gameState;
  }
}
