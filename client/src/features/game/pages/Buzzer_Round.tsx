import React, { useState, useEffect } from "react";
import { Box, Alert } from "@mui/material";
import Question, { QuestionData } from "../../question/components/Question";
import Buzzer from "../../../components/ui/Buzzer";
import normalBg from "../../../assets/background/question_bg.webp";
import { useFetchCurrentQuestionQuery } from "../../question/services/questions.api";
import { usePressBuzzerMutation } from "../services/buzzerApi";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import Loader from "../../../components/ui/Loader";
import Error from "../../../components/ui/Error";
import { websocketService } from "../../../services/websocket/websocketService";
import { Typography, Backdrop, CircularProgress } from "@mui/material";

// Admin-controlled buzzer round - no timer, admin clicks "Allow Top Team" to proceed

const BuzzerRound: React.FC = () => {
  const [buzzerPressed, setBuzzerPressed] = useState(false);
  const [buzzerError, setBuzzerError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Get current team and game state from Redux
  const team = useAppSelector((state: RootState) => state.team.team);
  const gameState = useAppSelector(
    (state: RootState) => state.gameState.gameState,
  );

  // Fetch current question
  const {
    data: questionData,
    isLoading,
    error,
  } = useFetchCurrentQuestionQuery();

  // Press buzzer mutation
  const [pressBuzzer, { isLoading: isPressing }] = usePressBuzzerMutation();

  const question = questionData?.data?.question;
  const currentQuestionIndex = questionData?.data?.currentQuestionIndex;

  const questionDataFormatted: QuestionData = {
    id: question?._id || "",
    text: question?.questionContent?.text || question?.questionText,
    image: question?.questionImage,
    video: question?.quetionVideo,
    media: question?.questionContent?.media?.length
      ? question.questionContent.media
      : question?.questionAssets?.filter((item: any) =>
          ["image", "video", "audio", "gif", "text", "file"].includes(
            item?.type,
          ),
        ),
    score: question?.score,
    options: [],
  };

  // Reset buzzer state when question changes
  useEffect(() => {
    setBuzzerPressed(false);
    setBuzzerError(null);
  }, [currentQuestionIndex]);

  // Sync countdown logic
  useEffect(() => {
    if (gameState?.buzzerRoundStartTime) {
      const checkLock = () => {
        const now = websocketService.getSynchronizedTime();
        const start = Number(gameState.buzzerRoundStartTime);
        if (now < start) {
          setIsLocked(true);
        } else {
          setIsLocked(false);
        }
      };

      checkLock();
      const interval = setInterval(checkLock, 100);
      return () => clearInterval(interval);
    } else {
      setIsLocked(false);
    }
  }, [gameState?.buzzerRoundStartTime]);

  const handleBuzzerPress = async () => {
    if (buzzerPressed || !team || isPressing || isLocked) return;

    setBuzzerPressed(true);
    setBuzzerError(null);

    try {
      // Call API to press buzzer using synchronized time
      const syncTime = websocketService.getSynchronizedTime();
      const timestamp = syncTime.toString();
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
        width: "100%",
        flex: "1 0 auto",
        minHeight: "100%",
        background: "linear-gradient(180deg, #87CEEB 0%, #4682B4 100%)",
        backgroundImage: `url(${normalBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* Error Alert */}
      {buzzerError && (
        <Box sx={{ m: "24px" }}>
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
            marginBottom: "20px",
          }}
        >
          <Question
            questionData={questionDataFormatted}
            questionNumber={(currentQuestionIndex || 0) + 1}
            showOptions={false}
            showVerbalHint={false}
            disabled={true}
          />
        </Box>

        {/* Buzzer Section */}
        <Box
          bottom={10}
          sx={{
            zIndex: "10",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginTop: "45px",
            marginBottom: "16px",
          }}
        >
          <Buzzer
            size="large"
            onPress={handleBuzzerPress}
            showPressText={true}
            disabled={buzzerPressed || isPressing || isLocked}
          />
        </Box>
      </Box>

      {/* Synchronized Reveal Overlay */}
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: "column",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        }}
        open={isLocked}
      >
        <CircularProgress
          size={80}
          sx={{ color: "#FFD700", marginBottom: 3 }}
        />
        <Typography variant="h4" fontWeight="medium" letterSpacing={1.5}>
          Loading Question...
        </Typography>
      </Backdrop>
    </Box>
  );
};

export default BuzzerRound;
