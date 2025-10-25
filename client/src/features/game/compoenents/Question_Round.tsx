import React, { useState, useEffect } from "react";
import { Box, Typography, LinearProgress } from "@mui/material";
import Question, { QuestionData } from "../../question/components/Question";
import normalBg from "../../../assets/background/normal_bg.webp";
import coinImage from "../../../assets/questions/coin.webp";
import starImage from "../../../assets/questions/star.webp";
import doubleCoin from "../../../assets/questions/double_coin.webp";

interface QuestionRoundProps {
  questionData: QuestionData;
  teamName: string;
  teamNumber: number;
  totalPoints: number;
  questionPoints: number;
  timeLimit?: number; // in seconds
  timeRemaining?: number; // externally controlled time remaining (overrides internal timer)
  onTimeUp?: () => void;
  onAnswerSelect?: (answer: string) => void;
  selectedAnswer?: string;
  disabled?: boolean;
}

const QuestionRound: React.FC<QuestionRoundProps> = ({
  questionData,
  teamName,
  teamNumber,
  totalPoints,
  questionPoints,
  timeLimit = 30,
  timeRemaining: externalTimeRemaining,
  onTimeUp,
  onAnswerSelect,
  selectedAnswer,
  disabled = false,
}) => {
  const [internalTimeRemaining, setInternalTimeRemaining] = useState(timeLimit);
  const [isRunning, setIsRunning] = useState(true);

  // Use external time if provided, otherwise use internal
  const timeRemaining = externalTimeRemaining !== undefined ? externalTimeRemaining : internalTimeRemaining;

  // Progress calculation (100 to 0 as time decreases)
  const progress = (timeRemaining / timeLimit) * 100;

  // Color transition based on remaining time
  const getProgressColor = (): string => {
    if (progress > 80) return "#4BBC5E"; // Green
    if (progress > 60) return "#CCA600"; // Light green
    if (progress > 40) return "#F18E16"; // Yellow/Orange
    if (progress > 20) return "#FF4646"; // Orange
    return "#F30000"; // Red
  };

  useEffect(() => {
    // Only run internal timer if external time is not provided
    if (externalTimeRemaining !== undefined) {
      return;
    }

    let interval: NodeJS.Timeout;

    if (isRunning && internalTimeRemaining > 0) {
      interval = setInterval(() => {
        setInternalTimeRemaining((prev) => {
          const newTime = prev - 0.1; // Update every 100ms for smooth animation

          if (newTime <= 0) {
            setIsRunning(false);
            if (onTimeUp) {
              onTimeUp();
            }
            return 0;
          }

          return newTime;
        });
      }, 100);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, internalTimeRemaining, onTimeUp, externalTimeRemaining]);

  const handleAnswerSelect = (answer: string) => {
    setIsRunning(false); // Stop timer when answer is selected
    if (onAnswerSelect) {
      onAnswerSelect(answer);
    }
  };

  return (
    <Box
      sx={{
        // position: "fixed",
        // top: 0,
        // left: 0,
        width: "100vw",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #87CEEB 0%, #4682B4 100%)",
        backgroundImage: `url(${normalBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        justifyContent: "space-between",
        pt: "16px",
      }}
    >
      {/* Top Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px 16px 20px",
          zIndex: 5,
        }}
      >
        {/* Left side - Coins */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <Box
            component="img"
            src={coinImage}
            alt="Coin"
            sx={{
              width: "24px",
              height: "24px",
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: "white",
              fontWeight: "bold",
              fontSize: "18px",
            }}
          >
            X {questionPoints}
          </Typography>
        </Box>

        {/* Right side - Total Points */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            boxShadow: "2px 4px 1px 0px #00000033",
            borderRadius: "20px",
            padding: "2px 10px 2px 2px",
            gap: 1,
          }}
        >
          <Box
            component="img"
            src={doubleCoin}
            alt=""
            sx={{
              width: "26px",
              height: "26px",
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: "#991CAF",
              fontWeight: "bold",
              fontSize: "16px",
            }}
          >
            {totalPoints}
          </Typography>
        </Box>
      </Box>
      {/* Top Progress Bar */}
      <Box
        sx={{
          zIndex: 10,
          mx: "24px",
        }}
      >
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: "15px",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            "& .MuiLinearProgress-bar": {
              backgroundColor: getProgressColor(),
              transition: "background-color 0.3s ease, transform 0.1s ease-out",
            },
          }}
        />
      </Box>

      {/* Main Content - Question */}
      <Box
        sx={{
          flex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: {
            xs: "20px 16px",
            sm: "30px 20px",
            md: "40px 24px",
          },
        }}
      >
        <Question
          questionData={questionData}
          selectedOptionId={selectedAnswer}
          onOptionSelect={handleAnswerSelect}
          disabled={disabled || timeRemaining <= 0}
        />
      </Box>

      {/* Bottom Team Info */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 24px 8px 24px",
          backgroundColor: "#B7DFFF",
          color: "white",
        }}
      >
        {/* Team Avatar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box
            sx={{
              p: "2px 8px",
              borderRadius: "20px",
              backgroundColor: "white", // Purple avatar background
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
            }}
          >
            <Box
              component="img"
              src={starImage}
              alt=""
              sx={{
                width: "16px",
                height: "16px",
              }}
            />
            <Typography
              variant="h6"
              sx={{
                color: "purple",
                fontWeight: "bold",
                fontSize: "16px",
              }}
            >
              {teamNumber}
            </Typography>
          </Box>
        </Box>

        {/* Team Info */}
        <Box>
          <Typography
            variant="body2"
            sx={{
              color: "black",
              fontSize: "12px",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            TEAM: {teamName}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default QuestionRound;
