import { Socket } from "socket.io";
import BuzzerQueueService from "../../../modules/buzzerQueue/services/buzzerQueue.service";
import GameStateService from "../../../modules/gameState/services/gameState.service";
import QuestionService from "../../../modules/questions/services/question.service";
import TeamService from "../../../modules/teams/services/team.service";
import { GameStatus } from "../../../modules/gameState/types/enums";
import { SessionEmitters } from "../sessionEmitters";
import { Events } from "../enums/Events";

const buzzerQueueService = new BuzzerQueueService();
const gameStateService = new GameStateService();
const questionService = new QuestionService();
const teamService = new TeamService();

interface PressBuzzerPayload {
    timestamp: string; // bigint as string
}

/**
 * Handle press-buzzer event from teams
 */
export const handlePressBuzzer = async (
    socket: Socket,
    payload: PressBuzzerPayload
) => {
    try {
        const user = (socket as any).user;
        
        if (!user || !user.id || !user.sessionId) {
            socket.emit(Events.BUZZER_ERROR, {
                message: "Unauthorized: User information not found.",
            });
            return;
        }

        const teamId = user.id;
        const sessionId = user.sessionId;
        const normalizedTimestamp = Number(payload.timestamp);
        if (!Number.isFinite(normalizedTimestamp)) {
            socket.emit(Events.BUZZER_ERROR, {
                message: "Invalid buzzer timestamp.",
            });
            return;
        }

        const roundedTimestamp = Math.round(normalizedTimestamp);
        const timestamp = BigInt(roundedTimestamp);

        // Fetch game state
        const gameState = await gameStateService.fetchGameStateBySessionId(sessionId);
        if (!gameState) {
            socket.emit(Events.BUZZER_ERROR, {
                message: "Game state not found.",
            });
            return;
        }

        // Check if game status is BUZZER_ROUND
        if (gameState.gameStatus !== GameStatus.BUZZER_ROUND) {
            socket.emit(Events.BUZZER_ERROR, {
                message: "Buzzer can only be pressed during the buzzer round.",
            });
            return;
        }

        // Enforce synchronized delay validation (prevent cheating/mashing before lock lifts)
        if (gameState.buzzerRoundStartTime && timestamp < BigInt(gameState.buzzerRoundStartTime)) {
            socket.emit(Events.BUZZER_ERROR, {
                message: "Buzzer pressed too early! Wait for the countdown.",
            });
            return;
        }

        // Fetch current question
        const currentQuestion = await questionService.fetchCurrentQuestion(
            sessionId,
            gameState.currentQuestionIndex
        );

        if (!currentQuestion) {
            socket.emit(Events.BUZZER_ERROR, {
                message: "Current question not found.",
            });
            return;
        }

        const questionId = (currentQuestion as any)._id;

        // Check if team has already pressed the buzzer for this question
        const hasPressed = await buzzerQueueService.checkIfTeamPressed(
            questionId,
            teamId
        );

        if (hasPressed) {
            socket.emit(Events.BUZZER_ERROR, {
                message: "You have already pressed the buzzer for this question.",
            });
            return;
        }

        // Calculate TTL (e.g., 1 hour from now for auto-cleanup)
        const ttl = new Date();
        ttl.setHours(ttl.getHours() + 1);
        const reactionTimeMs = gameState.buzzerRoundStartTime
            ? Math.max(0, roundedTimestamp - gameState.buzzerRoundStartTime)
            : 0;

        // Create buzzer entry
        const buzzerEntry = await buzzerQueueService.createBuzzerEntry({
            gameStateId: (gameState as any)._id,
            sessionId,
            teamId,
            questionId,
            timestamp,
            reactionTimeMs,
            ttl,
        });
        await teamService.recordBuzzerReactionTime(teamId, reactionTimeMs);

        // Emit to the team that their buzzer press was successful
        socket.emit(Events.BUZZER_PRESSED_SUCCESS, {
            message: "Buzzer pressed successfully!",
            data: {
                timestamp: buzzerEntry.timestamp.toString(),
                reactionTimeMs: buzzerEntry.reactionTimeMs,
                questionId: buzzerEntry.questionId,
            },
        });

        // Emit to all users in the session that a buzzer was pressed
        SessionEmitters.toSession(sessionId, Events.BUZZER_PRESSED, {
            teamId,
            timestamp: buzzerEntry.timestamp.toString(),
            reactionTimeMs: buzzerEntry.reactionTimeMs,
            questionId: buzzerEntry.questionId,
        });

        console.log(`Buzzer pressed by team ${teamId} at ${timestamp}`);
    } catch (error: any) {
        console.error("Error handling buzzer press:", error);
        socket.emit(Events.BUZZER_ERROR, {
            message: "Failed to process buzzer press. Please try again.",
            error: error.message,
        });
    }
};
