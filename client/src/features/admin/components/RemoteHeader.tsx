import React from "react";
import { Box, Typography } from "@mui/material";

interface RemoteHeaderProps {
  sessionName: string;
  currentQuestionIndex: number;
  totalQuestions: number;
}

const RemoteHeader: React.FC<RemoteHeaderProps> = ({
  sessionName,
  currentQuestionIndex,
  totalQuestions,
}) => {
  const displayQuestionNumber =
    totalQuestions > 0 ? Math.max(0, currentQuestionIndex + 1) : 0;

  return (
    <Box
      sx={{
        backgroundColor: "#1E293B",
        color: "white",
        padding: "16px",
        borderRadius: "0 0 16px 16px",
        // boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* Title */}
      <Typography
        variant="h5"
        sx={{
          color: "white",
          fontWeight: 700,
          textAlign: "center",
          marginBottom: "12px",
          fontSize: "20px",
        }}
      >
        📱 ADMIN REMOTE CONTROL
      </Typography>

      {/* Session Info */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "8px",
          padding: "8px 12px",
        }}
      >
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontSize: "10px",
              opacity: 0.7,
              display: "block",
              color: "white",
            }}
          >
            Session
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: "white",
              fontSize: "14px",
            }}
          >
            {sessionName}
          </Typography>
        </Box>

        <Box sx={{ textAlign: "right" }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: "10px",
              color: "white",
              opacity: 0.7,
              display: "block",
            }}
          >
            Question
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "white",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            {displayQuestionNumber} / {totalQuestions}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default RemoteHeader;
