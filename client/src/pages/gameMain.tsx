import { Navigate, Route, Routes, useParams } from "react-router-dom";
import LoginPage from "../features/game/pages/login.Page";
import BuzzerRound from "../features/game/pages/Buzzer_Round";
import BuzzerLeaderboard from "../features/game/pages/BuzzerLeaderboard";
import QuestionRoundPage from "../features/game/pages/Question_Round_Page";
import LeaderBoardPage from "../features/game/pages/LeaderBoard_Page";
import Overlay from "../components/ui/Overlay";
import { useLazyFetchCurrentTeamQuery } from "../features/game/services/teamApi";
import { useEffect } from "react";
import { setSessionId } from "../features/session/services/sessionSlice";
import { useAppDispatch } from "../app/hooks";
import { RootState } from "../app/store";
import { useAppSelector } from "../app/rootReducer";
import Loader from "../components/ui/Loader";
import AuthWrapper from "../components/auth/AuthWrapper";
import GameStateRouter from "../features/game/components/GameStateRouter";

const GameMain = () => {
  const [FetchCurrentTeam] = useLazyFetchCurrentTeamQuery();
  const { isLoading } = useAppSelector((state: RootState) => state.team);
  const dispatch = useAppDispatch();
  const { sessionId } = useParams<{ sessionId: string }>();

  useEffect(() => {
    dispatch(setSessionId(sessionId ?? ""));
  }, [dispatch, sessionId]);

  useEffect(() => {
    FetchCurrentTeam();
  }, [FetchCurrentTeam]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        minHeight: window.innerHeight,
        background: "#FFFFFF",
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
          {/* Wrap protected routes with Overlay and GameStateRouter */}
          <Route
            element={
              <Overlay>
                <GameStateRouter />
              </Overlay>
            }
          >
            <Route path="/buzzer" element={<BuzzerRound />} />
            <Route path="/buzzer-leaderboard" element={<BuzzerLeaderboard />} />
            <Route path="/question" element={<QuestionRoundPage />} />
            <Route path="/leaderboard" element={<LeaderBoardPage />} />
          </Route>
          <Route path="/*" element={<Navigate to={`/game/${sessionId}/`} />} />
        </Route>
      </Routes>
    </div>
  );
};

export default GameMain;
