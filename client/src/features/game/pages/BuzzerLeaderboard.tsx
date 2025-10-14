import React, { useState, useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
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
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [autoSkipTimer, setAutoSkipTimer] = useState(10);

  // Get current team from Redux
  const team = useAppSelector((state: RootState) => state.team.team);

  // Fetch buzzer leaderboard
  const {
    data: leaderboardData,
    isLoading,
    error,
  } = useFetchBuzzerLeaderboardQuery();

  const leaderboard = leaderboardData?.data?.leaderboard || [];

  // Position badge images
  const positionBadges: { [key: number]: string } = {
    1: positionOne,
    2: positionTwo,
    3: positionThree,
    4: positionFour,
    5: positionFive,
  };

  // Auto-skip timer (10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setAutoSkipTimer((prev) => {
        if (prev <= 1) {
          handleSkip();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSkip = () => {
    // Navigate back to question screen
    navigate(`/game/${sessionId}/question`);
  };

  // Format timestamp to show seconds with 2 decimal places (e.g., "02.44")
  const formatTime = (timestamp: string): string => {
    try {
      const ms = Number(timestamp);
      const seconds = ms / 1000;
      return seconds.toFixed(2);
    } catch {
      return "00.00";
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
          marginBottom: "24px",
          textAlign: "center",
          textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        Fastest Solvers
      </Typography>

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
                  backgroundColor: isCurrentTeam
                    ? "rgba(255, 215, 0, 0.2)" // Highlight current team with golden tint
                    : "rgba(240, 240, 240, 0.5)",
                  border: isCurrentTeam
                    ? "2px solid #FFD700"
                    : "1px solid transparent",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    backgroundColor: isCurrentTeam
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
                      fontWeight: isCurrentTeam ? "bold" : "600",
                      fontSize: "16px",
                      color: "#333",
                    }}
                  >
                    {entry.teamName}
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
                    {formatTime(entry.timestamp)}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Skip Button with Auto-skip Timer */}
      <Button
        variant="contained"
        onClick={handleSkip}
        sx={{
          marginTop: "24px",
          backgroundColor: "white",
          color: "#3f51b5",
          fontWeight: "bold",
          fontSize: "16px",
          padding: "12px 48px",
          borderRadius: "25px",
          textTransform: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          "&:hover": {
            backgroundColor: "#f5f5f5",
          },
        }}
      >
        Skip {autoSkipTimer > 0 && `(${autoSkipTimer}s)`}
      </Button>
    </Box>
  );
};

export default BuzzerLeaderboard;
