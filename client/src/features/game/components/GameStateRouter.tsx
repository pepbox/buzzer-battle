import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useParams, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import { useFetchGameStateQuery } from "../services/gameStateApi";
import { useFetchBuzzerLeaderboardQuery } from "../services/buzzerApi";
import { useFetchSessionQuery } from "../../session/services/session.api";
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

  // Fetch current session to check gameMode
  const { data: sessionData } = useFetchSessionQuery();
  const { session } = useAppSelector((state: RootState) => state.session);

  // Get current team and game state from Redux
  const { team } = useAppSelector((state: RootState) => state.team);
  const { gameState } = useAppSelector((state: RootState) => state.gameState);

  // Use gameState from Redux (which is updated by WebSocket) or fallback to API data
  const currentGameState = gameState || gameStateData?.data?.gameState;

  const gameMode =
    sessionData?.data?.gameMode ||
    session?.gameMode ||
    (currentGameState as any)?.gameMode ||
    (gameStateData?.data as any)?.gameMode;

  // The session's gameMode is authoritative. Only fall back to game-state hints when it
  // hasn't loaded yet. Note: `spinWheelState` always exists on the game state (Mongoose
  // sub-document defaults), so its mere presence must NOT be treated as spin-wheel mode.
  const isSpinWheel = gameMode
    ? gameMode === "SPIN_WHEEL"
    : Boolean(currentGameState?.currentCategory) ||
      Boolean((currentGameState as any)?.spinWheelState?.selectedTeamId);

  // Live ref so long-lived socket handlers see the current mode.
  const isSpinWheelRef = useRef(isSpinWheel);
  isSpinWheelRef.current = isSpinWheel;

  const normalizeId = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string") return value.trim();
    if (typeof value === "object") {
      if (typeof value._id === "string") return value._id.trim();
      if (value._id) return String(value._id).trim();
      if (typeof value.id === "string") return value.id.trim();
      if (value.id) return String(value.id).trim();
      if (typeof value.teamId === "string") return value.teamId.trim();
      if (value.teamId) return String(value.teamId).trim();
      if (value.toString && typeof value.toString === "function") {
        const str = value.toString();
        if (str !== "[object Object]") return str.trim();
      }
    }
    return String(value).trim();
  };

  const isSameTeam = (id1: any, id2: any): boolean => {
    const norm1 = normalizeId(id1);
    const norm2 = normalizeId(id2);
    return Boolean(norm1 && norm2 && norm1 === norm2);
  };

  // Keep live reference to team to avoid stale closures in socket events
  const teamRef = useRef(team);
  teamRef.current = team;

  // Track previous question index to detect question changes
  const previousQuestionIndexRef = useRef<number | null>(null);

  // Last navigation issued by the router (target + the location key it was
  // issued from) so we don't push the same route twice before the location
  // updates. Pages may also navigate on their own; the guard is keyed on the
  // current location so the router always converges on the right screen.
  const lastNavigationRef = useRef<{ to: string; fromKey: string } | null>(
    null,
  );

  // Timer that ends the 4.5s result-card delay after a mark.
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startAnswerDelay = () => {
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    setIsDelayingAnswer(true);
    delayTimerRef.current = setTimeout(() => {
      delayTimerRef.current = null;
      setIsDelayingAnswer(false);
    }, 4500);
  };
  const cancelAnswerDelay = () => {
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    setIsDelayingAnswer(false);
  };
  useEffect(
    () => () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    },
    [],
  );

  // Global force state for Answer Reveal
  const [isDelayingAnswer, setIsDelayingAnswer] = useState(false);
  const [answeredWrong, setAnsweredWrong] = useState(false);
  const [wasAnswerMarkedCorrect, setWasAnswerMarkedCorrect] = useState<boolean>(
    () => {
      if (typeof window !== "undefined" && sessionId) {
        return (
          sessionStorage.getItem(`revealedAnswerForMe_${sessionId}`) === "true"
        );
      }
      return false;
    },
  );
  const [forceAnswerReveal, setForceAnswerReveal] = useState(false);
  const [isGameEnded, setIsGameEnded] = useState(false);

  // Sync state if sessionId changes
  useEffect(() => {
    if (sessionId) {
      const saved = sessionStorage.getItem(`revealedAnswerForMe_${sessionId}`);
      setWasAnswerMarkedCorrect(saved === "true");
    }
  }, [sessionId]);

  // Invalidate caches and reset slices when question changes
  useEffect(() => {
    if (!currentGameState) return;

    const currentQuestionIndex = currentGameState.currentQuestionIndex;

    // If question changed, cleanup and invalidate all relevant caches
    if (
      previousQuestionIndexRef.current !== null &&
      previousQuestionIndexRef.current !== currentQuestionIndex
    ) {
      // Invalidate all relevant RTK Query caches to force refetch
      dispatch(
        api.util.invalidateTags([
          "BuzzerLeaderboard", // Clear buzzer queue data
          "Question", // Refetch current question
          "Team", // Refetch team data (score may have changed)
          "Leaderboard", // Refetch overall leaderboard
        ]),
      );

      // Instantly clear the buzzer leaderboard cache to prevent the previous question's
      // buzzer time from flashing on screen for a split second before the new fetch completes
      dispatch(
        api.util.updateQueryData(
          "fetchBuzzerLeaderboard" as never,
          undefined as never,
          (draft: any) => {
            if (draft?.data?.leaderboard) {
              draft.data.leaderboard = [];
            }
          }
        )
      );

      // Clear the cached current question immediately so the previous question's
      // text/assets do not flash on screen while the new question request is in flight.
      dispatch(
        api.util.updateQueryData(
          "fetchCurrentQuestion" as never,
          undefined as never,
          (draft: any) => {
            if (draft?.data) {
              draft.data.question = undefined;
              draft.data.currentQuestionIndex = -1;
            }
          }
        )
      );

      // Reset Redux slices to clear stale state
      dispatch(resetBuzzer()); // Reset buzzer press state
      dispatch(clearResponseResult()); // Clear previous question response

      // Reset navigation tracking for new question
      lastNavigationRef.current = null;

      // Clear answer reveal delay and tracking for new question
      cancelAnswerDelay();
      setAnsweredWrong(false);
      setWasAnswerMarkedCorrect(false);
      setForceAnswerReveal(false);
      if (sessionId) {
        sessionStorage.removeItem(`revealedAnswerForMe_${sessionId}`);
        sessionStorage.removeItem(`lastCorrectTeam_${sessionId}`);
      }

      // Clean up session storage for old questions
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.startsWith("answerStatus_") || key.startsWith("answerResult_"))) {
            // If the key doesn't belong to the NEW question index, remove it
            if (!key.endsWith(`_${currentQuestionIndex}`)) {
              keysToRemove.push(key);
            }
          }
        }
        keysToRemove.forEach(k => sessionStorage.removeItem(k));
      } catch (e) {
        console.error("Error cleaning up sessionStorage", e);
      }
    }

    // Update the ref
    previousQuestionIndexRef.current = currentQuestionIndex;
  }, [currentGameState?.currentQuestionIndex, dispatch, sessionId]);

  // Handle global Answer Reveal timing
  useEffect(() => {
    const handleAnswerMarkedCorrect = (data: any) => {
      const myId = teamRef.current?._id || (teamRef.current as any)?.id;
      const isMyTeam = isSameTeam(data?.teamId, myId);
      console.log("🎯 Router handleAnswerMarkedCorrect:", {
        dataTeamId: data?.teamId,
        myId,
        isMyTeam,
      });

      // Buzzer Battle: once any team answers correctly, EVERY team sees the correct
      // answer (the answering team after its "Nailed it" card). Spin Wheel keeps its
      // own flow (everyone stays on the question screen between turns), so there only
      // the answering team is sent to the reveal.
      const showRevealToMe = isMyTeam || !isSpinWheelRef.current;
      if (sessionId) {
        if (data?.teamName) {
          sessionStorage.setItem(
            `lastCorrectTeam_${sessionId}`,
            JSON.stringify({ teamName: data.teamName, isMyTeam }),
          );
        }
      }
      if (showRevealToMe) {
        setWasAnswerMarkedCorrect(true);
        if (sessionId) {
          sessionStorage.setItem(`revealedAnswerForMe_${sessionId}`, "true");
        }
      } else {
        setWasAnswerMarkedCorrect(false);
        if (sessionId) {
          sessionStorage.removeItem(`revealedAnswerForMe_${sessionId}`);
        }
      }
      setAnsweredWrong(false);
      // Wait 4.5 seconds (during which answering team sees NailedIt status card)
      startAnswerDelay();
    };

    const handleAnswerMarkedWrong = (data: any) => {
      // Do not show answer reveal on wrong answer
      setWasAnswerMarkedCorrect(false);
      if (sessionId) {
        sessionStorage.removeItem(`revealedAnswerForMe_${sessionId}`);
      }
      // Wait 4.5 seconds (during which answering team sees CloseCall status card)
      startAnswerDelay();

      const myId = teamRef.current?._id || (teamRef.current as any)?.id;
      if (isSameTeam(data?.teamId, myId)) {
        setAnsweredWrong(true);

        // Also save to sessionStorage immediately if we have question index
        const qIndex = currentGameState?.currentQuestionIndex;
        if (qIndex !== undefined && sessionId) {
          sessionStorage.setItem(`answerStatus_${sessionId}_${qIndex}`, JSON.stringify("status"));
          sessionStorage.setItem(`answerResult_${sessionId}_${qIndex}`, JSON.stringify({
            isCorrect: false,
            pointsAwarded: 0
          }));
        }
      }
    };

    const handleShowAnswer = () => {
      cancelAnswerDelay();
      setForceAnswerReveal(true);
    };

    const handleGameStateChanged = (data: any) => {
      if (data?.forceAnswerReveal) {
        setForceAnswerReveal(true);
      }
      if (data?.gameEnded) {
        setIsGameEnded(true);
      }
      if (data?.gameStatus === "buzzer_round" || data?.gameStatus === "spin_round") {
        // A new round/turn started: the result card is over, route immediately
        // (pages no longer navigate on their own for this transition).
        cancelAnswerDelay();
        setForceAnswerReveal(false);
        setWasAnswerMarkedCorrect(false);
        setAnsweredWrong(false);
        setIsGameEnded(false);
        if (sessionId) {
          sessionStorage.removeItem(`revealedAnswerForMe_${sessionId}`);
          sessionStorage.removeItem(`lastCorrectTeam_${sessionId}`);
        }
      }
    };

    const handleGameEnded = () => {
      setIsGameEnded(true);
    };

    websocketService.on(
      Events.ANSWER_MARKED_CORRECT,
      handleAnswerMarkedCorrect,
    );
    websocketService.on(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
    websocketService.on(Events.SHOW_ANSWER, handleShowAnswer);
    websocketService.on(Events.GAME_STATE_CHANGED, handleGameStateChanged);
    websocketService.on(Events.GAME_ENDED, handleGameEnded);

    return () => {
      websocketService.off(
        Events.ANSWER_MARKED_CORRECT,
        handleAnswerMarkedCorrect,
      );
      websocketService.off(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
      websocketService.off(Events.SHOW_ANSWER, handleShowAnswer);
      websocketService.off(Events.GAME_STATE_CHANGED, handleGameStateChanged);
      websocketService.off(Events.GAME_ENDED, handleGameEnded);
    };
  }, [sessionId, currentGameState?.currentQuestionIndex]);

  useEffect(() => {
    if (!currentGameState || !team?._id) return;

    const currentStatus = currentGameState.gameStatus;
    const currentAnsweringTeam = currentGameState.currentAnsweringTeam;
    const currentTeamId = normalizeId(team._id);

    // Detect if we are currently handling a question transition render cycle
    const isTransitioning = 
      previousQuestionIndexRef.current !== null && 
      previousQuestionIndexRef.current !== currentGameState.currentQuestionIndex;

    // Check if current team is in buzzer queue. 
    // We intentionally force this to false if transitioning to prevent the router 
    // from acting on stale data from the previous question before the cache clears.
    const teamInBuzzerQueue = !isTransitioning && buzzerData?.data?.leaderboard?.some(
      (entry) => isSameTeam(entry.teamId, currentTeamId),
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
      if (location.pathname === fullPath) return;
      const last = lastNavigationRef.current;
      // Same navigation already issued from this exact location: still pending.
      if (last && last.to === fullPath && last.fromKey === location.key) return;
      lastNavigationRef.current = { to: fullPath, fromKey: location.key };
      navigate(fullPath);
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

      case "spin_round":
        safeNavigate("/spin-wheel");
        break;

      case "answering": {
        const isNoBuzzerQuestion = (currentGameState as any)
          ?.isNoBuzzerQuestion;

        if (isSpinWheel || isNoBuzzerQuestion) {
          // For spin wheel and no-buzzer questions, show question to all
          safeNavigate("/question");
        } else {
          // For buzzer questions, only answering team sees question
          const answeringTeamId = normalizeId(currentAnsweringTeam);

          // Only keep the team on the question page if THEY are still the one answering.
          // If the admin passes to another team (answeringTeamId !== currentTeamId), 
          // all other teams should go back to the buzzer leaderboard.
          if (isSameTeam(answeringTeamId, currentTeamId)) {
            safeNavigate("/question");
          } else {
            safeNavigate("/buzzer-leaderboard");
          }
        }
        break;
      }

      case "idle":
        // If game explicitly ended, show leaderboard
        if (isGameEnded || (currentGameState as any)?.gameEnded) {
          safeNavigate("/leaderboard");
          break;
        }

        // On a correct answer, show the answer reveal (to all teams in Buzzer Battle;
        // only to the answering team in Spin Wheel — see handleAnswerMarkedCorrect).
        if (wasAnswerMarkedCorrect) {
          safeNavigate("/answer-reveal");
          break;
        }

        // Only show answer reveal to everyone if explicitly forced by host (Show Answer)
        if (forceAnswerReveal) {
          safeNavigate("/answer-reveal");
          break;
        }

        // For Spin Wheel mode: stay on the question screen between turns!
        // Do NOT navigate to leaderboard when turn ends or answer is marked.
        if (isSpinWheel) {
          safeNavigate("/question");
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
          // Normal IDLE state after wrong answer or turn end - show leaderboard, NEVER reveal answer!
          safeNavigate("/leaderboard");
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
    wasAnswerMarkedCorrect,
    forceAnswerReveal,
    isGameEnded,
    isSpinWheel,
    location.pathname,
    location.key,
  ]);

  // Render child routes
  return <Outlet />;
};

export default GameStateRouter;
