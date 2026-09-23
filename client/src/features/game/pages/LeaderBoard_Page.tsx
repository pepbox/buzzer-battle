import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import LeaderBoard, { LeaderBoardTeam } from "../components/LeaderBoard";
import { useFetchOverallLeaderboardQuery } from "../services/teamApi";
import { useFetchGameStateQuery } from "../services/gameStateApi";
import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";
import LockIcon from "@mui/icons-material/Lock";

interface LeaderBoardPageProps {
  isOverlay?: boolean;
  navigationBase?: "game" | "admin";
}

const LeaderBoardPage: React.FC<LeaderBoardPageProps> = ({
  isOverlay: _isOverlay,
  navigationBase = "game",
}) => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const basePath = navigationBase === "admin" ? "admin" : "game";
  const returnPath =
    navigationBase === "admin"
      ? `/${basePath}/${sessionId}/remote-control`
      : `/${basePath}/${sessionId}/buzzer`;

  // Fetch game state to check server-authoritative leaderboard visibility
  const { data: gameStateData, isLoading: isGameStateLoading } = useFetchGameStateQuery();
  const gameState = gameStateData?.data?.gameState;
  const isLeaderboardVisible = gameState?.isLeaderboardVisible ?? false;

  // Fetch overall leaderboard
  const { data, isLoading, error } = useFetchOverallLeaderboardQuery(undefined, {
    skip: navigationBase === "game" && !isLeaderboardVisible,
  });

  // Listen for game state changes to auto-navigate
  useEffect(() => {
    const handleGameStateChange = (data: any) => {
      if (data.gameStatus === "buzzer_round") {
        navigate(returnPath);
      }
    };

    websocketService.on(Events.GAME_STATE_CHANGED, handleGameStateChange);

    return () => {
      websocketService.off(Events.GAME_STATE_CHANGED, handleGameStateChange);
    };
  }, [navigate, returnPath, sessionId]);

  const handleBack = () => {
    navigate(returnPath);
  };

  if (isGameStateLoading || (isLoading && isLeaderboardVisible)) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          minHeight: "100%",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Server-authoritative check for participant view
  if (navigationBase === "game" && !isLeaderboardVisible) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          minHeight: "100%",
          p: 3,
          textAlign: "center",
          gap: 2,
        }}
      >
        <LockIcon sx={{ fontSize: 60, color: "#9CA3AF" }} />
        <Typography variant="h5" fontWeight="bold" color="#1F2937">
          Leaderboard Hidden
        </Typography>
        <Typography variant="body1" color="#6B7280" sx={{ maxWidth: 320 }}>
          The Quiz Master has not revealed the leaderboard yet. Please wait for the operator to unlock it.
        </Typography>
        <Button
          variant="contained"
          onClick={handleBack}
          sx={{ mt: 2, borderRadius: 3, fontWeight: "bold" }}
        >
          Back to Game
        </Button>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          minHeight: "100%",
        }}
      >
        <Typography color="error">Failed to load leaderboard</Typography>
      </Box>
    );
  }

  // Convert API response to LeaderBoardTeam format
  const teams: LeaderBoardTeam[] = data.data.leaderboard.map(
    (leaderboardTeam, index) => ({
      id: leaderboardTeam._id,
      name: leaderboardTeam.teamName,
      score: leaderboardTeam.teamScore,
      scoreChange: 0, // We don't have previous scores to calculate change
      rank: index + 1,
      totalBuzzerReactionTimeMs: leaderboardTeam.totalBuzzerReactionTimeMs,
    })
  );

  return <LeaderBoard teams={teams} onBack={handleBack} />;
};

export default LeaderBoardPage;
