import React, { useState, useEffect, useMemo } from "react";
import { formatQuestionScoring } from "../utils/scoring";
import {
  Box,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
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
  Switch,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import LockIcon from "@mui/icons-material/Lock";
import { useNavigate, useParams } from "react-router-dom";
import normalBg from "../../../assets/background/normal_bg.webp";
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
  useShowHint,
  useStartSpinRound,
  useTriggerSpinWheel,
  useSetQuestionSettings,
  useSetSpinHide,
  useSpinPass,
} from "../services/adminRemoteApi";
import {
  useFetchTeamDashboardQuery,
  useUpdateSessionQuestionsMutation,
} from "../services/admin.Api";
import {
  useFetchSessionQuery,
  useFetchSessionQuestionsStatusQuery,
} from "../../session/services/session.api";
import {
  useFetchGameStateQuery,
  useMarkAnswerMutation,
  useFetchAvailableCategoriesQuery,
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
import QuestionPreviewModal from "../components/QuestionPreviewModal";
import { QuestionBankItem } from "../types/interfaces";

const RemoteControl: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { session } = useAppSelector((state: RootState) => state.session);

  // State
  const [lastAnswerWasWrong, setLastAnswerWasWrong] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info"
  >("success");
  const [showAnswerModalOpen, setShowAnswerModalOpen] = useState(false);
  const [isAnswerShown, setIsAnswerShown] = useState(false);
  const [teamListModalType, setTeamListModalType] = useState<
    "pressed" | "remaining" | null
  >(null);
  const [buzzerStatsCache, setBuzzerStatsCache] = useState<any>(null);
  const [attemptedTeamIds, setAttemptedTeamIds] = useState<string[]>([]);
  const [questionPreviewOpen, setQuestionPreviewOpen] = useState(false);

  // Question list and drag-drop states
  const [questionsListOpen, setQuestionsListOpen] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [localQuestionsList, setLocalQuestionsList] = useState<any[]>([]);

  // Next question preview modal states
  const [nextQuestionPreviewOpen, setNextQuestionPreviewOpen] = useState(false);
  const [nextQuestionToggles, setNextQuestionToggles] = useState<{
    keepBuzzer: boolean;
    hideFromUsers: boolean;
  }>({ keepBuzzer: true, hideFromUsers: false });

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

  // Extract game state data
  const gameState = gameStateData?.data?.gameState;
  const currentQuestionIndex = gameState?.currentQuestionIndex ?? -1;
  const totalQuestions = session?.questions?.length || 0;
  const gameStatus = gameState?.gameStatus || "paused";
  const displayGameStatus =
    gameStatus === "buzzer_round" ? "Playing" : gameStatus;
  const displayQuestionNumber =
    totalQuestions > 0 ? Math.max(0, currentQuestionIndex + 1) : 0;

  // Action hooks
  const { pauseGame, isLoading: pauseLoading } = usePauseGame();
  const { resumeGame, isLoading: resumeLoading } = useResumeGame();
  const { nextQuestion, isLoading: nextLoading } = useNextQuestion();
  const { showAnswer, isLoading: showAnswerLoading } = useShowAnswer();
  const { passToSecondTeam, isLoading: passLoading } = usePassToSecondTeam();
  const { autoSelectFastestTeam } = useAutoSelectFastestTeam();
  const { setAnsweringTeam, isLoading: setTeamLoading } = useSetAnsweringTeam();
  const { showHint, isLoading: showHintLoading } = useShowHint();
  const { startSpinRound, isLoading: startSpinLoading } = useStartSpinRound();
  const { triggerSpinWheel, isLoading: triggerSpinLoading } = useTriggerSpinWheel();

  const { data: sessionQueryData } = useFetchSessionQuery();
  const gameMode =
    sessionQueryData?.data?.gameMode || session?.gameMode || "BUZZER_BATTLE";
  const isSpinWheelMode = gameMode === "SPIN_WHEEL";

  const { data: categoriesData, refetch: refetchCategories } =
    useFetchAvailableCategoriesQuery(undefined, { skip: !isSpinWheelMode });

  const [selectedSpinTeamId, setSelectedSpinTeamId] = useState("");
  const [selectedPassTeamId, setSelectedPassTeamId] = useState("");
  const { passToTeam, endTurn, isLoading: spinPassLoading } = useSpinPass();

  const [markAnswer, { isLoading: markAnswerLoading }] =
    useMarkAnswerMutation();
  const [updateSessionQuestions] = useUpdateSessionQuestionsMutation();
  // Per-session question toggles (never modify the shared library question)
  const { setQuestionSettings, isLoading: isSavingQuestionSettings } =
    useSetQuestionSettings();
  const { setSpinHide, isLoading: isSavingSpinHide } = useSetSpinHide();

  const [selectedTeamIdForNoBuzzer, setSelectedTeamIdForNoBuzzer] =
    useState("");
  const [hintConfirmOpen, setHintConfirmOpen] = useState(false);

  // Fetch session questions status list
  const { data: questionsStatusData } = useFetchSessionQuestionsStatusQuery(undefined, {
    skip: !sessionId,
  });

  useEffect(() => {
    if (questionsStatusData?.data) {
      setLocalQuestionsList(questionsStatusData.data);
    }
  }, [questionsStatusData]);

  // Next question preview calculation
  const nextQuestionItem = useMemo(() => {
    if (currentQuestionIndex + 1 >= 0 && currentQuestionIndex + 1 < localQuestionsList.length) {
      return localQuestionsList[currentQuestionIndex + 1];
    }
    return null;
  }, [currentQuestionIndex, localQuestionsList]);

  // Drag and drop handlers for manual reordering of pending questions
  const handleDragStart = (e: React.DragEvent, index: number) => {
    const item = localQuestionsList[index];
    if (item.status !== "Pending") {
      e.preventDefault();
      return;
    }
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;

    const targetItem = localQuestionsList[targetIndex];
    if (targetItem.status !== "Pending") return;

    const newList = [...localQuestionsList];
    const [draggedItem] = newList.splice(draggedItemIndex, 1);
    newList.splice(targetIndex, 0, draggedItem);

    setLocalQuestionsList(newList);
    setDraggedItemIndex(null);

    try {
      const questionIds = newList.map((q) => q._id);
      await updateSessionQuestions({ questions: questionIds }).unwrap();
      showSnackbar("Questions reordered successfully", "success");
    } catch (err: any) {
      showSnackbar(err?.data?.message || "Failed to reorder questions", "error");
      if (questionsStatusData?.data) {
        setLocalQuestionsList(questionsStatusData.data);
      }
    }
  };

  const isAnyLoading =
    pauseLoading ||
    resumeLoading ||
    nextLoading ||
    showAnswerLoading ||
    passLoading ||
    markAnswerLoading ||
    setTeamLoading ||
    showHintLoading ||
    startSpinLoading ||
    triggerSpinLoading;

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

  const pressedTeamIds = new Set(
    buzzerLeaderboard.map((entry: any) => String(entry.teamId)),
  );
  const pressedTeams = buzzerLeaderboard.map((entry: any, index: number) => ({
    id: String(entry.teamId),
    rank: index + 1,
    teamNumber: entry.teamNumber,
    teamName: entry.teamName,
  }));
  const currentAnsweringTeamRank = currentAnsweringTeam
    ? (() => {
        const index = buzzerLeaderboard.findIndex(
          (entry: any) =>
            String(entry.teamId) === String(currentAnsweringTeam._id) ||
            String((entry as any).teamId?._id) ===
              String(currentAnsweringTeam._id),
        );
        return index >= 0 ? index + 1 : undefined;
      })()
    : undefined;
  const remainingTeams = teams.filter((team) => !pressedTeamIds.has(team._id));

  // Clear cache and reset team selection when question changes
  useEffect(() => {
    setBuzzerStatsCache(null);
    setSelectedTeamIdForNoBuzzer("");
    setAttemptedTeamIds([]);
    setIsAnswerShown(false);
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
          "Answer was incorrect. You can pass to next team.",
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
      const deducted =
        typeof data?.pointsAwarded === "number" && data.pointsAwarded < 0
          ? ` ${data.pointsAwarded} points.`
          : "";
      showSnackbar(
        `Answer marked wrong.${deducted} You can pass to next team.`,
        "error",
      );
    };

    const handleGameStateChanged = (data: any) => {
      if (data.gameStatus === "buzzer_round") {
        setLastAnswerWasWrong(false); // Reset on new question
        setIsAnswerShown(false);
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

      if (data?.forceAnswerReveal) {
        setIsAnswerShown(true);
      }

      // Always refresh current question metadata on game state transitions.
      refetchCurrentQuestion();
    };

    const handleShowAnswerEvent = () => {
      setIsAnswerShown(true);
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

    const handleWheelSpinTriggered = () => {
      showSnackbar("🎡 Wheel is spinning...", "info");
    };

    const handleWheelLanded = (data: any) => {
      showSnackbar(`🎯 Wheel landed on: ${data.targetCategory || 'selected category'}!`, "success");
      if (refetchCategories) refetchCategories();
    };

    const handleCategoryExhausted = (data: any) => {
      showSnackbar(`Category '${data.category}' has been completed!`, "info");
      if (refetchCategories) refetchCategories();
    };

    websocketService.on(Events.ANSWER_SUBMITTED, handleAnswerSubmitted);
    websocketService.on(
      Events.ANSWER_MARKED_CORRECT,
      handleAnswerMarkedCorrect,
    );
    websocketService.on(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
    websocketService.on(Events.GAME_STATE_CHANGED, handleGameStateChanged);
    websocketService.on(Events.BUZZER_PRESSED, handleBuzzerPressed);
    websocketService.on(Events.SHOW_ANSWER, handleShowAnswerEvent);
    websocketService.on(Events.WHEEL_SPIN_TRIGGERED, handleWheelSpinTriggered);
    websocketService.on(Events.WHEEL_LANDED, handleWheelLanded);
    websocketService.on(Events.CATEGORY_EXHAUSTED, handleCategoryExhausted);

    return () => {
      websocketService.off(Events.ANSWER_SUBMITTED, handleAnswerSubmitted);
      websocketService.off(
        Events.ANSWER_MARKED_CORRECT,
        handleAnswerMarkedCorrect,
      );
      websocketService.off(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
      websocketService.off(Events.GAME_STATE_CHANGED, handleGameStateChanged);
      websocketService.off(Events.BUZZER_PRESSED, handleBuzzerPressed);
      websocketService.off(Events.SHOW_ANSWER, handleShowAnswerEvent);
      websocketService.off(Events.WHEEL_SPIN_TRIGGERED, handleWheelSpinTriggered);
      websocketService.off(Events.WHEEL_LANDED, handleWheelLanded);
      websocketService.off(Events.CATEGORY_EXHAUSTED, handleCategoryExhausted);
    };
  }, [gameStatus, refetchBuzzerStats, refetchCurrentQuestion, refetchCategories]);

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
      setIsAnswerShown(true);
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
    // If no next question exists, or we have already ended the game, call nextQuestion() directly
    if (currentQuestionIndex + 1 >= totalQuestions) {
      try {
        const result = await nextQuestion().unwrap();
        if (result.data.gameEnded) {
          showSnackbar("Game completed! All questions done.", "success");
        }
      } catch (error: any) {
        showSnackbar(
          error?.data?.message || "Failed to move to next question",
          "error",
        );
      }
      return;
    }

    // Set initial toggles of next question
    if (nextQuestionItem) {
      setNextQuestionToggles({
        keepBuzzer: nextQuestionItem.keepBuzzer !== false,
        hideFromUsers: nextQuestionItem.hideFromUsers === true,
      });
      setNextQuestionPreviewOpen(true);
    }
  };

  const handleConfirmNextQuestion = async () => {
    if (!nextQuestionItem) return;

    try {
      // Toggles are saved for THIS session only (server applies them to the
      // upcoming question before starting it); the library question is untouched.
      const result = await nextQuestion({
        keepBuzzer: nextQuestionToggles.keepBuzzer,
        hideFromUsers: nextQuestionToggles.hideFromUsers,
      }).unwrap();
      setNextQuestionPreviewOpen(false);

      if (result.data.gameEnded) {
        showSnackbar("Game completed! All questions done.", "success");
      } else {
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
      showSnackbar("Question passed to next team", "success");
      setLastAnswerWasWrong(false);
    } catch (error: any) {
      showSnackbar(
        error?.data?.message || "Failed to pass to next team",
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

  const handleConfirmShowHint = async () => {
    try {
      await showHint().unwrap();
      setHintConfirmOpen(false);
      showSnackbar("Hint revealed to the active team!", "success");
    } catch (error: any) {
      setHintConfirmOpen(false);
      showSnackbar(error?.data?.message || "Failed to show hint", "error");
    }
  };

  const handleStartSpinTurn = async () => {
    if (!selectedSpinTeamId) {
      showSnackbar("Please select a team to spin the wheel", "error");
      return;
    }
    try {
      await startSpinRound(selectedSpinTeamId, spinHideQuestion).unwrap();
      showSnackbar("Spin round started! Selected team can now spin.", "success");
      setLastAnswerWasWrong(false);
    } catch (error: any) {
      showSnackbar(error?.data?.message || "Failed to start spin turn", "error");
    }
  };

  const spinHideQuestion = Boolean(gameState?.spinHideQuestion);

  // Spin wheel pass phase: wrong team's captain is choosing the next team.
  const spinPassPicker = gameState?.spinPassPickerTeam;
  const isSpinPassPhase =
    isSpinWheelMode && gameStatus === "idle" && Boolean(spinPassPicker);
  const spinPassPickerId =
    typeof spinPassPicker === "object" ? spinPassPicker?._id : spinPassPicker;
  const spinPassPickerName =
    (typeof spinPassPicker === "object" && spinPassPicker?.teamName) ||
    teams.find((t) => t._id === spinPassPickerId)?.teamName ||
    "The team";
  const spinPassAttempted = new Set(
    (gameState?.teamsWhoAnsweredThisQuestion || []).map(String),
  );
  const spinPassEligibleTeams = teams.filter(
    (t) => !spinPassAttempted.has(String(t._id)),
  );

  const handleSpinPassToTeam = async () => {
    if (!selectedPassTeamId) return;
    try {
      await passToTeam(selectedPassTeamId).unwrap();
      setSelectedPassTeamId("");
      showSnackbar("Question passed to the selected team.", "success");
    } catch (error: any) {
      showSnackbar(error?.data?.message || "Failed to pass the question", "error");
    }
  };

  const handleSpinEndTurn = async () => {
    try {
      await endTurn().unwrap();
      setSelectedPassTeamId("");
      showSnackbar("Turn ended. Question returned to the pool.", "info");
    } catch (error: any) {
      showSnackbar(error?.data?.message || "Failed to end the turn", "error");
    }
  };
  const currentQuestionHidden =
    currentQuestionData?.data?.question?.hideFromUsers === true;

  // Spin wheel, before the spin: applies to whichever question the wheel lands on.
  const handleToggleSpinHide = async (hide: boolean) => {
    try {
      await setSpinHide(hide).unwrap();
    } catch (error: any) {
      showSnackbar(error?.data?.message || "Failed to update hide setting", "error");
    }
  };

  // Live toggle for the question currently on screen (this session only).
  const handleToggleCurrentQuestionHide = async (hide: boolean) => {
    if (!currentQuestionId) return;
    try {
      await setQuestionSettings(currentQuestionId, { hideFromUsers: hide }).unwrap();
      showSnackbar(
        hide ? "Question hidden from players." : "Question visible to players.",
        "info",
      );
    } catch (error: any) {
      showSnackbar(error?.data?.message || "Failed to update hide setting", "error");
    }
  };

  const handleTriggerSpin = async () => {
    try {
      await triggerSpinWheel(selectedSpinTeamId || undefined).unwrap();
      showSnackbar("Spin triggered!", "info");
    } catch (error: any) {
      showSnackbar(error?.data?.message || "Failed to trigger spin", "error");
    }
  };

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info" = "success",
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleOpenLeaderboard = () => {
    if (!sessionId) return;
    navigate(`/admin/${sessionId}/leaderboard`);
  };

  const previewQuestion = useMemo<QuestionBankItem | null>(() => {
    const question = currentQuestionData?.data?.question;
    if (!question) return null;

    return {
      _id: question._id,
      questionText: question.questionText,
      correctAnswer: question.correctAnswer,
      score: question.score,
      wrongPenalty: question.wrongPenalty,
      keepBuzzer: question.keepBuzzer,
      options: question.options || [],
      questionImage: question.questionImage,
      quetionVideo: question.quetionVideo,
      questionContent: question.questionContent,
      questionAssets: question.questionAssets,
      answerContent: question.answerContent,
      createdAt: String(question.createdAt),
      updatedAt: String(question.updatedAt),
    };
  }, [currentQuestionData]);

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
          // Use the dynamic viewport height where supported so mobile browser
          // toolbars don't hide the bottom of the remote.
          "@supports (height: 100dvh)": { height: "100dvh" },
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
            paddingBottom: "20px",
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
          <Box sx={{ p: 2, borderBottom: "1px solid #E2E8F0" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {session?.sessionName || "Session"}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {isSpinWheelMode ? (
                <Chip
                  label="🎡 Mode: Spin Wheel"
                  color="warning"
                  variant="filled"
                  sx={{ fontWeight: "bold" }}
                />
              ) : (
                <Chip
                  label="⚡ Mode: Buzzer Battle"
                  color="primary"
                  variant="filled"
                  sx={{ fontWeight: "bold" }}
                />
              )}
              <Chip
                label={`Status: ${displayGameStatus}`}
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<OpenInNewIcon />}
                label="Leaderboard"
                clickable
                onClick={handleOpenLeaderboard}
                color="secondary"
                variant="outlined"
              />
              {!isSpinWheelMode && (
                <Chip
                  label={`Question: ${displayQuestionNumber}/${totalQuestions}`}
                  variant="outlined"
                  clickable
                  onClick={() => setQuestionsListOpen(true)}
                />
              )}
              {isSpinWheelMode && gameState?.currentCategory && (
                <Chip
                  label={`Category: ${gameState.currentCategory}`}
                  color="secondary"
                  variant="filled"
                  sx={{ fontWeight: "bold" }}
                />
              )}
              {!isSpinWheelMode && (
                <Chip
                  label={`Buzzer: ${currentQuestionKeepBuzzer === false ? "Off" : "On"}`}
                  variant="outlined"
                  color={currentQuestionKeepBuzzer === false ? "warning" : "success"}
                />
              )}
              <Chip
                label="Question Preview"
                clickable
                onClick={() => setQuestionPreviewOpen(true)}
                variant="outlined"
                disabled={!previewQuestion}
              />
            </Box>
          </Box>

          {/* Spin Wheel Available Categories & Controls */}
          {isSpinWheelMode && (
            <Box
              sx={{
                mx: 2,
                mt: 2,
                p: 1.5,
                bgcolor: "rgba(245, 158, 11, 0.08)",
                borderRadius: "10px",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  sx={{ color: "#b45309" }}
                >
                  ACTIVE CATEGORIES ({categoriesData?.data?.categories?.length || 0})
                </Typography>
                <Typography variant="caption" sx={{ color: "#b45309" }}>
                  {categoriesData?.data?.remainingQuestions || 0} questions left
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                {(categoriesData?.data?.categories || []).map((cat: string) => {
                  const count = categoriesData?.data?.categoryCounts?.[cat] ?? 0;
                  const isCurrent = gameState?.currentCategory === cat;
                  return (
                    <Chip
                      key={cat}
                      label={`${cat} (${count})`}
                      size="small"
                      color={isCurrent ? "warning" : "default"}
                      variant={isCurrent ? "filled" : "outlined"}
                      sx={{ fontWeight: 600 }}
                    />
                  );
                })}
                {(categoriesData?.data?.categories || []).length === 0 && (
                  <Typography variant="caption" color="error">
                    All categories exhausted!
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {/* Spin Wheel Pass: wrong team's captain chooses the next team */}
          {isSpinPassPhase && (
            <Paper
              variant="outlined"
              sx={{
                mx: 2,
                mt: 2,
                p: 2,
                borderRadius: "12px",
                backgroundColor: "#fffdf5",
                borderColor: "#f59e0b",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ mb: 0.5, fontWeight: 700, color: "#92400e" }}
              >
                👉 {spinPassPickerName}'s captain is choosing the next team
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                Same question, one chance per team. You can pick on their behalf or
                end the turn (question goes back to the pool, answer stays hidden).
              </Typography>
              <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                <InputLabel id="spin-pass-team-label">Pick for them</InputLabel>
                <Select
                  labelId="spin-pass-team-label"
                  value={selectedPassTeamId}
                  label="Pick for them"
                  onChange={(e) => setSelectedPassTeamId(e.target.value)}
                  disabled={spinPassLoading}
                >
                  {spinPassEligibleTeams.map((team) => (
                    <MenuItem key={team._id} value={team._id}>
                      Team {team.teamNumber} - {team.teamName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={!selectedPassTeamId || spinPassLoading}
                  onClick={handleSpinPassToTeam}
                  sx={{
                    bgcolor: "#f59e0b",
                    fontWeight: 700,
                    "&:hover": { bgcolor: "#d97706" },
                  }}
                >
                  Pass to Team
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  disabled={spinPassLoading}
                  onClick={handleSpinEndTurn}
                  sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                >
                  End Turn
                </Button>
              </Box>
            </Paper>
          )}

          {/* Spin Wheel Turn Selector */}
          {isSpinWheelMode && gameStatus !== "answering" && !isSpinPassPhase && (
            <Paper
              variant="outlined"
              sx={{
                mx: 2,
                mt: 2,
                p: 2,
                borderRadius: "12px",
                backgroundColor: "#fffdf5",
                borderColor: "#f59e0b",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ mb: 1.5, fontWeight: 700, color: "#92400e" }}
              >
                🎡 Select Team to Spin Wheel
              </Typography>
              <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                <InputLabel id="spin-team-label">Team</InputLabel>
                <Select
                  labelId="spin-team-label"
                  value={selectedSpinTeamId}
                  label="Team"
                  onChange={(e) => setSelectedSpinTeamId(e.target.value)}
                  disabled={
                    gameStatus === "spin_round" &&
                    Boolean(gameState?.spinWheelState?.isSpinning)
                  }
                >
                  {teams.map((team) => (
                    <MenuItem key={team._id} value={team._id}>
                      Team {team.teamNumber} - {team.teamName} (Score:{" "}
                      {team.teamScore})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1.5,
                }}
              >
                <Box sx={{ pr: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ color: "#92400e" }}>
                    Hide Question From Players
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Applies to the question the wheel lands on. It will only show on
                    the Presenter screen.
                  </Typography>
                </Box>
                <Switch
                  checked={spinHideQuestion}
                  disabled={
                    isSavingSpinHide ||
                    Boolean(gameState?.spinWheelState?.isSpinning)
                  }
                  onChange={(e) => handleToggleSpinHide(e.target.checked)}
                  color="warning"
                />
              </Box>

              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={
                    !selectedSpinTeamId ||
                    startSpinLoading ||
                    (gameStatus === "spin_round" &&
                      Boolean(gameState?.spinWheelState?.isSpinning))
                  }
                  onClick={handleStartSpinTurn}
                  sx={{
                    bgcolor: "#f59e0b",
                    fontWeight: 700,
                    "&:hover": { bgcolor: "#d97706" },
                  }}
                >
                  {gameStatus === "spin_round"
                    ? "Re-assign Team"
                    : "Start Spin Turn"}
                </Button>

                {gameStatus === "spin_round" && (
                  <Button
                    variant="outlined"
                    color="warning"
                    disabled={
                      Boolean(gameState?.spinWheelState?.isSpinning) ||
                      triggerSpinLoading
                    }
                    onClick={handleTriggerSpin}
                    sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                  >
                    {gameState?.spinWheelState?.isSpinning
                      ? "Spinning..."
                      : "Spin Now"}
                  </Button>
                )}
              </Box>

              {gameStatus === "spin_round" && (
                <Box
                  sx={{
                    mt: 1.5,
                    p: 1,
                    bgcolor: "rgba(245, 158, 11, 0.12)",
                    borderRadius: "8px",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: "#92400e", fontWeight: 600 }}
                  >
                    {gameState?.spinWheelState?.isSpinning
                      ? "🎡 Wheel is spinning on screen..."
                      : `⏳ Waiting for Team Captain to spin the wheel on their mobile screen.`}
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          {/* Spin Wheel: live hide toggle for the landed question */}
          {isSpinWheelMode && gameStatus === "answering" && currentQuestionId && (
            <Paper
              variant="outlined"
              sx={{
                mx: 2,
                mt: 2,
                p: 2,
                borderRadius: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderColor: "#f59e0b",
                backgroundColor: "#fffdf5",
              }}
            >
              <Box sx={{ pr: 1 }}>
                <Typography variant="body2" fontWeight={600} sx={{ color: "#92400e" }}>
                  Hide Current Question From Players
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Updates players' screens instantly (this session only).
                </Typography>
              </Box>
              <Switch
                checked={currentQuestionHidden}
                disabled={isSavingQuestionSettings}
                onChange={(e) => handleToggleCurrentQuestionHide(e.target.checked)}
                color="warning"
              />
            </Paper>
          )}

          {/* Buzzer Battle / No-Buzzer Team Selection or Current Team Info */}
          {!isSpinWheelMode && isNoBuzzerMode ? (
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
          ) : (!isSpinWheelMode || gameStatus === "answering") ? (
            <RemoteTeamInfo
              currentAnsweringTeam={currentAnsweringTeam}
              answeringTeamRank={currentAnsweringTeamRank}
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
          ) : null}

          {/* Buzzer Stats - Only show during buzzer round in Buzzer Battle mode */}
          {!isSpinWheelMode && gameStatus === "buzzer_round" && buzzerStats && (
            <RemoteBuzzerStats
              fastestTeam={buzzerStats.fastestTeam}
              teamsPressed={buzzerStats.teamsPressed}
              teamsRemaining={buzzerStats.teamsRemaining}
              totalTeams={buzzerStats.totalTeams}
              buzzerRoundStartTime={gameState?.buzzerRoundStartTime}
              onPressedTeamsClick={() => setTeamListModalType("pressed")}
              onRemainingTeamsClick={() => setTeamListModalType("remaining")}
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
            onShowHint={() => setHintConfirmOpen(true)}
            hasHint={
              !!currentQuestionData?.data?.question?.hint?.text ||
              !!currentQuestionData?.data?.question?.hint?.media?.length
            }
            hintRevealed={!!gameState?.hintRevealed}
            canPassToSecondTeam={!isSpinWheelMode && canPassToSecondTeam}
            hasFastestTeam={!isSpinWheelMode && !!buzzerStats?.fastestTeam}
            isAnswerShown={isAnswerShown}
            isLoading={isAnyLoading}
            lastAnswerWasWrong={lastAnswerWasWrong}
            isSpinWheelMode={isSpinWheelMode}
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

      <Dialog
        open={teamListModalType !== null}
        onClose={() => setTeamListModalType(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {teamListModalType === "pressed"
            ? "Pressed Teams"
            : "Remaining Teams"}
        </DialogTitle>
        <DialogContent>
          {teamListModalType === "pressed" ? (
            pressedTeams.length ? (
              <List dense>
                {pressedTeams.map((team) => (
                  <ListItem key={team.id}>
                    <ListItemText
                      primary={`#${team.rank} - Team ${team.teamNumber}`}
                      secondary={team.teamName}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">
                No team has pressed yet.
              </Typography>
            )
          ) : remainingTeams.length ? (
            <List dense>
              {remainingTeams.map((team) => (
                <ListItem key={team._id}>
                  <ListItemText
                    primary={`Team ${team.teamNumber}`}
                    secondary={team.teamName}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">No remaining teams.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamListModalType(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <QuestionPreviewModal
        open={questionPreviewOpen}
        onClose={() => setQuestionPreviewOpen(false)}
        question={previewQuestion}
      />

      {/* Show Hint Confirmation Dialog */}
      <Dialog
        open={hintConfirmOpen}
        onClose={() => setHintConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          💡 Reveal Hint?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to reveal the hint to <strong>{currentAnsweringTeam?.teamName || "the active team"}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1, fontWeight: 700 }}>
            This will deduct {currentQuestionData?.data?.question?.hintPenalty || 0} penalty points from their score immediately.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHintConfirmOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmShowHint}
            color="warning"
            variant="contained"
            disabled={isAnyLoading}
          >
            Confirm & Deduct
          </Button>
        </DialogActions>
      </Dialog>

      {/* Questions Index List & Drag-and-Drop Reordering Dialog */}
      <Dialog
        open={questionsListOpen}
        onClose={() => setQuestionsListOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Questions Index List
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Drag and drop upcoming questions (Pending status) to reorder them manually. Completed or Skipped questions cannot be reordered.
          </Typography>
          <List sx={{ display: "flex", flexDirection: "column", gap: 1, p: 0 }}>
            {localQuestionsList.map((item, idx) => {
              const isDraggable = item.status === "Pending";
              const isCurrent = item.index === currentQuestionIndex;

              return (
                <ListItem
                  key={item._id}
                  draggable={isDraggable}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={() => setDraggedItemIndex(null)}
                  sx={{
                    border: "1px solid",
                    borderColor: isCurrent
                      ? "primary.main"
                      : draggedItemIndex === idx
                      ? "action.selected"
                      : "divider",
                    borderRadius: "8px",
                    backgroundColor: isCurrent
                      ? "rgba(59, 130, 246, 0.04)"
                      : isDraggable
                      ? "background.paper"
                      : "action.hover",
                    opacity: isDraggable ? 1 : 0.8,
                    cursor: isDraggable ? "grab" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    py: 1,
                    px: 1.5,
                    userSelect: "none",
                    transition: "all 0.2s ease",
                    "&:hover": isDraggable ? {
                      borderColor: "primary.light",
                      backgroundColor: "rgba(59, 130, 246, 0.02)",
                    } : {},
                  }}
                >
                  {isDraggable ? (
                    <DragIndicatorIcon color="action" sx={{ cursor: "grab" }} />
                  ) : (
                    <LockIcon color="disabled" fontSize="small" />
                  )}
                  
                  <Typography variant="body2" fontWeight={700} sx={{ minWidth: 20 }}>
                    {idx + 1}.
                  </Typography>

                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        fontWeight={isCurrent ? 700 : 500}
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "180px",
                        }}
                      >
                        {item.questionText || item.questionContent?.text || "No question text"}
                      </Typography>
                    }
                    secondary={`Score: ${formatQuestionScoring(item)} pts | Buzzer: ${item.keepBuzzer !== false ? "On" : "Off"}`}
                  />
                  
                  <Box>
                    <Chip
                      size="small"
                      label={item.status}
                      color={
                        item.status === "Completed"
                          ? "success"
                          : item.status === "Skipped"
                          ? "error"
                          : "default"
                      }
                      variant={isCurrent ? "filled" : "outlined"}
                    />
                  </Box>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestionsListOpen(false)} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Next Question Preview & Toggles Dialog */}
      <Dialog
        open={nextQuestionPreviewOpen}
        onClose={() => setNextQuestionPreviewOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Next Question Preview
        </DialogTitle>
        <DialogContent>
          {nextQuestionItem && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  QUESTION TEXT
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
                  {nextQuestionItem.questionText ||
                    nextQuestionItem.questionContent?.text ||
                    "No question text"}
                </Typography>
              </Box>

              {nextQuestionItem.options && nextQuestionItem.options.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    OPTIONS
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 0.5 }}>
                    {nextQuestionItem.options.map((opt: any, idx: number) => (
                      <Typography key={opt.optionId} variant="body2">
                        {String.fromCharCode(97 + idx)}) {opt.optionText}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}

              <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  CONTROLS
                </Typography>
                
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ maxWidth: "80%" }}>
                      <Typography variant="body2" fontWeight={600}>
                        Keep Buzzer
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Teams must buzz to answer. If disabled, admin selects team.
                      </Typography>
                    </Box>
                    <Switch
                      checked={nextQuestionToggles.keepBuzzer}
                      onChange={(e) =>
                        setNextQuestionToggles((prev) => ({
                          ...prev,
                          keepBuzzer: e.target.checked,
                        }))
                      }
                      color="primary"
                    />
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ maxWidth: "80%" }}>
                      <Typography variant="body2" fontWeight={600}>
                        Hide Question From Users
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Question text/media will only show on the Presenter screen
                        (this session only).
                        {!nextQuestionToggles.keepBuzzer &&
                          " Without buzzer, players see a waiting screen until you select a team."}
                      </Typography>
                    </Box>
                    <Switch
                      checked={nextQuestionToggles.hideFromUsers}
                      onChange={(e) =>
                        setNextQuestionToggles((prev) => ({
                          ...prev,
                          hideFromUsers: e.target.checked,
                        }))
                      }
                      color="primary"
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNextQuestionPreviewOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmNextQuestion}
            variant="contained"
            disabled={isAnyLoading || nextLoading}
            sx={{
              backgroundColor: "#3B82F6",
              "&:hover": { backgroundColor: "#2563EB" },
            }}
          >
            {nextLoading ? "Saving..." : "Confirm & Move"}
          </Button>
        </DialogActions>
      </Dialog>

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
