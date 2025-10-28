import React from "react";
import { Box, Typography } from "@mui/material";
import { useFetchBuzzerLeaderboardQuery } from "../services/buzzerApi";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import Loader from "../../../components/ui/Loader";
import Error from "../../../components/ui/Error";

// Import assets
import normalBg from "../../../assets/background/normal_bg.webp";
import timerIcon from "../../../assets/leaderboard/timer.webp";
import positionOne from "../../../assets/leaderboard/one.webp";
import positionTwo from "../../../assets/leaderboard/two.webp";
import positionThree from "../../../assets/leaderboard/three.webp";
import positionFour from "../../../assets/leaderboard/four.webp";
import positionFive from "../../../assets/leaderboard/five.webp";

const BuzzerLeaderboard: React.FC = () => {
  // Get current team and game state from Redux
  const team = useAppSelector((state: RootState) => state.team.team);
  const gameState = useAppSelector(
    (state: RootState) => state.gameState.gameState
  );

  // Fetch buzzer leaderboard
  const {
    data: leaderboardData,
    isLoading,
    error,
  } = useFetchBuzzerLeaderboardQuery();

  const leaderboard = leaderboardData?.data?.leaderboard || [];

  // Get current answering team
  const currentAnsweringTeam = gameState?.currentAnsweringTeam;
  const answeringTeamId =
    typeof currentAnsweringTeam === "string"
      ? currentAnsweringTeam
      : currentAnsweringTeam?._id;

  // Check if we're in answering state
  const isAnsweringState = gameState?.gameStatus === "answering";

  // Position badge images
  const positionBadges: { [key: number]: string } = {
    1: positionOne,
    2: positionTwo,
    3: positionThree,
    4: positionFour,
    5: positionFive,
  };

  // Format timestamp to show minutes:seconds:milliseconds (e.g., "00:01:42")
  const formatTime = (timestamp: string): string => {
    try {
      const totalMs = Number(timestamp);
      const minutes = Math.floor(totalMs / 60000);
      const seconds = Math.floor((totalMs % 60000) / 1000);
      const milliseconds = Math.floor((totalMs % 1000) / 10); // Get centiseconds (2 digits)
      
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(2, '0')}`;
    } catch {
      return "00:00:00";
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return <Error />;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(180deg, #87CEEB 0%, #4682B4 100%)",
        backgroundImage: `url(${normalBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: "24px",
      }}
    >
      {/* Title */}
      <Typography
        variant="h4"
        sx={{
          color: "white",
          fontWeight: "bold",
          marginBottom: "16px",
          textAlign: "center",
          textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        Fastest Solvers
      </Typography>

      {/* Answering Team Indicator */}
      {isAnsweringState && answeringTeamId && (
        <Typography
          variant="h6"
          sx={{
            color: "#FFD700",
            fontWeight: "bold",
            marginBottom: "16px",
            textAlign: "center",
            textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            padding: "8px 16px",
            borderRadius: "8px",
          }}
        >
          🎯{" "}
          {leaderboard.find((e) => e.teamId === answeringTeamId)?.teamName ||
            "Team"}{" "}
          is answering...
        </Typography>
      )}

      {/* Leaderboard Container */}
      <Box
        sx={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "24px",
          width: "100%",
          maxWidth: "500px",
          maxHeight: "60vh",
          overflowY: "auto",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        }}
      >
        {leaderboard.length === 0 ? (
          <Typography
            sx={{
              textAlign: "center",
              color: "#666",
              padding: "20px",
            }}
          >
            No teams have pressed the buzzer yet
          </Typography>
        ) : (
          leaderboard.map((entry) => {
            const isCurrentTeam = team?._id === entry.teamId;

            return (
              <Box
                key={entry.teamId}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  marginBottom: "12px",
                  borderRadius: "12px",
                  backgroundColor:
                    entry.teamId === answeringTeamId
                      ? "rgba(76, 175, 80, 0.2)" // Green tint for answering team
                      : isCurrentTeam
                      ? "rgba(255, 215, 0, 0.2)" // Golden tint for current team
                      : "rgba(240, 240, 240, 0.5)",
                  border:
                    entry.teamId === answeringTeamId
                      ? "2px solid #4CAF50" // Green border for answering team
                      : isCurrentTeam
                      ? "2px solid #FFD700" // Golden border for current team
                      : "1px solid transparent",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    backgroundColor:
                      entry.teamId === answeringTeamId
                        ? "rgba(76, 175, 80, 0.3)"
                        : isCurrentTeam
                        ? "rgba(255, 215, 0, 0.3)"
                        : "rgba(240, 240, 240, 0.8)",
                  },
                }}
              >
                {/* Rank Badge */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    minWidth: "60px",
                  }}
                >
                  {positionBadges[entry.rank] ? (
                    <img
                      src={positionBadges[entry.rank]}
                      alt={`Position ${entry.rank}`}
                      style={{
                        width: "40px",
                        height: "40px",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        backgroundColor: "#3f51b5",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "bold",
                        fontSize: "18px",
                      }}
                    >
                      {entry.rank}
                    </Box>
                  )}
                </Box>

                {/* Team Name */}
                <Box sx={{ flex: 1, marginLeft: "16px" }}>
                  <Typography
                    sx={{
                      fontWeight:
                        entry.teamId === answeringTeamId || isCurrentTeam
                          ? "bold"
                          : "600",
                      fontSize: "16px",
                      color: "#333",
                    }}
                  >
                    {entry.teamName}
                    {entry.teamId === answeringTeamId && " 📝"}
                  </Typography>
                </Box>

                {/* Time with Timer Icon */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <img
                    src={timerIcon}
                    alt="Timer"
                    style={{
                      width: "20px",
                      height: "20px",
                      objectFit: "contain",
                    }}
                  />
                  <Typography
                    sx={{
                      fontWeight: "bold",
                      fontSize: "16px",
                      color: entry.rank <= 3 ? "#ff6b6b" : "#666",
                    }}
                  >
                    {formatTime(
                      String(
                        Math.max(
                          0,
                          Number(entry.timestamp || 0) -
                            Number(gameState?.buzzerRoundStartTime || 0)
                        )
                      )
                    )}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};

export default BuzzerLeaderboard;
