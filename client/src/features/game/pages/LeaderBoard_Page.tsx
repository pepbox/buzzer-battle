import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import LeaderBoard, { LeaderBoardTeam } from "../compoenents/LeaderBoard";
import { useFetchOverallLeaderboardQuery } from "../services/teamApi";
import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";

const LeaderBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  // Fetch overall leaderboard
  const { data, isLoading, error, refetch } = useFetchOverallLeaderboardQuery();

  // Listen for game state changes to auto-navigate
  useEffect(() => {
    const handleGameStateChange = (data: any) => {
      if (data.gameStatus === "buzzer_round") {
        // Navigate back to buzzer round when next question starts
        navigate(`/game/${sessionId}/buzzer`);
      }
    };

    websocketService.on(Events.GAME_STATE_CHANGED, handleGameStateChange);

    return () => {
      websocketService.off(Events.GAME_STATE_CHANGED, handleGameStateChange);
    };
  }, [navigate, sessionId]);

  // Refetch leaderboard periodically to get latest scores
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000); // Refetch every 5 seconds

    return () => clearInterval(interval);
  }, [refetch]);

  const handleBack = () => {
    // Navigate back to buzzer round or home
    navigate(`/game/${sessionId}/buzzer`);
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
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
          minHeight: "100vh",
        }}
      >
        <Typography color="error">
          Failed to load leaderboard
        </Typography>
      </Box>
    );
  }

  // Convert API response to LeaderBoardTeam format
  const teams: LeaderBoardTeam[] = data.data.leaderboard.map((leaderboardTeam, index) => ({
    id: leaderboardTeam._id,
    name: leaderboardTeam.teamName,
    score: leaderboardTeam.teamScore,
    scoreChange: 0, // We don't have previous scores to calculate change
    rank: index + 1,
  }));

  return (
    <LeaderBoard
      teams={teams}
      onBack={handleBack}
    />
  );
};

export default LeaderBoardPage;
