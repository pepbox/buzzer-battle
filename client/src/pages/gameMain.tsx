import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
  useNavigate,
} from "react-router-dom";
import LoginPage from "../features/game/pages/login.Page";
import BuzzerRound from "../features/game/pages/Buzzer_Round";
import BuzzerLeaderboard from "../features/game/pages/BuzzerLeaderboard";
import QuestionRoundPage from "../features/game/pages/Question_Round_Page";
import LeaderBoardPage from "../features/game/pages/LeaderBoard_Page";
import AnswerRevealPage from "../features/game/pages/AnswerRevealPage";
import GameLayout from "../features/game/components/GameLayout";
import { useEffect, useState } from "react";
import { setSessionId } from "../features/session/services/sessionSlice";
import { useAppDispatch } from "../app/hooks";
import { RootState } from "../app/store";
import { useAppSelector } from "../app/rootReducer";
import Loader from "../components/ui/Loader";
import AuthWrapper from "../components/auth/AuthWrapper";
import { useLazyFetchCurrentTeamQuery } from "../features/game/services/teamApi";
import { useLazyFetchGameStateQuery } from "../features/game/services/gameStateApi";
import { websocketService } from "../services/websocket/websocketService";
import { Events } from "../services/websocket/enums/Events";
import { clearTeam } from "../features/game/services/teamSlice";

const GameMain = () => {
  const [fetchCurrentTeam] = useLazyFetchCurrentTeamQuery();
  const [fetchGameState] = useLazyFetchGameStateQuery();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading, isAuthenticated } = useAppSelector(
    (state: RootState) => state.team,
  );
  const dispatch = useAppDispatch();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [authResolved, setAuthResolved] = useState(false);
  const [gameStateLoaded, setGameStateLoaded] = useState(false);
  const isLoginRoute = location.pathname === `/game/${sessionId}/`;

  useEffect(() => {
    dispatch(setSessionId(sessionId ?? ""));
  }, [dispatch, sessionId]);

  // Listen for session end event (super admin ended the session)
  useEffect(() => {
    const handleSessionEnded = (data: any) => {
      console.log("⚠️ Session ended by super admin:", data.message);
      // Clear team auth state
      dispatch(clearTeam());
      // Redirect to login with message
      navigate(`/game/${sessionId}/`, {
        state: {
          message: "Session has been ended. Please log in again.",
          severity: "warning",
        },
      });
    };

    console.log(
      "📡 Setting up SESSION_ENDED listener for team. Event name:",
      Events.SESSION_ENDED,
    );
    websocketService.on(Events.SESSION_ENDED, handleSessionEnded);

    return () => {
      websocketService.off(Events.SESSION_ENDED, handleSessionEnded);
    };
  }, [dispatch, navigate, sessionId]);

  useEffect(() => {
    if (!sessionId || isAuthenticated || isLoginRoute) {
      setAuthResolved(true);
      setGameStateLoaded(true);
      return;
    }

    setAuthResolved(false);
    setGameStateLoaded(false);

    // Fetch current team to restore auth on refresh
    fetchCurrentTeam({ sessionId })
      .unwrap()
      .then(() => {
        setAuthResolved(true);
        // After auth is resolved, fetch game state so GameStateRouter knows which screen to show
        return fetchGameState();
      })
      .catch(() => {
        setAuthResolved(true); // Auth failed, but still mark as resolved so user can login
      })
      .finally(() => {
        setGameStateLoaded(true);
      });
  }, [
    fetchCurrentTeam,
    fetchGameState,
    isAuthenticated,
    isLoginRoute,
    sessionId,
  ]);

  if (isLoading || (!isLoginRoute && (!authResolved || !gameStateLoaded))) {
    return <Loader />;
  }

  return (
    <div
      style={{
        maxWidth: "480px",
        width: "100%",
        margin: "0 auto",
        height: "100vh",
        minHeight: "100dvh", // Modern browsers prefer dvh
        background: "#FFFFFF",
        position: "relative",
        boxShadow: "0px 0px 20px rgba(0,0,0,0.1)",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Routes>
        {/* Public Route - Login Page */}
        <Route path="/" element={<LoginPage />} />

        {/* Protected Routes - Require Authentication */}
        <Route
          element={
            <AuthWrapper userType="team" redirection={`/game/${sessionId}/`} />
          }
        >
          <Route
            element={
              <GameLayout />
            }
          >
            <Route path="/buzzer" element={<BuzzerRound />} />
            <Route path="/buzzer-leaderboard" element={<BuzzerLeaderboard />} />
            <Route path="/question" element={<QuestionRoundPage />} />
            <Route path="/leaderboard" element={<LeaderBoardPage />} />
            <Route path="/answer-reveal" element={<AnswerRevealPage />} />
          </Route>
          <Route path="/*" element={<Navigate to={`/game/${sessionId}/`} />} />
        </Route>
      </Routes>
    </div>
  );
};

export default GameMain;
