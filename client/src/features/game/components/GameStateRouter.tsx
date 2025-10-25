import { useEffect, useRef } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import { useFetchGameStateQuery } from "../services/gameStateApi";
import { useFetchBuzzerLeaderboardQuery } from "../services/buzzerApi";
import { api } from "../../../app/api";
import { resetBuzzer } from "../services/buzzerSlice";
import { clearResponseResult } from "../../question/services/questions.slice";

/**
 * GameStateRouter - Automatically navigates teams to the correct screen
 * based on the current game state (updated via WebSocket)
 */
const GameStateRouter = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
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

  // Track previous question index to detect question changes
  const previousQuestionIndexRef = useRef<number | null>(null);

  // Invalidate caches and reset slices when question changes
  useEffect(() => {
    if (!currentGameState) return;

    const currentQuestionIndex = currentGameState.currentQuestionIndex;

    // If question changed, cleanup and invalidate all relevant caches
    if (
      previousQuestionIndexRef.current !== null &&
      previousQuestionIndexRef.current !== currentQuestionIndex
    ) {
      console.log(
        `🧹 Question changed from ${previousQuestionIndexRef.current} to ${currentQuestionIndex}, cleaning up caches and slices`
      );
      
      // Invalidate all relevant RTK Query caches to force refetch
      dispatch(api.util.invalidateTags([
        "BuzzerLeaderboard",  // Clear buzzer queue data
        "Question",           // Refetch current question
        "Team",               // Refetch team data (score may have changed)
        "Leaderboard",        // Refetch overall leaderboard
      ]));

      // Reset Redux slices to clear stale state
      dispatch(resetBuzzer());              // Reset buzzer press state
      dispatch(clearResponseResult());      // Clear previous question response
    }

    // Update the ref
    previousQuestionIndexRef.current = currentQuestionIndex;
  }, [currentGameState?.currentQuestionIndex, dispatch]);

  useEffect(() => {
    if (!currentGameState || !team?._id) return;

    const currentStatus = currentGameState.gameStatus;
    const currentAnsweringTeam = currentGameState.currentAnsweringTeam;
    const currentTeamId = team._id;

    // Check if current team is in buzzer queue
    const teamInBuzzerQueue = buzzerData?.data?.leaderboard?.some(
      (entry) => entry.teamId === currentTeamId
    );

    console.log("🎮 Game State Router:", {
      status: currentStatus,
      currentAnsweringTeam,
      currentTeamId,
      teamInBuzzerQueue,
    });

    // Handle navigation based on game status
    switch (currentStatus) {
      case "paused":
        // Game is paused - stay on current page (Overlay will show pause screen)
        console.log("⏸️ Game is paused - staying on current page");
        // Optionally navigate to leaderboard if not already there
        // navigate(`/game/${sessionId}/leaderboard`);
        break;

      case "buzzer_round":
        // Check if current team has pressed the buzzer
        if (teamInBuzzerQueue) {
          // Team has pressed buzzer - show buzzer leaderboard with their position
          console.log(
            "🔔 Team has pressed buzzer - navigating to buzzer leaderboard"
          );
          navigate(`/game/${sessionId}/buzzer-leaderboard`);
        } else {
          // Team hasn't pressed buzzer yet - show buzzer button
          console.log("🔔 Buzzer round active - navigating to buzzer page");
          navigate(`/game/${sessionId}/buzzer`);
        }
        break;

      case "answering":
        // Check if current team is the answering team
        const answeringTeamId =
          typeof currentAnsweringTeam === "string"
            ? currentAnsweringTeam
            : currentAnsweringTeam?._id;

        if (answeringTeamId === currentTeamId) {
          // Current team should answer the question
          console.log(
            "✍️ Your team is answering - navigating to question page"
          );
          navigate(`/game/${sessionId}/question`);
        } else {
          // Other teams should view the buzzer leaderboard with answering team indicator
          console.log(
            "👀 Another team is answering - navigating to buzzer leaderboard"
          );
          navigate(`/game/${sessionId}/buzzer-leaderboard`);
        }
        break;

      case "idle":
        // IDLE state - show results then redirect to leaderboard
        console.log("📊 IDLE state - navigating to leaderboard");
        navigate(`/game/${sessionId}/leaderboard`);
        break;

      default:
        console.log("❓ Unknown game status:", currentStatus);
        // Default to leaderboard for unknown states
        navigate(`/game/${sessionId}/leaderboard`);
    }
  }, [currentGameState, team, navigate, sessionId, buzzerData]);

  // Render child routes
  return <Outlet />;
};

export default GameStateRouter;
