import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useParams, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import { useFetchGameStateQuery } from "../services/gameStateApi";
import { useFetchBuzzerLeaderboardQuery } from "../services/buzzerApi";
import { api } from "../../../app/api";
import { resetBuzzer } from "../services/buzzerSlice";
import { clearResponseResult } from "../../question/services/questions.slice";
import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";

/**
 * GameStateRouter - Automatically navigates teams to the correct screen
 * based on the current game state (updated via WebSocket)
 */
const GameStateRouter = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { sessionId } = useParams<{ sessionId: string }>();

  // Fetch game state (will be kept in sync via WebSocket)
  const { data: gameStateData } = useFetchGameStateQuery();

  // Fetch buzzer leaderboard to check if current team has pressed
  const { data: buzzerData } = useFetchBuzzerLeaderboardQuery();

  // Get current team and game state from Redux
  const { team } = useAppSelector((state: RootState) => state.team);
  const { gameState } = useAppSelector((state: RootState) => state.gameState);

  // Use gameState from Redux (which is updated by WebSocket) or fallback to API data
  const currentGameState = gameState || gameStateData?.data?.gameState;

  const normalizeId = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      if (typeof value._id === "string") return value._id;
      if (value._id) return String(value._id);
      if (value.id) return String(value.id);
      return String(value);
    }
    return String(value);
  };

  // Track previous question index to detect question changes
  const previousQuestionIndexRef = useRef<number | null>(null);

  // Track previous navigation to prevent duplicate navigations
  const lastNavigationRef = useRef<string | null>(null);

  // Global force state for Answer Reveal
  const [isDelayingAnswer, setIsDelayingAnswer] = useState(false);
  const [answeredWrong, setAnsweredWrong] = useState(false);
  const [forceAnswerReveal, setForceAnswerReveal] = useState(false);

  // Invalidate caches and reset slices when question changes
  useEffect(() => {
    if (!currentGameState) return;

    const currentQuestionIndex = currentGameState.currentQuestionIndex;

    // If question changed, cleanup and invalidate all relevant caches
    if (
      previousQuestionIndexRef.current !== null &&
      previousQuestionIndexRef.current !== currentQuestionIndex
    ) {
      // console.log(
      //   `🧹 Question changed from ${previousQuestionIndexRef.current} to ${currentQuestionIndex}, cleaning up caches and slices`
      // );

      // Invalidate all relevant RTK Query caches to force refetch
      dispatch(
        api.util.invalidateTags([
          "BuzzerLeaderboard", // Clear buzzer queue data
          "Question", // Refetch current question
          "Team", // Refetch team data (score may have changed)
          "Leaderboard", // Refetch overall leaderboard
        ]),
      );

      // Reset Redux slices to clear stale state
      dispatch(resetBuzzer()); // Reset buzzer press state
      dispatch(clearResponseResult()); // Clear previous question response

      // Reset navigation tracking for new question
      lastNavigationRef.current = null;

      // Clear answer reveal delay and tracking for new question
      setIsDelayingAnswer(false);
      setAnsweredWrong(false);
      setForceAnswerReveal(false);
    }

    // Update the ref
    previousQuestionIndexRef.current = currentQuestionIndex;
  }, [currentGameState?.currentQuestionIndex, dispatch]);

  // Handle global Answer Reveal timing
  useEffect(() => {
    const handleAnswerMarkedCorrect = () => {
      // Wait 2 seconds (during which answering team sees NailedIt status card)
      setIsDelayingAnswer(true);
      setTimeout(() => {
        setIsDelayingAnswer(false);
      }, 2000);
    };

    const handleAnswerMarkedWrong = (data: any) => {
      // Wait 2 seconds (during which answering team sees CloseCall status card)
      setIsDelayingAnswer(true);

      // If it's this team, mark that we got it wrong so router stops forcing us to question page
      if (normalizeId(data?.teamId) === normalizeId(team?._id)) {
        setAnsweredWrong(true);
      }

      setTimeout(() => {
        setIsDelayingAnswer(false);
      }, 2000);
    };

    const handleShowAnswer = () => {
      setIsDelayingAnswer(false);
      setForceAnswerReveal(true);
    };

    const handleGameStateChanged = (data: any) => {
      if (data?.forceAnswerReveal) {
        setForceAnswerReveal(true);
      }
      if (data?.gameStatus === "buzzer_round") {
        setForceAnswerReveal(false);
      }
    };

    websocketService.on(
      Events.ANSWER_MARKED_CORRECT,
      handleAnswerMarkedCorrect,
    );
    websocketService.on(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
    websocketService.on(Events.SHOW_ANSWER, handleShowAnswer);
    websocketService.on(Events.GAME_STATE_CHANGED, handleGameStateChanged);

    return () => {
      websocketService.off(
        Events.ANSWER_MARKED_CORRECT,
        handleAnswerMarkedCorrect,
      );
      websocketService.off(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
      websocketService.off(Events.SHOW_ANSWER, handleShowAnswer);
      websocketService.off(Events.GAME_STATE_CHANGED, handleGameStateChanged);
    };
  }, [team?._id]);

  useEffect(() => {
    if (!currentGameState || !team?._id) return;

    const currentStatus = currentGameState.gameStatus;
    const currentAnsweringTeam = currentGameState.currentAnsweringTeam;
    const currentTeamId = normalizeId(team._id);

    // Check if current team is in buzzer queue
    const teamInBuzzerQueue = buzzerData?.data?.leaderboard?.some(
      (entry) => normalizeId(entry.teamId) === currentTeamId,
    );

    // console.log("🎮 Game State Router:", {
    //   status: currentStatus,
    //   currentAnsweringTeam,
    //   currentTeamId,
    //   teamInBuzzerQueue,
    //   currentPath: location.pathname,
    // });

    // Helper function to navigate only if different from last navigation
    const safeNavigate = (path: string) => {
      const fullPath = `/game/${sessionId}${path}`;
      if (
        lastNavigationRef.current !== fullPath &&
        location.pathname !== fullPath
      ) {
        lastNavigationRef.current = fullPath;
        navigate(fullPath);
      }
    };

    // Avoid navigating if we are currently delaying for a status card to show
    if (isDelayingAnswer) {
      return;
    }

    switch (currentStatus) {
      case "paused":
        // Game is paused - stay on current page (Overlay will show pause screen)
        // Optionally navigate to leaderboard if not already there
        safeNavigate("/leaderboard");
        break;

      case "buzzer_round":
        // Check if current team has pressed the buzzer
        if (teamInBuzzerQueue) {
          safeNavigate("/buzzer-leaderboard");
        } else {
          safeNavigate("/buzzer");
        }
        break;

      case "answering":
        // Check if this is a no-buzzer question
        const isNoBuzzerQuestion = (currentGameState as any)
          ?.isNoBuzzerQuestion;

        if (isNoBuzzerQuestion) {
          // For no-buzzer questions, everyone sees the question
          safeNavigate("/question");
        } else {
          // For buzzer questions, only answering team sees question
          const answeringTeamId = normalizeId(currentAnsweringTeam);

          // If this team was just marked wrong, keep them on CloseCall
          // until answer reveal is shown (IDLE state).
          if (answeringTeamId === currentTeamId || answeredWrong) {
            safeNavigate("/question");
          } else {
            safeNavigate("/buzzer-leaderboard");
          }
        }
        break;

      case "idle":
        if (forceAnswerReveal) {
          safeNavigate("/answer-reveal");
          break;
        }

        // Check if this is a no-buzzer question with no team selected yet
        if (
          (currentGameState as any)?.isNoBuzzerQuestion &&
          !normalizeId(currentGameState?.currentAnsweringTeam)
        ) {
          // For no-buzzer questions, show question page until admin selects a team
          safeNavigate("/question");
        } else {
          // Normal IDLE state - show answer reveal screen
          safeNavigate("/answer-reveal");
        }
        break;

      default:
        safeNavigate("/leaderboard");
    }
  }, [
    currentGameState,
    team,
    navigate,
    sessionId,
    buzzerData,
    isDelayingAnswer,
    answeredWrong,
    forceAnswerReveal,
  ]);

  // Render child routes
  return <Outlet />;
};

export default GameStateRouter;
