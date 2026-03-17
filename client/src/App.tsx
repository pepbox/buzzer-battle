import React, { useEffect } from "react";
import "./App.css";
import { Routes, Route } from "react-router-dom";
import GameMain from "./pages/gameMain";
import AdminMain from "./pages/adminMain";
import { initializeWebSocket } from "./services/websocket/websocketConfig";
import { websocketService } from "./services/websocket/websocketService";
import { useAdminAuth } from "./features/admin/services/useAdminAuth";
import { useAppSelector } from "./app/rootReducer";
import { RootState } from "./app/store";
import Default from "./components/ui/Default";
import { useFetchSessionQuery } from "./features/session/services/session.api";
import { useAppDispatch } from "./app/hooks";
import { clearAdmin } from "./features/admin/services/adminSlice";
import { clearTeam } from "./features/game/services/teamSlice";

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated: isAdminAuthenticated } = useAdminAuth();
  const { isAuthenticated: isUserAuthenticated } = useAppSelector(
    (state: RootState) => state.team,
  );
  const sessionId = useAppSelector(
    (state: RootState) => state.session.sessionId,
  );

  // Session endpoint is protected; poll while authenticated so ended sessions force logout.
  const { data: sessionData } = useFetchSessionQuery(undefined, {
    skip: !(isAdminAuthenticated || isUserAuthenticated),
    pollingInterval: 5000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    const status = sessionData?.data?.status;
    if (status !== "ended") return;

    dispatch(clearAdmin());
    dispatch(clearTeam());
    websocketService.disconnect();

    const pathname = window.location.pathname;
    const sessionIdFromPath = pathname.split("/")[2] || sessionId || "";

    if (pathname.startsWith("/admin/")) {
      window.location.replace(`/admin/${sessionIdFromPath}/login`);
      return;
    }

    if (pathname.startsWith("/game/")) {
      window.location.replace(`/game/${sessionIdFromPath}/`);
      return;
    }

    window.location.replace("/");
  }, [dispatch, sessionData, sessionId]);

  useEffect(() => {
    const initWS = async () => {
      try {
        const serverUrl = import.meta.env.VITE_BACKEND_WEBSOCKET_URL;
        await initializeWebSocket(serverUrl, undefined, sessionId || undefined);
      } catch (error) {
        console.error("Failed to connect to Socket.IO:", error);
      }
    };

    if (isAdminAuthenticated || isUserAuthenticated) {
      initWS();
    }
    return () => {
      websocketService.disconnect();
    };
  }, [isAdminAuthenticated, isUserAuthenticated, sessionId]);

  return (
    <Routes>
      <Route path="/game/:sessionId/*" element={<GameMain />} />
      <Route path="/admin/:sessionId/*" element={<AdminMain />} />

      {/* Redirect to game main if no specific path is matched */}
      <Route path="*" element={<Default />} />
    </Routes>
  );
};

export default App;
