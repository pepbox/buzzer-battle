import React, { useState, useEffect } from "react";
import { Box, LinearProgress, Alert } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import QuestionBuzzer from "../../question/components/Question_Buzzer";
import Buzzer from "../../../components/ui/Buzzer";
import normalBg from "../../../assets/background/question_bg.webp";
import { useFetchCurrentQuestionQuery } from "../../question/services/questions.api";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";
import Loader from "../../../components/ui/Loader";
import Error from "../../../components/ui/Error";

const BuzzerRound: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [buzzerPressed, setBuzzerPressed] = useState(false);
  const [buzzerError, setBuzzerError] = useState<string | null>(null);

  // Get current team from Redux
  const team = useAppSelector((state: RootState) => state.team.team);
  
  // Fetch current question
  const { data: questionData, isLoading, error } = useFetchCurrentQuestionQuery();

  const timeLimit = 30; // 30 seconds for buzzer round
  const question = questionData?.data?.question;
  const currentQuestionIndex = questionData?.data?.currentQuestionIndex || 1;

  // Progress calculation (0 to 100)
  const progress = (timeElapsed / timeLimit) * 100;

  // Listen for buzzer success/error events
  useEffect(() => {
    const handleBuzzerSuccess = () => {
      setBuzzerPressed(true);
      setBuzzerError(null);
      // Navigate to buzzer leaderboard after short delay
      setTimeout(() => {
        navigate(`/game/${sessionId}/buzzer-leaderboard`);
      }, 1000);
    };

    const handleBuzzerError = (data: { message: string }) => {
      setBuzzerError(data.message || "Failed to press buzzer");
      setIsRunning(true); // Resume timer if buzzer press failed
    };

    websocketService.on(Events.BUZZER_PRESSED_SUCCESS, handleBuzzerSuccess);
    websocketService.on(Events.BUZZER_ERROR, handleBuzzerError);

    return () => {
      websocketService.off(Events.BUZZER_PRESSED_SUCCESS, handleBuzzerSuccess);
      websocketService.off(Events.BUZZER_ERROR, handleBuzzerError);
    };
  }, [navigate, sessionId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeElapsed < timeLimit && !buzzerPressed) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => {
          const newTime = prev + 0.1; // Update every 100ms for smooth animation

          if (newTime >= timeLimit) {
            setIsRunning(false);
            // Time's up - navigate to leaderboard
            navigate(`/game/${sessionId}/leaderboard`);
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
  }, [isRunning, timeElapsed, timeLimit, buzzerPressed, navigate, sessionId]);

  const handleBuzzerPress = () => {
    if (buzzerPressed || !team) return;
    
    setIsRunning(false); // Stop the timer when buzzer is pressed
    setBuzzerPressed(true);
    
    // Emit buzzer press event via WebSocket
    websocketService.emit(Events.PRESS_BUZZER, {
      timestamp: BigInt(Date.now()).toString(),
    });
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
            disabled={buzzerPressed}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default BuzzerRound;
