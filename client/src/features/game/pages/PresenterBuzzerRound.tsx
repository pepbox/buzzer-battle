import React from "react";
import { Box } from "@mui/material";
import QuestionBuzzer from "../../question/components/Question_Buzzer";
import normalBg from "../../../assets/background/question_bg.webp";
import { useFetchCurrentQuestionQuery } from "../../question/services/questions.api";
import Loader from "../../../components/ui/Loader";
import Error from "../../../components/ui/Error";
// import { useAppSelector } from "../../../app/hooks";
// import { RootState } from "../../../app/store";
// import { useTimerSync } from "../../../hooks/useTimerSync";

const PresenterBuzzerRound: React.FC = () => {
  // Get game state from Redux
  // const gameState = useAppSelector(
  //   (state: RootState) => state.gameState.gameState
  // );

  // Fetch current question
  const {
    data: questionData,
    isLoading,
    error,
  } = useFetchCurrentQuestionQuery();

  const question = questionData?.data?.question;
  const currentQuestionIndex = questionData?.data?.currentQuestionIndex || 1;

  // const timeLimit = 30;

  // Use synced timer with server timestamp
  // const { progress } = useTimerSync(gameState?.buzzerRoundStartTime, timeLimit);

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
        // position: "fixed",
        // top: 0,
        // left: 0,
        width: "100%",
        height: "100%",
        // background: "linear-gradient(180deg, #87CEEB 0%, #4682B4 100%)",
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
      {/* <Box
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
      </Box> */}

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
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
          }}
        >
          <QuestionBuzzer
            questionNumber={currentQuestionIndex}
            questionText={question?.questionText || ""}
            questionImage={question?.questionImage}
            questionVideo={question?.quetionVideo}
          />
        </Box>

        {/* No Buzzer in Presenter Mode */}
      </Box>
    </Box>
  );
};

export default PresenterBuzzerRound;
