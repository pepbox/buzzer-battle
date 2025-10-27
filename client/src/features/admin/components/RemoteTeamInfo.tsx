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
  buzzerTimestamp?: string;
}

const RemoteTeamInfo: React.FC<RemoteTeamInfoProps> = ({
  currentAnsweringTeam,
  buzzerTimestamp,
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
          {currentAnsweringTeam.teamNumber}
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
            Team #{currentAnsweringTeam.teamNumber} • Score:{" "}
            {currentAnsweringTeam.teamScore}
          </Typography>
        </Box>

        {/* Buzzer Time (if available) */}
        {buzzerTimestamp && (
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
              {new Date(parseInt(buzzerTimestamp)).toLocaleTimeString()}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default RemoteTeamInfo;
