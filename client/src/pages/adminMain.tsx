import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
  useNavigate,
} from "react-router-dom";
import RemoteControl from "../features/admin/pages/RemoteControl";
import PresenterView from "../features/admin/pages/PresenterView";
import Box from "@mui/material/Box";
import { useLazyFetchAdminQuery } from "../features/admin/services/admin.Api";
import { useEffect, useState } from "react";
import DashboardPage from "../features/admin/pages/DshboardPage";
import AdminLogin from "../features/admin/pages/AdminLogin";
import QuestionLibraryPage from "../features/admin/pages/QuestionLibraryPage";
import AuthWrapper from "../components/auth/AuthWrapper";
import { useAppDispatch } from "../app/hooks";
import { setSessionId } from "../features/session/services/sessionSlice";
import { useAppSelector } from "../app/rootReducer";
import { RootState } from "../app/store";
import Loader from "../components/ui/Loader";
import { websocketService } from "../services/websocket/websocketService";
import { Events } from "../services/websocket/enums/Events";
import { clearAdmin } from "../features/admin/services/adminSlice";
import LeaderBoardPage from "../features/game/pages/LeaderBoard_Page";

const AdminMain = () => {
  const [FetchAdmin] = useLazyFetchAdminQuery();
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(
    (state: RootState) => state.admin.isAuthenticated,
  );
  const [authResolved, setAuthResolved] = useState(false);
  const isLoginRoute = location.pathname.endsWith("/login");

  useEffect(() => {
    dispatch(setSessionId(sessionId ?? ""));
  }, [dispatch, sessionId]);

  // Listen for session end event (super admin ended the session)
  useEffect(() => {
    const handleSessionEnded = (data: any) => {
      console.log("⚠️ Session ended by super admin:", data.message);
      // Clear admin auth state
      dispatch(clearAdmin());
      // Redirect to login with message
      navigate(`/admin/${sessionId}/login`, {
        state: {
          message: "Session has been ended. Please log in again.",
          severity: "warning",
        },
      });
    };

    console.log(
      "📡 Setting up SESSION_ENDED listener for admin. Event name:",
      Events.SESSION_ENDED,
    );
    websocketService.on(Events.SESSION_ENDED, handleSessionEnded);

    return () => {
      websocketService.off(Events.SESSION_ENDED, handleSessionEnded);
    };
  }, [dispatch, navigate, sessionId]);

  useEffect(() => {
    if (isLoginRoute || isAuthenticated || !sessionId) {
      setAuthResolved(true);
      return;
    }

    setAuthResolved(false);
    FetchAdmin({ sessionId })
      .unwrap()
      .catch(() => undefined)
      .finally(() => {
        setAuthResolved(true);
      });
  }, [FetchAdmin, isAuthenticated, isLoginRoute, sessionId]);

  if (!isLoginRoute && !authResolved) {
    return <Loader />;
  }

  return (
    <Box sx={{ maxWidth: "100%", minHeight: "100vh" }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<AdminLogin />} />

        {/* Protected Admin Routes */}
        <Route
          path="/"
          element={
            <AuthWrapper
              userType={"admin"}
              redirection={`/admin/${sessionId}/login`}
            />
          }
        >
          <Route path="/remote-control" element={<RemoteControl />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/leaderboard"
            element={<LeaderBoardPage navigationBase="admin" />}
          />
          <Route path="/presenter" element={<PresenterView />} />
          <Route path="/questions" element={<QuestionLibraryPage />} />
        </Route>
        <Route
          path="/*"
          element={<Navigate to={`/admin/${sessionId}/login`} />}
        />
      </Routes>
    </Box>
  );
};

export default AdminMain;
