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
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
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
          maxWidth: "400px",
          width: "calc(100% - 32px)",
          boxSizing: "border-box",
          animation: "statusCardPop 350ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          "@keyframes statusCardPop": {
            from: { opacity: 0, transform: "scale(0.85)" },
            to: { opacity: 1, transform: "scale(1)" },
          },
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

interface AnswerStatusCardProps {
  setAnswerStatus?: (status: any) => void;
  isMyTeam?: boolean;
  teamName?: string;
}

// After the status card has been shown, move the answer flow to the "result" phase.
const useAdvanceToResult = (setAnswerStatus?: (status: any) => void) => {
  useEffect(() => {
    if (!setAnswerStatus) return;
    const timer = setTimeout(() => {
      setAnswerStatus("result");
    }, 5000);
    return () => clearTimeout(timer);
  }, [setAnswerStatus]);
};

export const NailedIt = ({ setAnswerStatus }: AnswerStatusCardProps) => {
  useAdvanceToResult(setAnswerStatus);

  return (
    <StatusCard
      type="correct"
      mainText="Nailed it!"
      subText="You’re on fire…"
      emoji="🔥"
    />
  );
};

export const CloseCall = ({ setAnswerStatus }: AnswerStatusCardProps = {}) => {
  useAdvanceToResult(setAnswerStatus);

  return (
    <StatusCard
      type="incorrect"
      mainText="Close call!"
      subText="You’ll get the next one…"
      emoji="🚀"
    />
  );
};

export default StatusCard;
