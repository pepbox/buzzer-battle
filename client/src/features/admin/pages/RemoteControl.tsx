import React, { useState, useEffect } from "react";
import { Box, Alert, Snackbar } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import normalBg from "../../../assets/background/normal_bg.webp";
import RemoteHeader from "../components/RemoteHeader";
import RemoteGameStatus from "../components/RemoteGameStatus";
import RemoteTeamInfo from "../components/RemoteTeamInfo";
import RemoteActionButtons from "../components/RemoteActionButtons";
import RemoteBuzzerStats from "../components/RemoteBuzzerStats";
import {
  usePauseGame,
  useResumeGame,
  useNextQuestion,
  usePassToSecondTeam,
  useAutoSelectFastestTeam,
} from "../services/adminRemoteApi";
import { useFetchGameStateQuery } from "../../game/services/gameStateApi";
import {
  useFetchBuzzerLeaderboardQuery,
  useFetchBuzzerStatsQuery,
} from "../../game/services/buzzerApi";
import { useFetchCurrentQuestionQuery } from "../../question/services/questions.api";
import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";
import Loader from "../../../components/ui/Loader";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";

const RemoteControl: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { session } = useAppSelector((state: RootState) => state.session);

  // State
  const [lastAnswerWasWrong, setLastAnswerWasWrong] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );
  const [buzzerStatsCache, setBuzzerStatsCache] = useState<any>(null);

  // Fetch game state
  const {
    data: gameStateData,
    isLoading: gameStateLoading,
    error: gameStateError,
  } = useFetchGameStateQuery();

  // Fetch current question to get the actual question ID
  const { data: currentQuestionData } = useFetchCurrentQuestionQuery(
    undefined,
    {
      skip: !gameStateData?.data?.gameState,
    }
  );

  // Fetch buzzer leaderboard (to check if 2nd team exists)
  const { data: buzzerLeaderboardData } = useFetchBuzzerLeaderboardQuery();

  // Action hooks
  const { pauseGame, isLoading: pauseLoading } = usePauseGame();
  const { resumeGame, isLoading: resumeLoading } = useResumeGame();
  const { nextQuestion, isLoading: nextLoading } = useNextQuestion();
  const { passToSecondTeam, isLoading: passLoading } = usePassToSecondTeam();
  const { autoSelectFastestTeam} =
    useAutoSelectFastestTeam();

  const isAnyLoading =
    pauseLoading ||
    resumeLoading ||
    nextLoading ||
    // leaderboardLoading ||
    passLoading;

  // Extract game state data
  const gameState = gameStateData?.data?.gameState;
  const currentQuestionIndex = gameState?.currentQuestionIndex || 0;
  const totalQuestions = 10; // Default value - can be fetched from session if needed
  const gameStatus = gameState?.gameStatus || "paused";
  const currentAnsweringTeamRaw = gameState?.currentAnsweringTeam;

  // Get actual question ID from the current question
  const currentQuestionId = currentQuestionData?.data?.question?._id;

  // Fetch buzzer stats only when needed (not polling, just initial fetch)
  const { data: buzzerStatsData, refetch: refetchBuzzerStats } =
    useFetchBuzzerStatsQuery(undefined, {
      skip: gameStatus !== "buzzer_round" || !currentQuestionId,
    });

  const buzzerStats = buzzerStatsCache || buzzerStatsData?.data;

  // Parse currentAnsweringTeam (could be string or object)
  const currentAnsweringTeam =
    typeof currentAnsweringTeamRaw === "string"
      ? null
      : currentAnsweringTeamRaw || null;

  // Check if 2nd team exists in buzzer leaderboard
  const buzzerLeaderboard = buzzerLeaderboardData?.data?.leaderboard || [];
  const canPassToSecondTeam = buzzerLeaderboard.length >= 2;

  // Clear cache when question changes
  useEffect(() => {
    setBuzzerStatsCache(null);
  }, [currentQuestionId]);

  // Listen for answer results via WebSocket
  useEffect(() => {
    const handleAnswerSubmitted = (data: any) => {
      if (data.isCorrect === false) {
        setLastAnswerWasWrong(true);
        showSnackbar(
          "Answer was incorrect. You can pass to 2nd team.",
          "error"
        );
      } else if (data.isCorrect === true) {
        setLastAnswerWasWrong(false);
        showSnackbar("Answer was correct! Move to next question.", "success");
      }
    };

    const handleGameStateChanged = (data: any) => {
      if (data.gameStatus === "buzzer_round") {
        setLastAnswerWasWrong(false); // Reset on new question
        // Clear cache and refetch buzzer stats when buzzer round starts
        setBuzzerStatsCache(null);
        if (refetchBuzzerStats) {
          refetchBuzzerStats();
        }
      }
    };

    const handleBuzzerPressed = () => {
      // Update buzzer stats in real-time when a team presses buzzer
      if (gameStatus === "buzzer_round" && refetchBuzzerStats) {
        refetchBuzzerStats().then((result: any) => {
          if (result.data?.data) {
            setBuzzerStatsCache(result.data.data);
          }
        });
      }
    };

    websocketService.on(Events.ANSWER_SUBMITTED, handleAnswerSubmitted);
    websocketService.on(Events.GAME_STATE_CHANGED, handleGameStateChanged);
    websocketService.on(Events.BUZZER_PRESSED, handleBuzzerPressed);

    return () => {
      websocketService.off(Events.ANSWER_SUBMITTED, handleAnswerSubmitted);
      websocketService.off(Events.GAME_STATE_CHANGED, handleGameStateChanged);
      websocketService.off(Events.BUZZER_PRESSED, handleBuzzerPressed);
    };
  }, [gameStatus, refetchBuzzerStats]);

  // Handlers
  const handlePauseGame = async () => {
    try {
      await pauseGame().unwrap();
      showSnackbar("Game paused", "success");
    } catch (error: any) {
      showSnackbar(error?.data?.message || "Failed to pause game", "error");
    }
  };

  const handleResumeGame = async () => {
    try {
      await resumeGame().unwrap();
      showSnackbar("Game resumed", "success");
    } catch (error: any) {
      showSnackbar(error?.data?.message || "Failed to resume game", "error");
    }
  };

  const handleNextQuestion = async () => {
    try {
      const result = await nextQuestion().unwrap();

      if (result.data.gameEnded) {
        showSnackbar("Game completed! All questions done.", "success");
        // Navigate to game completion or final leaderboard
        // setTimeout(() => {
        //   navigate(`/admin/${sessionId}/completion`);
        // }, 2000);
      } else {
        // Check if this was the first question (game start)
        if (currentQuestionIndex === -1) {
          showSnackbar("Game started! Buzzer round active.", "success");
        } else {
          showSnackbar("Moved to next question", "success");
        }
        setLastAnswerWasWrong(false);
      }
    } catch (error: any) {
      showSnackbar(
        error?.data?.message || "Failed to move to next question",
        "error"
      );
    }
  };

  const handlePassToSecondTeam = async () => {
    if (!currentQuestionId) {
      showSnackbar(
        "Cannot pass to second team - question ID not available",
        "error"
      );
      return;
    }

    try {
      await passToSecondTeam(currentQuestionId).unwrap();
      showSnackbar("Question passed to 2nd team", "success");
      setLastAnswerWasWrong(false);
    } catch (error: any) {
      showSnackbar(
        error?.data?.message || "Failed to pass to 2nd team",
        "error"
      );
    }
  };

  const handleAllowTopTeam = async () => {
    if (!currentQuestionId) {
      showSnackbar("Cannot select team - question ID not available", "error");
      return;
    }

    try {
      await autoSelectFastestTeam(currentQuestionId).unwrap();
      showSnackbar("Top team selected! Answering round started.", "success");
      setLastAnswerWasWrong(false);
    } catch (error: any) {
      showSnackbar(
        error?.data?.message || "Failed to select fastest team",
        "error"
      );
    }
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Loading state
  if (gameStateLoading) {
    return <Loader />;
  }

  // Error state
  if (gameStateError) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          padding: "20px",
        }}
      >
        <Alert severity="error">
          Failed to load game state. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <>
      {/* Main Container */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: `url(${normalBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          overflow: "auto",
          // On desktop, center the mobile view
          "@media (min-width: 768px)": {
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            backgroundColor: "#000",
            paddingTop: "20px",
          },
        }}
      >
        {/* Remote Control Container */}
        <Box
          sx={{
            width: "100%",
            minHeight: "100vh",
            maxWidth: "480px", // Mobile size on desktop
            backgroundColor: "white",
            position: "relative",
            boxShadow: "0 0 20px rgba(0, 0, 0, 0.3)",
            "@media (min-width: 768px)": {
              minHeight: "auto",
              borderRadius: "16px",
              overflow: "hidden",
            },
          }}
        >
          {/* Header */}
          <RemoteHeader
            sessionName={session?.sessionName || "Session"}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={totalQuestions}
          />

          {/* Game Status */}
          <RemoteGameStatus gameStatus={gameStatus} />

          {/* Current Team Info */}
          <RemoteTeamInfo
            currentAnsweringTeam={currentAnsweringTeam}
            buzzerTimestamp={
              currentAnsweringTeam
                ? buzzerLeaderboard.find(
                    (entry) =>
                      entry.teamId === currentAnsweringTeam._id ||
                      (entry as any).teamId?._id === currentAnsweringTeam._id
                  )?.timestamp
                : undefined
            }
          />
          {/* Buzzer Stats - Only show during buzzer round */}
          {gameStatus === "buzzer_round" && buzzerStats && (
            <RemoteBuzzerStats
              fastestTeam={buzzerStats.fastestTeam}
              teamsPressed={buzzerStats.teamsPressed}
              teamsRemaining={buzzerStats.teamsRemaining}
              totalTeams={buzzerStats.totalTeams}
            />
          )}

          {/* Action Buttons */}
          <RemoteActionButtons
            gameStatus={gameStatus}
            currentQuestionIndex={currentQuestionIndex}
            onNextQuestion={handleNextQuestion}
            onPauseGame={handlePauseGame}
            onResumeGame={handleResumeGame}
            onPassToSecondTeam={handlePassToSecondTeam}
            onAllowTopTeam={handleAllowTopTeam}
            canPassToSecondTeam={canPassToSecondTeam}
            hasFastestTeam={!!buzzerStats?.fastestTeam}
            isLoading={isAnyLoading}
            lastAnswerWasWrong={lastAnswerWasWrong}
          />
        </Box>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default RemoteControl;
