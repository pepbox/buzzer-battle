import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import timeOutBg from "../../../assets/background/time_out_bg.webp";
import correctBg from "../../../assets/background/correct_bg.webp";
import incorrectBg from "../../../assets/background/incorrect_bg.webp";

interface StatusCardProps {
  type: "timeout" | "correct" | "incorrect";
  mainText: string;
  subText: string;
  emoji: string;
}

const bgMap = {
  timeout: timeOutBg,
  correct: correctBg,
  incorrect: incorrectBg,
};

const colorMap = {
  timeout: {
    main: "#EF4444",
    sub: "#EF4444",
    border: "#EF4444",
  },
  correct: {
    main: "#10B981",
    sub: "#10B981",
    border: "#10B981",
  },
  incorrect: {
    main: "#F59E0B",
    sub: "#F59E0B",
    border: "#F59E0B",
  },
};

const StatusCard: React.FC<StatusCardProps> = ({
  type,
  mainText,
  subText,
  emoji,
}) => {
  const bgImage = bgMap[type];
  const colors = colorMap[type];

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          backgroundColor: "rgba(255,255,255,0.98)",
          borderRadius: "28px",
          border: `5.5px solid ${colors.border}`,
          boxShadow: "0px 3.67px 3.67px 1.83px #00000040",
          padding: {
            xs: "32px 20px",
            sm: "40px 32px",
            md: "48px 40px",
          },
          minWidth: "320px",
          maxWidth: "400px",
          width: "90%",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Emoji */}
        <Typography sx={{ fontSize: "40px", mb: 2 }}>{emoji}</Typography>
        {/* Main Text */}
        <Typography
          variant="h4"
          sx={{
            color: colors.main,
            fontWeight: 700,
            fontSize: "28px",
            mb: 1,
          }}
        >
          {mainText}
        </Typography>
        {/* Sub Text */}
        <Typography
          variant="body1"
          sx={{
            color: colors.sub,
            fontWeight: 700,
            fontSize: "16px",
            mb: 2,
          }}
        >
          {subText}
        </Typography>
      </Box>
    </Box>
  );
};

// Example usages:
export const TimesUp = () => (
  <StatusCard
    type="timeout"
    mainText="Time’s up!"
    subText="Waiting for the next question…"
    emoji="⏳"
  />
);

export const NailedIt = ({
  setAnswerStatus,
}: {
  setAnswerStatus: (status: any) => void;
}) => {
  useEffect(() => {
    setTimeout(() => {
      setAnswerStatus("result");
    }, 5000);
  }, [setAnswerStatus]);

  return (
    <StatusCard
      type="correct"
      mainText="Nailed it!"
      subText="You’re on fire…"
      emoji="🔥"
    />
  );
};

export const CloseCall = () => (
  <StatusCard
    type="incorrect"
    mainText="Close call!"
    subText="You’ll get the next one…"
    emoji="🚀"
  />
);

export default StatusCard;
