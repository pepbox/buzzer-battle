import React, { useState, useEffect } from "react";
import { Box, LinearProgress, Alert } from "@mui/material";
import QuestionBuzzer from "../../question/components/Question_Buzzer";
import Buzzer from "../../../components/ui/Buzzer";
import normalBg from "../../../assets/background/question_bg.webp";
import { useFetchCurrentQuestionQuery } from "../../question/services/questions.api";
import { usePressBuzzerMutation } from "../services/buzzerApi";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import Loader from "../../../components/ui/Loader";
import Error from "../../../components/ui/Error";
import { useTimerSync } from "../../../hooks/useTimerSync";

const BuzzerRound: React.FC = () => {
  const [buzzerPressed, setBuzzerPressed] = useState(false);
  const [buzzerError, setBuzzerError] = useState<string | null>(null);

  // Get current team and game state from Redux
  const team = useAppSelector((state: RootState) => state.team.team);
  const gameState = useAppSelector(
    (state: RootState) => state.gameState.gameState
  );

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
  const currentQuestionIndex = questionData?.data?.currentQuestionIndex;

  // Use synced timer with server timestamp
  const { progress, isExpired } = useTimerSync(
    gameState?.buzzerRoundStartTime,
    timeLimit
  );

  // Reset buzzer state when question changes
  useEffect(() => {
    setBuzzerPressed(false);
    setBuzzerError(null);
  }, [currentQuestionIndex]);

  const handleBuzzerPress = async () => {
    if (buzzerPressed || !team || isPressing || isExpired) return;

    setBuzzerPressed(true);
    setBuzzerError(null);

    try {
      // Call API to press buzzer
      const timestamp = Date.now().toString();
      await pressBuzzer({ timestamp }).unwrap();

      // GameStateRouter will handle navigation to buzzer-leaderboard
      // based on the updated buzzer queue data
    } catch (error: any) {
      // Handle error
      const errorMessage =
        error?.data?.message || "Failed to press buzzer. Please try again.";
      setBuzzerError(errorMessage);
      setBuzzerPressed(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return <Loader />;
  }

  // Show error state
  if (error || !question) {
    return (
      <Box
        minHeight={"100vh"}
        flex={1}
        display={"flex"}
        justifyContent={"center"}
        alignItems={"center"}
      >
        <Error />
      </Box>
    );
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
        overflow: "auto",
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
            questionNumber={(currentQuestionIndex || 0) + 1}
            questionText={question?.questionText || ""}
            questionImage={question?.questionImage}
            questionVideo={question?.quetionVideo}
          />
        </Box>

        {/* Buzzer Section */}
        <Box
          // position={"absolute"}
          bottom={10}
          sx={{
            zIndex: "10",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginTop: "45px",
            // marginBottom: { xs: "24px", sm: "32px", md: "48px" },
            marginBottom: "16px"
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
