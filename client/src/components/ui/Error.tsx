import { Box, Button, Typography } from "@mui/material";
import React from "react";

interface ErrorLayoutProps {
  title?: string;
  message?: string;
  /** When provided, shows a "Try again" button. */
  onRetry?: () => void;
}

const ErrorLayout: React.FC<ErrorLayoutProps> = ({
  title = "Data not available",
  message = "We couldn't load this right now. Please check your connection and try again.",
  onRetry,
}) => {
  return (
    <Box
      sx={{
        flex: 1,
        width: "100%",
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        boxSizing: "border-box",
      }}
    >
      <Box
        role="alert"
        sx={{
          bgcolor: "rgba(17, 24, 39, 0.92)",
          color: "#FFFFFF",
          p: { xs: 3, sm: 4 },
          borderRadius: "16px",
          textAlign: "center",
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Typography sx={{ fontSize: 36, lineHeight: 1, mb: 1.5 }} aria-hidden>
          ⚠️
        </Typography>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
          {message}
        </Typography>
        {onRetry && (
          <Button
            variant="contained"
            onClick={onRetry}
            sx={{ mt: 2.5, borderRadius: "10px", fontWeight: 700, textTransform: "none" }}
          >
            Try again
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default ErrorLayout;
