import React from "react";
import { Box, Typography, Avatar } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

interface RemoteTeamInfoProps {
  currentAnsweringTeam?: {
    _id: string;
    teamNumber: number;
    teamName: string;
    teamScore: number;
  } | null;
  answeringTeamRank?: number;
  buzzerTimestamp?: string;
  buzzerRoundStartTime?: number; // Added for elapsed time calculation
}

// Format elapsed time as MM:SS:CC (minutes:seconds:centiseconds)
const formatElapsedTime = (elapsedMs: number): string => {
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  const centiseconds = Math.floor((elapsedMs % 1000) / 10);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(centiseconds).padStart(2, "0")}`;
};

const RemoteTeamInfo: React.FC<RemoteTeamInfoProps> = ({
  currentAnsweringTeam,
  answeringTeamRank,
  buzzerTimestamp,
  buzzerRoundStartTime,
}) => {
  if (!currentAnsweringTeam) {
    return (
      <Box
        sx={{
          margin: "16px",
          padding: "16px",
          backgroundColor: "rgba(148, 163, 184, 0.1)",
          border: "2px dashed #94A3B8",
          borderRadius: "12px",
          textAlign: "center",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: "#64748B",
            fontWeight: 600,
          }}
        >
          No team is currently answering
        </Typography>
      </Box>
    );
  }

  // Calculate elapsed time
  const elapsedTime =
    buzzerTimestamp && buzzerRoundStartTime
      ? Math.max(0, Number(buzzerTimestamp) - buzzerRoundStartTime)
      : null;

  return (
    <Box
      sx={{
        margin: "16px",
        padding: "16px",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        border: "2px solid #3B82F6",
        borderRadius: "12px",
      }}
    >
      {/* Header */}
      <Typography
        variant="caption"
        sx={{
          fontSize: "10px",
          color: "#64748B",
          display: "block",
          marginBottom: "8px",
        }}
      >
        Current Answering Team
      </Typography>

      {/* Team Info */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {/* Team Avatar */}
        <Avatar
          sx={{
            width: 48,
            height: 48,
            backgroundColor: "#3B82F6",
            fontWeight: 700,
            fontSize: "18px",
          }}
        >
          {answeringTeamRank || currentAnsweringTeam.teamNumber}
        </Avatar>

        {/* Team Details */}
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: "16px",
              color: "#1E293B",
            }}
          >
            {currentAnsweringTeam.teamName}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              fontSize: "12px",
              color: "#64748B",
            }}
          >
            {answeringTeamRank
              ? `Rank #${answeringTeamRank} in buzzer queue`
              : `Team #${currentAnsweringTeam.teamNumber}`}{" "}
            • Score: {currentAnsweringTeam.teamScore}
          </Typography>
        </Box>

        {/* Buzzer Elapsed Time (if available) */}
        {elapsedTime !== null && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              backgroundColor: "white",
              padding: "4px 8px",
              borderRadius: "8px",
            }}
          >
            <AccessTimeIcon sx={{ fontSize: "16px", color: "#3B82F6" }} />
            <Typography
              variant="body2"
              sx={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#1E293B",
              }}
            >
              {formatElapsedTime(elapsedTime)}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default RemoteTeamInfo;
