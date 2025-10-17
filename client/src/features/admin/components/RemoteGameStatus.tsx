import React from "react";
import { Box, Typography } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

interface RemoteGameStatusProps {
  gameStatus: "paused" | "buzzer_round" | "answering";
}

const RemoteGameStatus: React.FC<RemoteGameStatusProps> = ({ gameStatus }) => {
  const getStatusConfig = () => {
    switch (gameStatus) {
      case "buzzer_round":
        return {
          label: "BUZZER ROUND",
          color: "#10B981",
          icon: "🎯",
          bgColor: "rgba(16, 185, 129, 0.1)",
        };
      case "answering":
        return {
          label: "ANSWERING",
          color: "#3B82F6",
          icon: "✍️",
          bgColor: "rgba(59, 130, 246, 0.1)",
        };
      case "paused":
        return {
          label: "PAUSED",
          color: "#F59E0B",
          icon: "⏸️",
          bgColor: "rgba(245, 158, 11, 0.1)",
        };
      default:
        return {
          label: "UNKNOWN",
          color: "#6B7280",
          icon: "❓",
          bgColor: "rgba(107, 114, 128, 0.1)",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Box
      sx={{
        margin: "16px",
        padding: "16px",
        backgroundColor: config.bgColor,
        border: `2px solid ${config.color}`,
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
      }}
    >
      {/* Status Icon */}
      <Typography sx={{ fontSize: "28px" }}>{config.icon}</Typography>

      {/* Status Label */}
      <Box>
        <Typography
          variant="caption"
          sx={{
            fontSize: "10px",
            color: "#64748B",
            display: "block",
          }}
        >
          Game Status
        </Typography>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: config.color,
            fontSize: "18px",
          }}
        >
          {config.label}
        </Typography>
      </Box>

      {/* Animated Indicator */}
      <FiberManualRecordIcon
        sx={{
          color: config.color,
          fontSize: "16px",
          animation: "pulse 2s ease-in-out infinite",
          "@keyframes pulse": {
            "0%, 100%": {
              opacity: 1,
            },
            "50%": {
              opacity: 0.3,
            },
          },
        }}
      />
    </Box>
  );
};

export default RemoteGameStatus;
