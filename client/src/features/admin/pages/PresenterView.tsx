import React, { useEffect, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { VolumeUp, VolumeOff } from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { useAppDispatch } from "../../../app/hooks";
// import { RootState } from "../../../app/store";
import { useFetchSessionQuery } from "../../session/services/session.api";
import { useFetchOverallLeaderboardQuery } from "../../game/services/teamApi";
import { setSessionId } from "../../session/services/sessionSlice";
import PresenterGameView from "../components/PresenterGameView";
import Loader from "../../../components/ui/Loader";
import ErrorLayout from "../../../components/ui/Error";
// import { useGameStateMonitor } from "../../game/hooks/useGameStateMonitor";
import { presenterAudio } from "../../../utils/presenterAudio";

const PresenterView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const dispatch = useAppDispatch();
  const [isMuted, setIsMuted] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(true);

  // Fetch session data
  const {
    data: session,
    isLoading: sessionLoading,
    isError: sessionError,
  } = useFetchSessionQuery();

  // Fetch leaderboard data from team API
  const { data: leaderboardData, isLoading: leaderboardLoading } =
    useFetchOverallLeaderboardQuery();

  // Monitor game state via WebSocket
  // useGameStateMonitor();

  // Set session ID in Redux
  useEffect(() => {
    if (sessionId) {
      dispatch(setSessionId(sessionId));
    }
  }, [sessionId, dispatch]);

  // Hide audio prompt after user interaction
  useEffect(() => {
    const hidePrompt = () => {
      setShowAudioPrompt(false);
    };

    document.addEventListener("click", hidePrompt, { once: true });
    document.addEventListener("keydown", hidePrompt, { once: true });

    return () => {
      document.removeEventListener("click", hidePrompt);
      document.removeEventListener("keydown", hidePrompt);
    };
  }, []);

  const handleToggleMute = () => {
    if (isMuted) {
      presenterAudio.unmute();
    } else {
      presenterAudio.mute();
    }
    setIsMuted(!isMuted);
  };

  if (sessionLoading || leaderboardLoading) {
    return <Loader />;
  }

  if (sessionError) {
    return <ErrorLayout />;
  }

  return (
    <Box
      sx={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#000",
        position: "relative",
      }}
    >
      {/* Audio Control Button */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        <Tooltip title={isMuted ? "Unmute Audio" : "Mute Audio"}>
          <IconButton
            onClick={handleToggleMute}
            sx={{
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              color: "#fff",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.7)",
              },
            }}
          >
            {isMuted ? <VolumeOff /> : <VolumeUp />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Audio Unlock Prompt */}
      {showAudioPrompt && (
        <Box
          sx={{
            position: "absolute",
            top: 70,
            right: 16,
            zIndex: 999,
            backgroundColor: "rgba(255, 215, 0, 0.95)",
            color: "#000",
            padding: "8px 16px",
            borderRadius: 2,
            fontSize: 14,
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            animation: "fadeIn 0.3s ease-in",
            "@keyframes fadeIn": {
              from: { opacity: 0, transform: "translateY(-10px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          🔊 Click anywhere to enable sound
        </Box>
      )}

      {/* Left Panel - Game View (70%) */}
      <Box
        sx={{
          width: "70%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <PresenterGameView session={session?.data} />
      </Box>
      {/* Right Panel - Leaderboard (30%) */}
      <Box
        sx={{
          width: "30%",
          height: "100%",
          overflow: "auto",
          backgroundColor: "#1a1a1a",
          borderLeft: "2px solid #333",
        }}
      >
        {/* Leaderboard Component */}
        <Box
          sx={{
            padding: 3,
            color: "#fff",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              textAlign: "center",
              mb: 3,
              pb: 2,
              borderBottom: "2px solid #444",
            }}
          >
            <Box sx={{ fontSize: 32, fontWeight: "bold", color: "#FFD700" }}>
              🏆 LEADERBOARD 🏆
            </Box>
          </Box>

          {/* Team Rankings */}
          {leaderboardData?.data?.leaderboard &&
          leaderboardData?.data.leaderboard.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {leaderboardData?.data.leaderboard.map(
                (team: any, index: number) => {
                  const rank = index + 1;
                  const getRankIcon = (rank: number) => {
                    if (rank === 1) return "🥇";
                    if (rank === 2) return "🥈";
                    if (rank === 3) return "🥉";
                    return `#${rank}`;
                  };

                  return (
                    <Box
                      key={team._id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: 2,
                        backgroundColor:
                          index === 0
                            ? "rgba(255, 215, 0, 0.1)"
                            : index === 1
                            ? "rgba(192, 192, 192, 0.1)"
                            : index === 2
                            ? "rgba(205, 127, 50, 0.1)"
                            : "rgba(255, 255, 255, 0.05)",
                        borderRadius: 2,
                        border:
                          index < 3
                            ? "2px solid rgba(255, 215, 0, 0.3)"
                            : "none",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          flex: 1,
                        }}
                      >
                        <Box sx={{ fontSize: 24, minWidth: 50 }}>
                          {getRankIcon(rank)}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ fontSize: 20, fontWeight: "bold" }}>
                            {team.teamName}
                          </Box>
                          <Box sx={{ fontSize: 14, color: "#888" }}>
                            Team #{team.teamNumber}
                          </Box>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          fontSize: 24,
                          fontWeight: "bold",
                          color: "#FFD700",
                        }}
                      >
                        {team.teamScore}
                      </Box>
                    </Box>
                  );
                }
              )}
            </Box>
          ) : (
            <Box
              sx={{
                textAlign: "center",
                py: 4,
                color: "#888",
                fontSize: 18,
              }}
            >
              No teams have scored yet
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PresenterView;
