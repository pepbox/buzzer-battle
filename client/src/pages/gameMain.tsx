import { Route, Routes } from "react-router-dom";
import LoginPage from "../features/game/pages/login.Page";

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
        {/* <Route path="/capture" element={<CaptureScreen />} /> */}
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
