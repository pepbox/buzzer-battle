import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
  Paper,
} from "@mui/material";
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
  useShowAnswer,
  usePassToSecondTeam,
  useAutoSelectFastestTeam,
  useSetAnsweringTeam,
} from "../services/adminRemoteApi";
import { useFetchTeamDashboardQuery } from "../services/admin.Api";
import {
  useFetchGameStateQuery,
  useMarkAnswerMutation,
} from "../../game/services/gameStateApi";
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
  const { session } = useAppSelector((state: RootState) => state.session);

  // State
  const [lastAnswerWasWrong, setLastAnswerWasWrong] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success",
  );
  const [showAnswerModalOpen, setShowAnswerModalOpen] = useState(false);
  const [buzzerStatsCache, setBuzzerStatsCache] = useState<any>(null);
  const [attemptedTeamIds, setAttemptedTeamIds] = useState<string[]>([]);

  // Fetch game state
  const {
    data: gameStateData,
    isLoading: gameStateLoading,
    error: gameStateError,
  } = useFetchGameStateQuery();
  const { data: teamDashboardData } = useFetchTeamDashboardQuery();

  // Fetch current question to get the actual question ID
  const { data: currentQuestionData, refetch: refetchCurrentQuestion } =
    useFetchCurrentQuestionQuery(undefined, {
      skip: !gameStateData?.data?.gameState,
    });

  // Fetch buzzer leaderboard (to check if 2nd team exists)
  const { data: buzzerLeaderboardData } = useFetchBuzzerLeaderboardQuery();

  // Action hooks
  const { pauseGame, isLoading: pauseLoading } = usePauseGame();
  const { resumeGame, isLoading: resumeLoading } = useResumeGame();
  const { nextQuestion, isLoading: nextLoading } = useNextQuestion();
  const { showAnswer, isLoading: showAnswerLoading } = useShowAnswer();
  const { passToSecondTeam, isLoading: passLoading } = usePassToSecondTeam();
  const { autoSelectFastestTeam } = useAutoSelectFastestTeam();
  const { setAnsweringTeam, isLoading: setTeamLoading } = useSetAnsweringTeam();
  const [markAnswer, { isLoading: markAnswerLoading }] =
    useMarkAnswerMutation();
  const [selectedTeamIdForNoBuzzer, setSelectedTeamIdForNoBuzzer] =
    useState("");

  const isAnyLoading =
    pauseLoading ||
    resumeLoading ||
    nextLoading ||
    showAnswerLoading ||
    passLoading ||
    markAnswerLoading ||
    setTeamLoading;

  // Extract game state data
  const gameState = gameStateData?.data?.gameState;
  const currentQuestionIndex = gameState?.currentQuestionIndex ?? -1;
  const totalQuestions = session?.questions?.length || 0;
  const gameStatus = gameState?.gameStatus || "paused";
  const currentAnsweringTeamRaw = gameState?.currentAnsweringTeam;

  // Get actual question ID from the current question
  const currentQuestionId = currentQuestionData?.data?.question?._id;
  const currentQuestionKeepBuzzer =
    currentQuestionData?.data?.question?.keepBuzzer;
  const teams = teamDashboardData?.data?.teams || [];
  const currentAnsweringTeamId =
    typeof currentAnsweringTeamRaw === "string"
      ? currentAnsweringTeamRaw
      : currentAnsweringTeamRaw?._id;
  // Parse currentAnsweringTeam (could be string or object); resolve from teams when only ID is present.
  const currentAnsweringTeam =
    typeof currentAnsweringTeamRaw === "string"
      ? teams.find((team) => team._id === currentAnsweringTeamRaw) || null
      : currentAnsweringTeamRaw || null;
  const isNoBuzzerMode =
    currentQuestionKeepBuzzer === false && !currentAnsweringTeamId;

  // Filter out already selected team from dropdown options
  const availableTeams = useMemo(
    () =>
      teams.filter(
        (team) =>
          team._id !== currentAnsweringTeamId &&
          !attemptedTeamIds.includes(team._id),
      ),
    [teams, currentAnsweringTeamId, attemptedTeamIds],
  );

  // Fetch buzzer stats only when needed (not polling, just initial fetch)
  const { data: buzzerStatsData, refetch: refetchBuzzerStats } =
    useFetchBuzzerStatsQuery(undefined, {
      skip: gameStatus !== "buzzer_round" || !currentQuestionId,
    });

  const buzzerStats = buzzerStatsCache || buzzerStatsData?.data;

  // Check if 2nd team exists in buzzer leaderboard
  const buzzerLeaderboard = buzzerLeaderboardData?.data?.leaderboard || [];
  const canPassToSecondTeam = buzzerLeaderboard.length >= 2;

  // Clear cache and reset team selection when question changes
  useEffect(() => {
    setBuzzerStatsCache(null);
    setSelectedTeamIdForNoBuzzer("");
    setAttemptedTeamIds([]);
  }, [currentQuestionId]);

  // Ensure keepBuzzer/question metadata stays fresh when question index changes.
  useEffect(() => {
    if (currentQuestionIndex >= 0) {
      refetchCurrentQuestion();
    }
  }, [currentQuestionIndex, refetchCurrentQuestion]);

  // Handle team selection for no-buzzer questions
  const handleSelectTeamForNoBuzzer = async (
    event: SelectChangeEvent<string>,
  ) => {
    const teamId = event.target.value;
    if (!teamId) return;

    try {
      await setAnsweringTeam(teamId).unwrap();
      setSelectedTeamIdForNoBuzzer(teamId);
      setLastAnswerWasWrong(false);
      setAttemptedTeamIds((prev) =>
        prev.includes(teamId) ? prev : [...prev, teamId],
      );
      showSnackbar(`Team selected. Answering round started.`, "success");
    } catch (error: any) {
      showSnackbar(error?.data?.message || "Failed to select team", "error");
    }
  };

  // Listen for answer results via WebSocket
  useEffect(() => {
    // Handle legacy answer submitted event (from user-selected MCQ flow)
    const handleAnswerSubmitted = (data: any) => {
      if (data.isCorrect === false) {
        setLastAnswerWasWrong(true);
        showSnackbar(
          "Answer was incorrect. You can pass to 2nd team.",
          "error",
        );
      } else if (data.isCorrect === true) {
        setLastAnswerWasWrong(false);
        showSnackbar("Answer was correct! Move to next question.", "success");
      }
    };

    // Handle admin-marked correct (new verbal answer flow)
    const handleAnswerMarkedCorrect = (data: any) => {
      setLastAnswerWasWrong(false);
      showSnackbar(
        `Answer marked correct! +${data.pointsAwarded} points.`,
        "success",
      );
    };

    // Handle admin-marked wrong (new verbal answer flow)
    const handleAnswerMarkedWrong = (data: any) => {
      setLastAnswerWasWrong(true);
      if (data?.teamId) {
        const failedTeamId = String(data.teamId);
        setAttemptedTeamIds((prev) =>
          prev.includes(failedTeamId) ? prev : [...prev, failedTeamId],
        );
      }
      showSnackbar("Answer marked wrong. You can pass to 2nd team.", "error");
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

      // Whenever a new answering round starts (manual select/pass/auto select),
      // action buttons should be visible again.
      if (data.gameStatus === "answering") {
        setLastAnswerWasWrong(false);
      }

      // In no-buzzer flow, returning to IDLE after wrong answer should show dropdown again.
      if (data.gameStatus === "idle") {
        setSelectedTeamIdForNoBuzzer("");
      }

      // Always refresh current question metadata on game state transitions.
      refetchCurrentQuestion();
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
    websocketService.on(
      Events.ANSWER_MARKED_CORRECT,
      handleAnswerMarkedCorrect,
    );
    websocketService.on(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
    websocketService.on(Events.GAME_STATE_CHANGED, handleGameStateChanged);
    websocketService.on(Events.BUZZER_PRESSED, handleBuzzerPressed);

    return () => {
      websocketService.off(Events.ANSWER_SUBMITTED, handleAnswerSubmitted);
      websocketService.off(
        Events.ANSWER_MARKED_CORRECT,
        handleAnswerMarkedCorrect,
      );
      websocketService.off(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
      websocketService.off(Events.GAME_STATE_CHANGED, handleGameStateChanged);
      websocketService.off(Events.BUZZER_PRESSED, handleBuzzerPressed);
    };
  }, [gameStatus, refetchBuzzerStats, refetchCurrentQuestion]);

  // Handlers
  const handlePauseGame = async () => {
    try {
      await pauseGame().unwrap();
      showSnackbar("Game paused", "success");
    } catch (error: any) {
      showSnackbar(error?.data?.message || "Failed to pause game", "error");
    }
  };

  const handleOpenShowAnswerModal = () => {
    if (currentQuestionIndex < 0) {
      showSnackbar("Start the game first to reveal an answer", "error");
      return;
    }
    setShowAnswerModalOpen(true);
  };

  const handleCloseShowAnswerModal = () => {
    setShowAnswerModalOpen(false);
  };

  const handleConfirmShowAnswer = async () => {
    try {
      await showAnswer().unwrap();
      setShowAnswerModalOpen(false);
      showSnackbar("Answer revealed to all users and presenter", "success");
      setLastAnswerWasWrong(false);
    } catch (error: any) {
      setShowAnswerModalOpen(false);
      showSnackbar(error?.data?.message || "Failed to show answer", "error");
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
        "error",
      );
    }
  };

  const handlePassToSecondTeam = async () => {
    if (!currentQuestionId) {
      showSnackbar(
        "Cannot pass to second team - question ID not available",
        "error",
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
        "error",
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
        "error",
      );
    }
  };

  // Mark answer handlers (NEW for verbal answer flow)
  const handleMarkCorrect = async () => {
    try {
      await markAnswer({ isCorrect: true }).unwrap();
      showSnackbar("Answer marked as correct! Score updated.", "success");
      setLastAnswerWasWrong(false);
    } catch (error: any) {
      showSnackbar(error?.data?.message || "Failed to mark answer", "error");
    }
  };

  const handleMarkWrong = async () => {
    try {
      await markAnswer({ isCorrect: false }).unwrap();
      showSnackbar("Answer marked as wrong.", "error");
      setLastAnswerWasWrong(true);
    } catch (error: any) {
      showSnackbar(error?.data?.message || "Failed to mark answer", "error");
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

          {/* No-Buzzer Team Selection or Current Team Info */}
          {isNoBuzzerMode ? (
            <Paper
              variant="outlined"
              sx={{
                mx: 2,
                mt: 2,
                p: 2,
                borderRadius: 1,
                backgroundColor: "#fff9e6",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ mb: 1.5, fontWeight: 700, color: "#333" }}
              >
                No-Buzzer Question: Select Team
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel id="no-buzzer-team-label">Team</InputLabel>
                <Select
                  labelId="no-buzzer-team-label"
                  value={selectedTeamIdForNoBuzzer}
                  label="Team"
                  onChange={handleSelectTeamForNoBuzzer}
                  disabled={setTeamLoading}
                >
                  {availableTeams.map((team) => (
                    <MenuItem key={team._id} value={team._id}>
                      Team {team.teamNumber} - {team.teamName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>
          ) : (
            <RemoteTeamInfo
              currentAnsweringTeam={currentAnsweringTeam}
              buzzerTimestamp={
                currentAnsweringTeam
                  ? buzzerLeaderboard.find(
                      (entry) =>
                        entry.teamId === currentAnsweringTeam._id ||
                        (entry as any).teamId?._id === currentAnsweringTeam._id,
                    )?.timestamp
                  : undefined
              }
              buzzerRoundStartTime={gameState?.buzzerRoundStartTime}
            />
          )}
          {/* Buzzer Stats - Only show during buzzer round */}
          {gameStatus === "buzzer_round" && buzzerStats && (
            <RemoteBuzzerStats
              fastestTeam={buzzerStats.fastestTeam}
              teamsPressed={buzzerStats.teamsPressed}
              teamsRemaining={buzzerStats.teamsRemaining}
              totalTeams={buzzerStats.totalTeams}
              buzzerRoundStartTime={gameState?.buzzerRoundStartTime}
            />
          )}

          {/* Action Buttons */}
          <RemoteActionButtons
            gameStatus={gameStatus}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={totalQuestions}
            onNextQuestion={handleNextQuestion}
            onShowAnswer={handleOpenShowAnswerModal}
            onPauseGame={handlePauseGame}
            onResumeGame={handleResumeGame}
            onPassToSecondTeam={handlePassToSecondTeam}
            onAllowTopTeam={handleAllowTopTeam}
            onMarkCorrect={handleMarkCorrect}
            onMarkWrong={handleMarkWrong}
            canPassToSecondTeam={canPassToSecondTeam}
            hasFastestTeam={!!buzzerStats?.fastestTeam}
            isLoading={isAnyLoading}
            lastAnswerWasWrong={lastAnswerWasWrong}
          />
        </Box>
      </Box>

      <Dialog
        open={showAnswerModalOpen}
        onClose={handleCloseShowAnswerModal}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Show Answer?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#475569" }}>
            This will reveal the current question answer to all users and the
            presenter screen.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseShowAnswerModal} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmShowAnswer}
            variant="contained"
            sx={{
              backgroundColor: "#0D9488",
              "&:hover": { backgroundColor: "#0F766E" },
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

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
