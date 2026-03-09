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

  // Find current team's entry in the leaderboard
  const myTeamEntry = leaderboard.find((entry) => entry.teamId === team?._id);

  // Get current answering team
  const currentAnsweringTeam = gameState?.currentAnsweringTeam;
  const answeringTeamId =
    typeof currentAnsweringTeam === "string"
      ? currentAnsweringTeam
      : currentAnsweringTeam?._id;

  // Check if we're in answering state
  const isAnsweringState = gameState?.gameStatus === "answering";

  // Check if my team is the answering team
  const isMyTeamAnswering = answeringTeamId === team?._id;

  // Position badge images
  const positionBadges: { [key: number]: string } = {
    1: positionOne,
    2: positionTwo,
    3: positionThree,
    4: positionFour,
    5: positionFive,
  };

  // Get rank text (1st, 2nd, 3rd, etc.)
  const getRankText = (rank: number): string => {
    if (rank === 1) return "1st";
    if (rank === 2) return "2nd";
    if (rank === 3) return "3rd";
    return `${rank}th`;
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
      {/* Answering Team Indicator */}
      {isAnsweringState && answeringTeamId && (
        <Typography
          variant="h6"
          sx={{
            color: "#FFD700",
            fontWeight: "bold",
            marginBottom: "24px",
            textAlign: "center",
            textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            padding: "12px 24px",
            borderRadius: "12px",
          }}
        >
          {isMyTeamAnswering ? "🎯 Your turn to answer!" : "🎯 Another team is answering..."}
        </Typography>
      )}

      {/* My Team Card */}
      <Box
        sx={{
          backgroundColor: "white",
          borderRadius: "24px",
          padding: "32px",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          textAlign: "center",
        }}
      >
        {myTeamEntry ? (
          <>
            {/* Success Message */}
            <Typography
              variant="h5"
              sx={{
                color: "#4CAF50",
                fontWeight: "bold",
                marginBottom: "24px",
              }}
            >
              🎉 Buzzer Pressed!
            </Typography>

            {/* Rank Badge */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              {positionBadges[myTeamEntry.rank] ? (
                <img
                  src={positionBadges[myTeamEntry.rank]}
                  alt={`Position ${myTeamEntry.rank}`}
                  style={{
                    width: "80px",
                    height: "80px",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    backgroundColor: "#3f51b5",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: "32px",
                  }}
                >
                  {myTeamEntry.rank}
                </Box>
              )}
            </Box>

            {/* Rank Text */}
            <Typography
              variant="h4"
              sx={{
                fontWeight: "bold",
                color: myTeamEntry.rank <= 3 ? "#FFD700" : "#333",
                marginBottom: "8px",
              }}
            >
              {getRankText(myTeamEntry.rank)} Place
            </Typography>

            {/* Team Name */}
            <Typography
              variant="h6"
              sx={{
                color: "#666",
                marginBottom: "24px",
              }}
            >
              {myTeamEntry.teamName}
            </Typography>

            {/* Time Display */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                padding: "16px 24px",
                borderRadius: "12px",
              }}
            >
              <img
                src={timerIcon}
                alt="Timer"
                style={{
                  width: "28px",
                  height: "28px",
                  objectFit: "contain",
                }}
              />
              <Typography
                sx={{
                  fontWeight: "bold",
                  fontSize: "28px",
                  color: myTeamEntry.rank <= 3 ? "#ff6b6b" : "#333",
                  fontFamily: "monospace",
                }}
              >
                {formatTime(
                  String(
                    Math.max(
                      0,
                      Number(myTeamEntry.timestamp || 0) -
                      Number(gameState?.buzzerRoundStartTime || 0)
                    )
                  )
                )}
              </Typography>
            </Box>

            {/* Waiting Message */}
            {!isAnsweringState && (
              <Typography
                sx={{
                  color: "#888",
                  marginTop: "24px",
                  fontSize: "14px",
                }}
              >
                Waiting for admin to select a team...
              </Typography>
            )}
          </>
        ) : (
          <>
            {/* Not Pressed Message */}
            <Typography
              variant="h5"
              sx={{
                color: "#666",
                fontWeight: "bold",
                marginBottom: "16px",
              }}
            >
              ⏳ Waiting...
            </Typography>
            <Typography
              sx={{
                color: "#888",
                fontSize: "16px",
              }}
            >
              You haven't pressed the buzzer yet
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};

export default BuzzerLeaderboard;
