import React from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

interface RemoteActionButtonsProps {
  gameStatus: "paused" | "buzzer_round" | "answering";
  onStartBuzzerRound: () => void;
  onPauseGame: () => void;
  onResumeGame: () => void;
  onNextQuestion: () => void;
  onShowLeaderboard: () => void;
  onPassToSecondTeam: () => void;
  canPassToSecondTeam: boolean;
  isLoading?: boolean;
  lastAnswerWasWrong?: boolean;
}

const RemoteActionButtons: React.FC<RemoteActionButtonsProps> = ({
  gameStatus,
  onStartBuzzerRound,
  onPauseGame,
  onResumeGame,
  onNextQuestion,
  onShowLeaderboard,
  onPassToSecondTeam,
  canPassToSecondTeam,
  isLoading = false,
  lastAnswerWasWrong = false,
}) => {
  const buttonBaseStyles = {
    width: "100%",
    padding: "16px",
    fontSize: "16px",
    fontWeight: 700,
    borderRadius: "12px",
    textTransform: "none" as const,
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    transition: "all 0.2s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
    },
    "&:active": {
      transform: "translateY(0px)",
    },
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
      transform: "none",
    },
  };

  return (
    <Box
      sx={{
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Start Buzzer Round Button */}
      <Button
        variant="contained"
        startIcon={
          isLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />
        }
        onClick={onStartBuzzerRound}
        disabled={isLoading || gameStatus === "buzzer_round"}
        sx={{
          ...buttonBaseStyles,
          backgroundColor: "#10B981",
          "&:hover": {
            backgroundColor: "#059669",
            ...buttonBaseStyles["&:hover"],
          },
        }}
      >
        🎯 Start Buzzer Round
      </Button>

      {/* Pause/Resume Button */}
      {gameStatus !== "paused" ? (
        <Button
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={20} /> : <PauseIcon />}
          onClick={onPauseGame}
          disabled={isLoading}
          sx={{
            ...buttonBaseStyles,
            backgroundColor: "#F59E0B",
            "&:hover": {
              backgroundColor: "#D97706",
              ...buttonBaseStyles["&:hover"],
            },
          }}
        >
          ⏸️ Pause Game
        </Button>
      ) : (
        <Button
          variant="contained"
          startIcon={
            isLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />
          }
          onClick={onResumeGame}
          disabled={isLoading}
          sx={{
            ...buttonBaseStyles,
            backgroundColor: "#10B981",
            "&:hover": {
              backgroundColor: "#059669",
              ...buttonBaseStyles["&:hover"],
            },
          }}
        >
          ▶️ Resume Game
        </Button>
      )}

      {/* Next Question Button */}
      <Button
        variant="contained"
        startIcon={
          isLoading ? <CircularProgress size={20} /> : <SkipNextIcon />
        }
        onClick={onNextQuestion}
        disabled={isLoading}
        sx={{
          ...buttonBaseStyles,
          backgroundColor: "#3B82F6",
          "&:hover": {
            backgroundColor: "#2563EB",
            ...buttonBaseStyles["&:hover"],
          },
        }}
      >
        ➡️ Next Question
      </Button>

      {/* Show Leaderboard Button */}
      <Button
        variant="contained"
        startIcon={
          isLoading ? <CircularProgress size={20} /> : <LeaderboardIcon />
        }
        onClick={onShowLeaderboard}
        disabled={isLoading}
        sx={{
          ...buttonBaseStyles,
          backgroundColor: "#8B5CF6",
          "&:hover": {
            backgroundColor: "#7C3AED",
            ...buttonBaseStyles["&:hover"],
          },
        }}
      >
        🏆 Show Leaderboard
      </Button>

      {/* Pass to Second Team Button - Conditional */}
      {gameStatus === "answering" && (
        <Button
          variant="contained"
          startIcon={
            isLoading ? <CircularProgress size={20} /> : <SwapHorizIcon />
          }
          onClick={onPassToSecondTeam}
          disabled={isLoading || !canPassToSecondTeam || !lastAnswerWasWrong}
          sx={{
            ...buttonBaseStyles,
            backgroundColor: canPassToSecondTeam && lastAnswerWasWrong ? "#F97316" : "#9CA3AF",
            border: canPassToSecondTeam && lastAnswerWasWrong ? "3px solid #FBBF24" : "none",
            animation: canPassToSecondTeam && lastAnswerWasWrong
              ? "pulse-border 2s ease-in-out infinite"
              : "none",
            "@keyframes pulse-border": {
              "0%, 100%": {
                borderColor: "#FBBF24",
              },
              "50%": {
                borderColor: "#F59E0B",
              },
            },
            "&:hover": {
              backgroundColor: canPassToSecondTeam && lastAnswerWasWrong ? "#EA580C" : "#9CA3AF",
              ...buttonBaseStyles["&:hover"],
            },
          }}
        >
          🔄 Pass to 2nd Team
        </Button>
      )}

      {/* Helper Text for Pass Button */}
      {gameStatus === "answering" && !canPassToSecondTeam && (
        <Box
          sx={{
            padding: "8px",
            backgroundColor: "rgba(156, 163, 175, 0.1)",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "12px", color: "#64748B" }}>
            {lastAnswerWasWrong
              ? "No second team available"
              : "Waiting for answer result..."}
          </span>
        </Box>
      )}
    </Box>
  );
};

export default RemoteActionButtons;
