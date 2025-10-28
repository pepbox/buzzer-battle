import React from "react";
import { Box, Typography, Chip } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import GroupsIcon from "@mui/icons-material/Groups";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

interface RemoteBuzzerStatsProps {
  fastestTeam: {
    teamId: string;
    teamNumber: number;
    teamName: string;
    timestamp: string;
    pressedAt: Date;
  } | null;
  teamsPressed: number;
  teamsRemaining: number;
  totalTeams: number;
}

const RemoteBuzzerStats: React.FC<RemoteBuzzerStatsProps> = ({
  fastestTeam,
  teamsPressed,
  teamsRemaining,
  totalTeams,
}) => {
  return (
    <Box
      sx={{
        margin: "16px",
        backgroundColor: "rgba(59, 130, 246, 0.05)",
        border: "2px solid #3B82F6",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          backgroundColor: "#3B82F6",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <BoltIcon sx={{ color: "white", fontSize: "20px" }} />
        <Typography
          variant="h6"
          sx={{
            color: "white",
            fontWeight: 700,
            fontSize: "14px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          🏁 Buzzer Statistics
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ padding: "16px" }}>
        {/* Fastest Team Section */}
        {fastestTeam ? (
          <Box
            sx={{
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              border: "2px solid #10B981",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "12px",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <EmojiEventsIcon sx={{ color: "#10B981", fontSize: "20px" }} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#10B981",
                  textTransform: "uppercase",
                }}
              >
                Fastest Team
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: "#10B981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "16px",
                  color: "white",
                }}
              >
                {fastestTeam.teamNumber}
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 700,
                    fontSize: "15px",
                    color: "#1E293B",
                  }}
                >
                  {fastestTeam.teamName}
                </Typography>
              </Box>

              <Chip
                label="🥇 1st"
                size="small"
                sx={{
                  backgroundColor: "#FBBF24",
                  color: "#78350F",
                  fontWeight: 700,
                  fontSize: "11px",
                }}
              />
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              backgroundColor: "rgba(148, 163, 184, 0.1)",
              border: "2px dashed #94A3B8",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "12px",
              textAlign: "center",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: "#64748B",
                fontSize: "12px",
              }}
            >
              Waiting for teams to press buzzer...
            </Typography>
          </Box>
        )}

        {/* Teams Progress Section */}
        <Box>
          {/* Stats Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
            }}
          >
            {/* Teams Pressed */}
            <Box
              sx={{
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                border: "1px solid #10B981",
                borderRadius: "6px",
                padding: "8px",
                textAlign: "center",
              }}
            >
              <GroupsIcon sx={{ color: "#10B981", fontSize: "18px" }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: "18px",
                  color: "#10B981",
                  marginTop: "4px",
                }}
              >
                {teamsPressed}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "10px",
                  color: "#64748B",
                  display: "block",
                }}
              >
                Pressed
              </Typography>
            </Box>

            {/* Teams Remaining */}
            <Box
              sx={{
                backgroundColor: "rgba(251, 191, 36, 0.1)",
                border: "1px solid #FBBF24",
                borderRadius: "6px",
                padding: "8px",
                textAlign: "center",
              }}
            >
              <HourglassEmptyIcon sx={{ color: "#FBBF24", fontSize: "18px" }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: "18px",
                  color: "#FBBF24",
                  marginTop: "4px",
                }}
              >
                {teamsRemaining}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "10px",
                  color: "#64748B",
                  display: "block",
                }}
              >
                Remaining
              </Typography>
            </Box>

            {/* Total Teams */}
            <Box
              sx={{
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                border: "1px solid #3B82F6",
                borderRadius: "6px",
                padding: "8px",
                textAlign: "center",
              }}
            >
              <GroupsIcon sx={{ color: "#3B82F6", fontSize: "18px" }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: "18px",
                  color: "#3B82F6",
                  marginTop: "4px",
                }}
              >
                {totalTeams}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "10px",
                  color: "#64748B",
                  display: "block",
                }}
              >
                Total
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RemoteBuzzerStats;
