import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress, Paper, Chip } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useFetchBuzzerLeaderboardQuery } from "../services/buzzerApi";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import normalBg from "../../../assets/background/normal_bg.webp";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { Events } from "../../../services/websocket/enums/Events";
import { websocketService } from "../../../services/websocket/websocketService";

const BuzzerLeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const team = useAppSelector((state: RootState) => state.team.team);
  const [waitingForTransition, setWaitingForTransition] = useState(false);

  // Fetch buzzer leaderboard
  const { data, isLoading, error } = useFetchBuzzerLeaderboardQuery();

  // Listen for game state change to answering round
  useEffect(() => {
    const handleGameStateChange = (data: any) => {
      if (data.gameStatus === "answering") {
        setWaitingForTransition(true);
        // Navigate to question round after short delay
        setTimeout(() => {
          navigate(`/game/${sessionId}/question`);
        }, 2000);
      }
    };

    websocketService.on(Events.GAME_STATE_CHANGED, handleGameStateChange);

    return () => {
      websocketService.off(Events.GAME_STATE_CHANGED, handleGameStateChange);
    };
  }, [navigate, sessionId]);

  const leaderboard = data?.data?.leaderboard || [];

  // Find current team's rank
  const currentTeamRank = leaderboard.findIndex(
    (entry) => entry.teamId === team?._id
  );

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
          Failed to load buzzer leaderboard
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundImage: `url(${normalBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        padding: 3,
        overflow: "auto",
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: "center" }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: "primary.main",
            mb: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <EmojiEventsIcon fontSize="large" />
          Buzzer Leaderboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {waitingForTransition
            ? "Transitioning to answering round..."
            : "Fastest teams who pressed the buzzer"}
        </Typography>
      </Box>

      {/* Leaderboard List */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          maxWidth: "600px",
          width: "100%",
          mx: "auto",
        }}
      >
        {leaderboard.length === 0 ? (
          <Paper
            elevation={2}
            sx={{
              p: 3,
              textAlign: "center",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
            }}
          >
            <Typography>No teams have pressed the buzzer yet</Typography>
          </Paper>
        ) : (
          leaderboard.map((entry, index) => {
            const isCurrentTeam = entry.teamId === team?._id;
            const rank = index + 1;

            return (
              <Paper
                key={entry.teamId}
                elevation={isCurrentTeam ? 8 : 2}
                sx={{
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  backgroundColor: isCurrentTeam
                    ? "rgba(33, 150, 243, 0.15)"
                    : "rgba(255, 255, 255, 0.9)",
                  border: isCurrentTeam ? "2px solid" : "none",
                  borderColor: isCurrentTeam ? "primary.main" : "transparent",
                  transition: "all 0.3s ease",
                }}
              >
                {/* Rank */}
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      rank === 1
                        ? "#FFD700"
                        : rank === 2
                        ? "#C0C0C0"
                        : rank === 3
                        ? "#CD7F32"
                        : "grey.300",
                    fontWeight: "bold",
                    fontSize: "1.2rem",
                    color: rank <= 3 ? "white" : "text.primary",
                  }}
                >
                  {rank}
                </Box>

                {/* Team Info */}
                <Box sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 0.5,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: "bold", fontSize: "1.1rem" }}
                    >
                      {entry.teamName}
                    </Typography>
                    {isCurrentTeam && (
                      <Chip label="You" color="primary" size="small" />
                    )}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <AccessTimeIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Box>

                {/* Trophy for top 3 */}
                {rank <= 3 && (
                  <EmojiEventsIcon
                    sx={{
                      fontSize: 32,
                      color:
                        rank === 1
                          ? "#FFD700"
                          : rank === 2
                          ? "#C0C0C0"
                          : "#CD7F32",
                    }}
                  />
                )}
              </Paper>
            );
          })
        )}
      </Box>

      {/* Current Team Rank Summary */}
      {currentTeamRank >= 0 && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            backgroundColor: "rgba(33, 150, 243, 0.1)",
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          <Typography variant="h6" color="primary.main">
            Your Rank: #{currentTeamRank + 1}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BuzzerLeaderboardPage;
