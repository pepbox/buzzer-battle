import React, { useEffect, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { VolumeUp, VolumeOff } from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import { useFetchSessionQuery } from "../../session/services/session.api";
import { useFetchOverallLeaderboardQuery } from "../../game/services/teamApi";
import { useFetchBuzzerLeaderboardQuery } from "../../game/services/buzzerApi";
import { setSessionId } from "../../session/services/sessionSlice";
import PresenterGameView from "../components/PresenterGameView";
import Loader from "../../../components/ui/Loader";
import ErrorLayout from "../../../components/ui/Error";
import { presenterAudio } from "../../../utils/presenterAudio";

// Format elapsed time as MM:SS:CC (minutes:seconds:centiseconds)
const formatElapsedTime = (elapsedMs: number): string => {
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  const centiseconds = Math.floor((elapsedMs % 1000) / 10);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(centiseconds).padStart(2, "0")}`;
};

const PresenterView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const dispatch = useAppDispatch();
  const [isMuted, setIsMuted] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(true);

  // Get game state from Redux
  const gameState = useAppSelector(
    (state: RootState) => state.gameState.gameState
  );

  // Fetch session data
  const {
    data: session,
    isLoading: sessionLoading,
    isError: sessionError,
  } = useFetchSessionQuery();

  // Fetch leaderboard data from team API
  const { data: leaderboardData, isLoading: leaderboardLoading } =
    useFetchOverallLeaderboardQuery();

  // Fetch buzzer leaderboard data
  const { data: buzzerLeaderboardData } = useFetchBuzzerLeaderboardQuery();

  const buzzerLeaderboard = buzzerLeaderboardData?.data?.leaderboard || [];
  const buzzerRoundStartTime = gameState?.buzzerRoundStartTime;
  const isBuzzerRound = gameState?.gameStatus === "buzzer_round";

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
      {/* Right Panel - Buzzer Queue or Leaderboard (30%) */}
      <Box
        sx={{
          width: "30%",
          height: "100%",
          overflow: "auto",
          backgroundColor: "#1a1a1a",
          borderLeft: "2px solid #333",
        }}
      >
        <Box
          sx={{
            padding: 3,
            color: "#fff",
          }}
        >
          {/* Header - Changes based on game state */}
          <Box
            sx={{
              textAlign: "center",
              mb: 3,
              pb: 2,
              borderBottom: "2px solid #444",
            }}
          >
            <Box sx={{ fontSize: 32, fontWeight: "bold", color: isBuzzerRound ? "#00BFFF" : "#FFD700" }}>
              {isBuzzerRound ? "⏱️ BUZZER QUEUE ⏱️" : "🏆 LEADERBOARD 🏆"}
            </Box>
          </Box>

          {/* Conditional Content: Buzzer Queue or Leaderboard */}
          {isBuzzerRound ? (
            // BUZZER QUEUE - Show during buzzer round
            buzzerLeaderboard.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {buzzerLeaderboard.map((entry: any, index: number) => {
                  const rank = index + 1;
                  const getRankIcon = (rank: number) => {
                    if (rank === 1) return "🥇";
                    if (rank === 2) return "🥈";
                    if (rank === 3) return "🥉";
                    return `#${rank}`;
                  };

                  // Calculate elapsed time
                  const elapsedTime = buzzerRoundStartTime
                    ? Math.max(0, Number(entry.timestamp) - buzzerRoundStartTime)
                    : 0;

                  return (
                    <Box
                      key={entry.teamId}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: 2,
                        backgroundColor:
                          index === 0
                            ? "rgba(0, 191, 255, 0.15)"
                            : index === 1
                              ? "rgba(0, 191, 255, 0.1)"
                              : index === 2
                                ? "rgba(0, 191, 255, 0.05)"
                                : "rgba(255, 255, 255, 0.05)",
                        borderRadius: 2,
                        border:
                          index < 3
                            ? "2px solid rgba(0, 191, 255, 0.4)"
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
                              Team #{entry.teamNumber}
                            </Box>
                            <Box sx={{ fontSize: 14, color: "#888" }}>
                              {entry.teamName}
                            </Box>
                          </Box>
                      </Box>
                      {/* Elapsed Time Display */}
                      <Box
                        sx={{
                          fontSize: 20,
                          fontWeight: "bold",
                          color: index === 0 ? "#00BFFF" : index < 3 ? "#87CEEB" : "#888",
                          fontFamily: "monospace",
                        }}
                      >
                        {formatElapsedTime(elapsedTime)}
                      </Box>
                    </Box>
                  );
                })}
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
                Waiting for teams to press buzzer...
              </Box>
            )
          ) : (
            // LEADERBOARD - Show during other states
            leaderboardData?.data?.leaderboard &&
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
                              Team #{team.teamNumber}
                            </Box>
                            <Box sx={{ fontSize: 14, color: "#888" }}>
                              {team.teamName}
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
            )
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PresenterView;
