import React from "react";
import "./App.css";
import { Routes, Route } from "react-router-dom";
import GameMain from "./pages/gameMain";
import AdminMain from "./pages/adminMain";
// import { initializeWebSocket } from "./services/websocket/websocketConfig";
// import { websocketService } from "./services/websocket/websocketService";
// import { useAdminAuth } from "./features/admin/services/useAdminAuth";
// import { useAppSelector } from "./app/rootReducer";
// import { RootState } from "./app/store";
import Default from "./components/ui/Default";
import { useFetchSessionQuery } from "./features/session/services/session.api";

const App: React.FC = () => {
  useFetchSessionQuery();
  // const { isAuthenticated: isAdminAuthenticated } = useAdminAuth();
  // const { isAuthenticated: isUserAuthenticated } = useAppSelector(
  //   (state: RootState) => state.player
  // );

  // useEffect(
  //   () => {
  //     const initWS = async () => {
  //       try {
  //         const serverUrl = import.meta.env.VITE_BACKEND_WEBSOCKET_URL;
  //         await initializeWebSocket(serverUrl);
  //       } catch (error) {
  //         console.error("Failed to connect to Socket.IO:", error);
  //       }
  //     };

  //     // if (isAdminAuthenticated || isUserAuthenticated) {
  //     initWS();
  //     // }
  //     return () => {
  //       websocketService.disconnect();
  //     };
  //   }
  //   //  [isAdminAuthenticated, isUserAuthenticated]
  // );

  return (
    <Routes>
      <Route path="/game/:sessionId/*" element={<GameMain />} />
      <Route path="/game/*" element={<GameMain />} />
      <Route path="/admin/:sessionId/*" element={<AdminMain />} />

      {/* Redirect to game main if no specific path is matched */}
      <Route path="*" element={<Default />} />

      {/* 404 page */}
      {/* <Route path="*" element={<NotFoundPage />} />  */}
    </Routes>
  );
};

export default App;
