import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import WaitingAnimation from "./WaitingAnimation";
import PresenterBuzzerRound from "../../game/pages/PresenterBuzzerRound";
import { presenterAudio } from "../../../utils/presenterAudio";
import { Session } from "../../session/services/session.api";
import questionBg from "../../../assets/background/normal_bg.webp";
import AnswerRevealPage from "../../game/pages/AnswerRevealPage";
import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";

interface PresenterGameViewProps {
  // sessionName?: string;
  session?: Session;
}

// Helper to manage answer reveal state in localStorage
const getAnswerRevealKey = (sessionId: string, questionIndex: number) => {
  return `presenter_answer_revealed_${sessionId}_${questionIndex}`;
};

const getStoredAnswerReveal = (
  sessionId: string,
  questionIndex: number,
): boolean => {
  try {
    const key = getAnswerRevealKey(sessionId, questionIndex);
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};

const setStoredAnswerReveal = (
  sessionId: string,
  questionIndex: number,
  revealed: boolean,
) => {
  try {
    const key = getAnswerRevealKey(sessionId, questionIndex);
    if (revealed) {
      localStorage.setItem(key, "true");
    } else {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error("Failed to store answer reveal state:", error);
  }
};

const PresenterGameView: React.FC<PresenterGameViewProps> = ({ session }) => {
  const gameState = useAppSelector(
    (state: RootState) => state.gameState.gameState,
  );
  // const session = useAppSelector((state: RootState) => state.session.session);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const [shouldRevealAnswer, setShouldRevealAnswer] = useState(false);

  // Initialize shouldRevealAnswer from localStorage on mount or question change
  useEffect(() => {
    if (gameState?.sessionId && gameState?.currentQuestionIndex !== undefined) {
      const storedReveal = getStoredAnswerReveal(
        gameState.sessionId,
        gameState.currentQuestionIndex,
      );
      setShouldRevealAnswer(storedReveal);
    }
  }, [gameState?.sessionId, gameState?.currentQuestionIndex]);

  // Reset reveal flag whenever the question changes and update localStorage.
  useEffect(() => {
    setShouldRevealAnswer(false);
    if (gameState?.sessionId && gameState?.currentQuestionIndex !== undefined) {
      setStoredAnswerReveal(
        gameState.sessionId,
        gameState.currentQuestionIndex,
        false,
      );
    }
  }, [gameState?.currentQuestionIndex]);

  // Reveal answer only when admin marks a team correct or shows answer
  useEffect(() => {
    const handleAnswerMarkedCorrect = () => {
      setShouldRevealAnswer(true);
      if (
        gameState?.sessionId &&
        gameState?.currentQuestionIndex !== undefined
      ) {
        setStoredAnswerReveal(
          gameState.sessionId,
          gameState.currentQuestionIndex,
          true,
        );
      }
    };

    const handleAnswerMarkedWrong = () => {
      setShouldRevealAnswer(false);
      if (
        gameState?.sessionId &&
        gameState?.currentQuestionIndex !== undefined
      ) {
        setStoredAnswerReveal(
          gameState.sessionId,
          gameState.currentQuestionIndex,
          false,
        );
      }
    };

    const handleShowAnswer = () => {
      setShouldRevealAnswer(true);
      if (
        gameState?.sessionId &&
        gameState?.currentQuestionIndex !== undefined
      ) {
        setStoredAnswerReveal(
          gameState.sessionId,
          gameState.currentQuestionIndex,
          true,
        );
      }
    };

    websocketService.on(
      Events.ANSWER_MARKED_CORRECT,
      handleAnswerMarkedCorrect,
    );
    websocketService.on(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
    websocketService.on(Events.SHOW_ANSWER, handleShowAnswer);

    return () => {
      websocketService.off(
        Events.ANSWER_MARKED_CORRECT,
        handleAnswerMarkedCorrect,
      );
      websocketService.off(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
      websocketService.off(Events.SHOW_ANSWER, handleShowAnswer);
    };
  }, [gameState?.sessionId, gameState?.currentQuestionIndex]);

  // Play sounds based on game state changes
  useEffect(() => {
    if (!gameState) return;

    const currentStatus = gameState.gameStatus;

    // Play buzzer sound when entering buzzer round
    if (currentStatus === "buzzer_round" && previousStatus !== "buzzer_round") {
      presenterAudio.playBuzzer();
    }

    // Play success/error sounds when answer is evaluated
    if (previousStatus === "answering" && currentStatus === "paused") {
      // You can add logic here to determine if answer was correct
      // For now, we'll leave it commented
      // presenterAudio.playSuccess() or presenterAudio.playError()
    }

    setPreviousStatus(currentStatus);
  }, [gameState, previousStatus]);

  // If no game state, show waiting animation
  if (!gameState) {
    return (
      <WaitingAnimation
        sessionName={session?.sessionName}
        customMessage="Waiting for game to start..."
      />
    );
  }

  const { gameStatus, currentAnsweringTeam } = gameState;

  // Render based on game status
  switch (gameStatus) {
    case "paused":
      return (
        <WaitingAnimation
          sessionName={session?.sessionName}
          customMessage="Get ready for the next question!"
        />
      );

    case "buzzer_round":
      return <PresenterBuzzerRound />;

    case "answering":
      // Keep showing the question while a team is answering.
      return <PresenterBuzzerRound />;

    case "idle":
      if ((gameState.currentQuestionIndex ?? -1) === -1) {
        return (
          <WaitingAnimation
            sessionName={session?.sessionName}
            customMessage="Waiting for game to start..."
          />
        );
      }

      // Do not reveal answer by default on idle; reveal only after a correct answer event.
      return shouldRevealAnswer ? (
        <AnswerRevealPage presenterMode />
      ) : (
        <PresenterBuzzerRound />
      );

    default:
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
            background: `url(${questionBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              fontSize: 32,
              fontWeight: 600,
              color: "#fff",
              textShadow: "2px 2px 8px rgba(0, 0, 0, 0.8)",
              mb: 3,
            }}
          >
            Team{" "}
            {typeof currentAnsweringTeam === "string"
              ? currentAnsweringTeam
              : currentAnsweringTeam?.teamName ||
                currentAnsweringTeam?.teamNumber}{" "}
            is answering...
          </Box>
        </Box>
      );
  }
};

export default PresenterGameView;
