import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import WaitingAnimation from "./WaitingAnimation";
import PresenterBuzzerRound from "../../game/pages/PresenterBuzzerRound";
import { presenterAudio } from "../../../utils/presenterAudio";
import { Session } from "../../session/services/session.api";


interface PresenterGameViewProps {
  // sessionName?: string;
  session?: Session;
}

const PresenterGameView: React.FC<PresenterGameViewProps> = ({ session }) => {
  const gameState = useAppSelector(
    (state: RootState) => state.gameState.gameState
  );
  // const session = useAppSelector((state: RootState) => state.session.session);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);

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
      // TODO: Show question component here
      // For now, show a placeholder
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: 4,
          }}
        >
          <Box
            sx={{
              padding: 4,
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderRadius: 3,
              maxWidth: "90%",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            }}
          >
            {/* TODO: Replace with actual Question component */}
            {/* <Box
              sx={{ fontSize: 36, fontWeight: "bold", mb: 3, color: "#333" }}
            >
              Question Display
            </Box> */}
            <Box sx={{ fontSize: 24, color: "#666" }}>
              Team{" "}
              {typeof currentAnsweringTeam === "string"
                ? currentAnsweringTeam
                : currentAnsweringTeam?.teamNumber ||
                  currentAnsweringTeam?.teamName}{" "}
              is answering...
            </Box>
            {/* Question component will go here with presenterMode={true} */}
          </Box>
        </Box>
      );

    default:
      return (
        <WaitingAnimation
          sessionName={session?.sessionName}
          customMessage="Loading game state..."
        />
      );
  }
};

export default PresenterGameView;
