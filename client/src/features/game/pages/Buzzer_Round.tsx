import React, { useState, useEffect } from "react";
import { Box, LinearProgress } from "@mui/material";
import QuestionBuzzer from "../../question/components/Question_Buzzer";
import Buzzer from "../../../components/ui/Buzzer";
import normalBg from "../../../assets/background/question_bg.webp";

interface BuzzerRoundProps {
  questionNumber?: number;
  questionText?: string;
  timeLimit?: number; // in seconds
  onBuzzerPress?: () => void;
  onTimeUp?: () => void;
}

const BuzzerRound: React.FC<BuzzerRoundProps> = ({
  questionNumber = 1,
  questionText = "Which feature in Figma allows multiple people to work on a design file at the same time?",
  timeLimit = 30,
  onBuzzerPress,
  onTimeUp,
}) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  // Progress calculation (0 to 100)
  const progress = (timeElapsed / timeLimit) * 100;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeElapsed < timeLimit) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => {
          const newTime = prev + 0.1; // Update every 100ms for smooth animation

          if (newTime >= timeLimit) {
            setIsRunning(false);
            if (onTimeUp) {
              onTimeUp();
            }
            return timeLimit;
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
  }, [isRunning, timeElapsed, timeLimit, onTimeUp]);

  const handleBuzzerPress = () => {
    setIsRunning(false); // Stop the timer when buzzer is pressed
    if (onBuzzerPress) {
      onBuzzerPress();
    }
  };

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(180deg, #87CEEB 0%, #4682B4 100%)",
        backgroundImage: `url(${normalBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-around",
        overflow: "hidden",
      }}
    >
      {/* Top Progress Bar */}
      <Box
        sx={{
          m: "24px",
        }}
      >
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: "8px",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            "& .MuiLinearProgress-bar": {
              backgroundColor: (theme) => theme.palette.primary.main,
              transition: "transform 0.1s ease-out",
            },
          }}
        />
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: {
            xs: "20px 16px 40px 16px",
            sm: "30px 20px 50px 20px",
            md: "40px 24px 60px 24px",
          },
          position: "relative",
        }}
      >
        {/* Question Section */}
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginBottom: "32px",
          }}
        >
          <QuestionBuzzer
            questionNumber={questionNumber}
            questionText={questionText}
          />
        </Box>

        {/* Buzzer Section */}
        <Box
          position={"absolute"}
          bottom={30}
          sx={{
            zIndex: "10",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginTop: "auto",
            marginBottom: { xs: "24px", sm: "32px", md: "48px" },
          }}
        >
          <Buzzer
            size="large"
            onPress={handleBuzzerPress}
            showPressText={true}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default BuzzerRound;
