import { Route, Routes } from "react-router-dom";
import LoginPage from "../features/game/pages/login.Page";
import BuzzerRound from "../features/game/pages/Buzzer_Round";
import BuzzerLeaderboard from "../features/game/pages/BuzzerLeaderboard";
import QuestionRoundPage from "../features/game/pages/Question_Round_Page";
import LeaderBoardPage from "../features/game/pages/LeaderBoard_Page";
import Overlay from "../components/ui/Overlay";

const GameMain = () => {
  // const [fetchUser] = useLazyFetchPlayerQuery();
  // const { isLoading, isAuthenticated } = useAppSelector(
  //   (state: RootState) => state.player
  // );
  // const dispatch = useAppDispatch();
  // const sessionId = useParams<{ sessionId: string }>().sessionId;

  // useEffect(() => {
  //   dispatch(setSessionId(sessionId ?? ""));
  // }, [dispatch, sessionId]);

  // useEffect(() => {
  //   fetchUser({});
  // }, [isAuthenticated]);

  // if (isLoading) {
  //   return <Loader />;
  // }
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
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <Overlay>
              <Routes>
                <Route path="/buzzer" element={<BuzzerRound />} />
                <Route path="/buzzer-leaderboard" element={<BuzzerLeaderboard />} />
                <Route path="/question" element={<QuestionRoundPage />} />
                <Route path="/leaderboard" element={<LeaderBoardPage />} />
              </Routes>
            </Overlay>
          }
        />

        {/* <Route
          path="/"
          element={
            <AuthWrapper
              userType={"player"}
              redirection={`/game/${sessionId}`}
            />
          }
        >
          <Route path="/intro" element={<IntroScreen />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route
            path="/questionnaire/:questionIndex"
            element={<Questionnaire />}
          />
          <Route path="/waiting" element={<WaitingAreaScreen />} />
          <Route path="/arena" element={<GameArenaPage />} />
          <Route path="/completion" element={<GameCompletionPage />} />
        </Route> */}
      </Routes>
    </div>
  );
};

export default GameMain;
