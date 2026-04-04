import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import LeaderBoard, { LeaderBoardTeam } from "../components/LeaderBoard";
import { useFetchOverallLeaderboardQuery } from "../services/teamApi";
import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";

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

  // Fetch overall leaderboard
  const { data, isLoading, error } = useFetchOverallLeaderboardQuery();

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

  if (isLoading) {
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
