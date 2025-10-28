import { Navigate, Route, Routes, useParams } from "react-router-dom";
import RemoteControl from "../features/admin/Pages/RemoteControl";
import PresenterView from "../features/admin/Pages/PresenterView";
import Box from "@mui/material/Box";
import { useLazyFetchAdminQuery } from "../features/admin/services/admin.Api";
import { useEffect } from "react";
import DashboardPage from "../features/admin/Pages/DshboardPage";
import AdminLogin from "../features/admin/Pages/AdminLogin";
import AuthWrapper from "../components/auth/AuthWrapper";

const AdminMain = () => {
  const [FetchAdmin] = useLazyFetchAdminQuery();
  const { sessionId } = useParams<{ sessionId: string }>();

  useEffect(() => {
    FetchAdmin({});
  }, [FetchAdmin]);

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
