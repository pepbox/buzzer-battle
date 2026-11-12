import React, { useEffect } from "react";
import "./App.css";
import { Routes, Route } from "react-router-dom";
import GameMain from "./pages/gameMain";
import AdminMain from "./pages/adminMain";
import GlobalQuestionLibraryPage from "./features/admin/pages/GlobalQuestionLibraryPage";
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

  const shouldFetchSession =
    (isAdminAuthenticated || isUserAuthenticated) && Boolean(sessionId);

  // Session endpoint is protected; fetched upon mount or authentication.
  const { data: sessionData } = useFetchSessionQuery(undefined, {
    // Avoid repeated refetches while users are idle on paused overlay.
    skip: !shouldFetchSession,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    const status = sessionData?.data?.status;
    if (status !== "ended") return;

    dispatch(clearAdmin());
    dispatch(clearTeam());
    websocketService.disconnect();

    const pathname = window.location.pathname;
    const sessionIdFromPath = pathname.split("/")[2] || sessionId || "";

    if (pathname.startsWith("/admin/") && pathname !== "/admin/questions") {
      window.location.replace(`/admin/${sessionIdFromPath}/login`);
      return;
    }

    if (pathname.startsWith("/game/")) {
      window.location.replace(`/game/${sessionIdFromPath}/`);
      return;
    }

    window.location.replace("/");
  }, [dispatch, sessionData, sessionId]);

  // (Re)connect whenever auth state or session changes. The socket handshake
  // carries `auth.sessionId` and the session-scoped cookie, so a login or a
  // session switch must replace the socket. The cleanup tears the previous
  // socket down before the next one is created, so there is never more than one.
  useEffect(() => {
    if (!(isAdminAuthenticated || isUserAuthenticated)) return;

    const serverUrl = import.meta.env.VITE_BACKEND_WEBSOCKET_URL;
    initializeWebSocket(serverUrl, undefined, sessionId || undefined).catch(
      (error) => {
        // socket.io keeps retrying in the background; listeners are already attached.
        console.warn("Initial Socket.IO connect failed, retrying:", error?.message ?? error);
      },
    );

    return () => {
      websocketService.disconnect();
    };
  }, [isAdminAuthenticated, isUserAuthenticated, sessionId]);

  return (
    <Routes>
      <Route path="/game/:sessionId/*" element={<GameMain />} />
      <Route path="/admin/questions" element={<GlobalQuestionLibraryPage />} />
      <Route path="/admin/:sessionId/*" element={<AdminMain />} />

      {/* Redirect to game main if no specific path is matched */}
      <Route path="*" element={<Default />} />
    </Routes>
  );
};

export default App;
