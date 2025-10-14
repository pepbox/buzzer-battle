import React, { useState, useEffect } from "react";
import { Box, LinearProgress, Alert } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import QuestionBuzzer from "../../question/components/Question_Buzzer";
import Buzzer from "../../../components/ui/Buzzer";
import normalBg from "../../../assets/background/question_bg.webp";
import { useFetchCurrentQuestionQuery } from "../../question/services/questions.api";
import { usePressBuzzerMutation } from "../services/buzzerApi";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import Loader from "../../../components/ui/Loader";
import Error from "../../../components/ui/Error";

const BuzzerRound: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [buzzerPressed, setBuzzerPressed] = useState(false);
  const [buzzerError, setBuzzerError] = useState<string | null>(null);
  const [timeIsUp, setTimeIsUp] = useState(false);

  // Get current team from Redux
  const team = useAppSelector((state: RootState) => state.team.team);

  // Fetch current question
  const {
    data: questionData,
    isLoading,
    error,
  } = useFetchCurrentQuestionQuery();

  // Press buzzer mutation
  const [pressBuzzer, { isLoading: isPressing }] = usePressBuzzerMutation();

  const timeLimit = 30;
  const question = questionData?.data?.question;
  const currentQuestionIndex = questionData?.data?.currentQuestionIndex || 1;

  // Progress calculation (0 to 100)
  const progress = (timeElapsed / timeLimit) * 100;

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeElapsed < timeLimit && !buzzerPressed) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => {
          const newTime = prev + 0.1; // Update every 100ms for smooth animation

          if (newTime >= timeLimit) {
            setIsRunning(false);
            setTimeIsUp(true); // Set flag instead of navigating
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
  }, [isRunning, timeElapsed, timeLimit, buzzerPressed]);

  // Navigate when time is up (separate effect to avoid setState during render)
  useEffect(() => {
    if (timeIsUp) {
      navigate(`/game/${sessionId}/leaderboard`);
    }
  }, [timeIsUp, navigate, sessionId]);

  const handleBuzzerPress = async () => {
    if (buzzerPressed || !team || isPressing) return;

    setIsRunning(false); // Stop the timer when buzzer is pressed
    setBuzzerPressed(true);
    setBuzzerError(null);

    try {
      // Call API to press buzzer
      const timestamp = Date.now().toString();
      await pressBuzzer({ timestamp }).unwrap();

      // Navigate to buzzer leaderboard on success
      setTimeout(() => {
        navigate(`/game/${sessionId}/buzzer-leaderboard`);
      }, 500);
    } catch (error: any) {
      // Handle error
      const errorMessage =
        error?.data?.message || "Failed to press buzzer. Please try again.";
      setBuzzerError(errorMessage);
      setBuzzerPressed(false);
      setIsRunning(true); // Resume timer on error
    }
  };

  // Show loading state
  if (isLoading) {
    return <Loader />;
  }

  // Show error state
  if (error || !question) {
    return <Error />;
  }

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

      {/* Error Alert */}
      {buzzerError && (
        <Box sx={{ m: "0 24px" }}>
          <Alert severity="error" onClose={() => setBuzzerError(null)}>
            {buzzerError}
          </Alert>
        </Box>
      )}

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
            questionNumber={currentQuestionIndex}
            questionText={question?.questionText || ""}
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
            disabled={buzzerPressed || isPressing}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default BuzzerRound;
