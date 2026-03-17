import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import RemoteControl from "../features/admin/pages/RemoteControl";
import PresenterView from "../features/admin/pages/PresenterView";
import Box from "@mui/material/Box";
import { useLazyFetchAdminQuery } from "../features/admin/services/admin.Api";
import { useEffect, useState } from "react";
import DashboardPage from "../features/admin/pages/DshboardPage";
import AdminLogin from "../features/admin/pages/AdminLogin";
import AuthWrapper from "../components/auth/AuthWrapper";
import { useAppDispatch } from "../app/hooks";
import { setSessionId } from "../features/session/services/sessionSlice";
import { useAppSelector } from "../app/rootReducer";
import { RootState } from "../app/store";
import Loader from "../components/ui/Loader";

const AdminMain = () => {
  const [FetchAdmin] = useLazyFetchAdminQuery();
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(
    (state: RootState) => state.admin.isAuthenticated,
  );
  const [authResolved, setAuthResolved] = useState(false);
  const isLoginRoute = location.pathname.endsWith("/login");

  useEffect(() => {
    dispatch(setSessionId(sessionId ?? ""));
  }, [dispatch, sessionId]);

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
          <Route path="/presenter" element={<PresenterView />} />
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
