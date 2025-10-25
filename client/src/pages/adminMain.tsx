import { Route, Routes } from "react-router-dom";
import DashboardPage from "../features/admin/pages/DshboardPage";
import AdminLogin from "../features/admin/pages/AdminLogin";
import RemoteControl from "../features/admin/pages/RemoteControl";
import PresenterView from "../features/admin/pages/PresenterView";
import Box from "@mui/material/Box";
import { useLazyFetchAdminQuery } from "../features/admin/services/admin.Api";
import { useAppSelector } from "../app/hooks";
import { RootState } from "../app/store";
import { useEffect } from "react";
// import Loader from "../components/ui/Loader";
// import AuthWrapper from "../components/auth/AuthWrapper";

const AdminMain = () => {
  const [FetchAdmin] = useLazyFetchAdminQuery();
  const { isAuthenticated } = useAppSelector(
    (state: RootState) => state.admin
  );

  useEffect(() => {
    FetchAdmin({});
  }, [isAuthenticated, FetchAdmin]);

  // if (isLoading) {
  //   return <Loader />;
  // }

  return (
    <Box sx={{ maxWidth: "100%", minHeight: "100vh" }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/:sessionId" element={<AdminLogin />} />

        {/* Remote Control - No Authentication Required */}
        <Route path="/remote-control" element={<RemoteControl />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/presenter" element={<PresenterView />} />

        {/* Presenter View - Protected Route (Requires Admin Auth) */}
        {/* <Route
          element={
            <AuthWrapper userType={"admin"} redirection={`/admin/login`} />
          }
        >
          <Route path="/:sessionId/presenter" element={<PresenterView />} />
        </Route> */}

        {/* Protected Admin Routes */}
        {/* <Route
          path="/"
          element={
            <AuthWrapper
              userType={"admin"}
              redirection={`/admin/login`}
            />
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route> */}
      </Routes>
    </Box>
  );
};

export default AdminMain;
