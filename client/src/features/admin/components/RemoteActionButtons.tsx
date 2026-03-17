import React from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import BoltIcon from "@mui/icons-material/Bolt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

interface RemoteActionButtonsProps {
  gameStatus: "paused" | "buzzer_round" | "answering" | "idle";
  currentQuestionIndex: number;
  totalQuestions: number;
  onNextQuestion: () => void;
  onPauseGame: () => void;
  onResumeGame: () => void;
  onPassToSecondTeam: () => void;
  onAllowTopTeam: () => void;
  onMarkCorrect?: () => void;
  onMarkWrong?: () => void;
  canPassToSecondTeam: boolean;
  hasFastestTeam: boolean;
  isLoading?: boolean;
  lastAnswerWasWrong?: boolean;
}

const RemoteActionButtons: React.FC<RemoteActionButtonsProps> = ({
  gameStatus,
  currentQuestionIndex,
  totalQuestions,
  onNextQuestion,
  onPauseGame,
  onResumeGame,
  onPassToSecondTeam,
  onAllowTopTeam,
  onMarkCorrect,
  onMarkWrong,
  canPassToSecondTeam,
  hasFastestTeam,
  isLoading = false,
  lastAnswerWasWrong = false,
}) => {
  const hasQuestions = totalQuestions > 0;
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
      {/* Mark Answer Buttons - Only during answering state (for verbal answer flow) */}
      {gameStatus === "answering" && !lastAnswerWasWrong && (
        <Box sx={{ display: "flex", gap: "12px" }}>
          <Button
            variant="contained"
            startIcon={
              isLoading ? <CircularProgress size={20} /> : <CheckCircleIcon />
            }
            onClick={onMarkCorrect}
            disabled={isLoading}
            sx={{
              ...buttonBaseStyles,
              flex: 1,
              backgroundColor: "#10B981",
              "&:hover": {
                backgroundColor: "#059669",
                ...buttonBaseStyles["&:hover"],
              },
            }}
          >
            ✅ Correct
          </Button>
          <Button
            variant="contained"
            startIcon={
              isLoading ? <CircularProgress size={20} /> : <CancelIcon />
            }
            onClick={onMarkWrong}
            disabled={isLoading}
            sx={{
              ...buttonBaseStyles,
              flex: 1,
              backgroundColor: "#EF4444",
              "&:hover": {
                backgroundColor: "#DC2626",
                ...buttonBaseStyles["&:hover"],
              },
            }}
          >
            ❌ Wrong
          </Button>
        </Box>
      )}

      {/* Start Game / Next Question Button */}
      <Button
        variant="contained"
        startIcon={
          isLoading ? (
            <CircularProgress size={20} />
          ) : currentQuestionIndex === -1 ? (
            <PlayArrowIcon />
          ) : (
            <SkipNextIcon />
          )
        }
        onClick={onNextQuestion}
        disabled={isLoading || !hasQuestions}
        sx={{
          ...buttonBaseStyles,
          backgroundColor: currentQuestionIndex === -1 ? "#10B981" : "#3B82F6",
          "&:hover": {
            backgroundColor:
              currentQuestionIndex === -1 ? "#059669" : "#2563EB",
            ...buttonBaseStyles["&:hover"],
          },
        }}
      >
        {currentQuestionIndex === -1 ? "➡️ Start Game" : "➡️ Next Question"}
      </Button>

      {!hasQuestions && (
        <Box
          sx={{
            padding: "8px",
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "12px", color: "#B91C1C" }}>
            No questions configured for this session.
          </span>
        </Box>
      )}

      {/* Allow Top Team Button - Only in BUZZER_ROUND */}
      {gameStatus === "buzzer_round" && (
        <Button
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={20} /> : <BoltIcon />}
          onClick={onAllowTopTeam}
          disabled={isLoading || !hasFastestTeam}
          sx={{
            ...buttonBaseStyles,
            backgroundColor: hasFastestTeam ? "#10B981" : "#9CA3AF",
            border: hasFastestTeam ? "3px solid #34D399" : "none",
            animation: hasFastestTeam
              ? "pulse-green 2s ease-in-out infinite"
              : "none",
            "@keyframes pulse-green": {
              "0%, 100%": {
                borderColor: "#34D399",
                boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.4)",
              },
              "50%": {
                borderColor: "#10B981",
                boxShadow: "0 0 0 8px rgba(16, 185, 129, 0)",
              },
            },
            "&:hover": {
              backgroundColor: hasFastestTeam ? "#059669" : "#9CA3AF",
              ...buttonBaseStyles["&:hover"],
            },
          }}
        >
          ⚡ Allow Top Team to Answer
        </Button>
      )}

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

      {/* Pass to Second Team Button - Conditional (now shows after admin marks wrong) */}
      {(gameStatus === "answering" || gameStatus === "idle") && (
        <Button
          variant="contained"
          startIcon={
            isLoading ? <CircularProgress size={20} /> : <SwapHorizIcon />
          }
          onClick={onPassToSecondTeam}
          disabled={isLoading || !canPassToSecondTeam || !lastAnswerWasWrong}
          sx={{
            ...buttonBaseStyles,
            backgroundColor:
              canPassToSecondTeam && lastAnswerWasWrong ? "#F97316" : "#9CA3AF",
            border:
              canPassToSecondTeam && lastAnswerWasWrong
                ? "3px solid #FBBF24"
                : "none",
            animation:
              canPassToSecondTeam && lastAnswerWasWrong
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
              backgroundColor:
                canPassToSecondTeam && lastAnswerWasWrong
                  ? "#EA580C"
                  : "#9CA3AF",
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
              : "Mark answer first before passing"}
          </span>
        </Box>
      )}
    </Box>
  );
};

export default RemoteActionButtons;
