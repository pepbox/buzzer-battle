import { Socket } from "socket.io";
import BuzzerQueueService from "../../../modules/buzzerQueue/services/buzzerQueue.service";
import GameStateService from "../../../modules/gameState/services/gameState.service";
import QuestionService from "../../../modules/questions/services/question.service";
import { GameStatus } from "../../../modules/gameState/types/enums";
import { getSocketIO } from "../index";

const buzzerQueueService = new BuzzerQueueService();
const gameStateService = new GameStateService();
const questionService = new QuestionService();

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
            socket.emit("buzzer-error", {
                message: "Unauthorized: User information not found.",
            });
            return;
        }

        const teamId = user.id;
        const sessionId = user.sessionId;
        const timestamp = BigInt(payload.timestamp);

        // Fetch game state
        const gameState = await gameStateService.fetchGameStateBySessionId(sessionId);
        if (!gameState) {
            socket.emit("buzzer-error", {
                message: "Game state not found.",
            });
            return;
        }

        // Check if game status is BUZZER_ROUND
        if (gameState.gameStatus !== GameStatus.BUZZER_ROUND) {
            socket.emit("buzzer-error", {
                message: "Buzzer can only be pressed during the buzzer round.",
            });
            return;
        }

        // Fetch current question
        const currentQuestion = await questionService.fetchCurrentQuestion(
            sessionId,
            gameState.currentQuestionIndex
        );

        if (!currentQuestion) {
            socket.emit("buzzer-error", {
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
            socket.emit("buzzer-error", {
                message: "You have already pressed the buzzer for this question.",
            });
            return;
        }

        // Calculate TTL (e.g., 1 hour from now for auto-cleanup)
        const ttl = new Date();
        ttl.setHours(ttl.getHours() + 1);

        // Create buzzer entry
        const buzzerEntry = await buzzerQueueService.createBuzzerEntry({
            gameStateId: (gameState as any)._id,
            sessionId,
            teamId,
            questionId,
            timestamp,
            ttl,
        });

        // Emit to the team that their buzzer press was successful
        socket.emit("buzzer-pressed-success", {
            message: "Buzzer pressed successfully!",
            data: {
                timestamp: buzzerEntry.timestamp.toString(),
                questionId: buzzerEntry.questionId,
            },
        });

        // Emit to all users in the session that a buzzer was pressed
        const io = getSocketIO();
        io.to(`session:${sessionId}`).emit("buzzer-pressed", {
            teamId,
            timestamp: buzzerEntry.timestamp.toString(),
            questionId: buzzerEntry.questionId,
        });

        console.log(`Buzzer pressed by team ${teamId} at ${timestamp}`);
    } catch (error: any) {
        console.error("Error handling buzzer press:", error);
        socket.emit("buzzer-error", {
            message: "Failed to process buzzer press. Please try again.",
            error: error.message,
        });
    }
};
