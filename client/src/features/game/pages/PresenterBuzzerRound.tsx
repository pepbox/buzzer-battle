import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import QuestionBuzzer from "../../question/components/Question_Buzzer";
import normalBg from "../../../assets/background/question_bg.webp";
import { useFetchCurrentQuestionQuery } from "../../question/services/questions.api";
import { useFetchOverallLeaderboardQuery } from "../services/teamApi";
import Loader from "../../../components/ui/Loader";
import Error from "../../../components/ui/Error";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
// import { useTimerSync } from "../../../hooks/useTimerSync";

const PresenterBuzzerRound: React.FC = () => {
  // Get game state from Redux
  const gameState = useAppSelector(
    (state: RootState) => state.gameState.gameState,
  );

  // Fetch current question - refetch when question index changes
  const {
    data: questionData,
    isLoading,
    error,
    refetch,
  } = useFetchCurrentQuestionQuery();
  const { data: leaderboardData } = useFetchOverallLeaderboardQuery();

  // Force refetch when question index changes to ensure fresh data
  useEffect(() => {
    if (
      gameState?.currentQuestionIndex !== undefined &&
      gameState?.currentQuestionIndex >= 0
    ) {
      refetch();
    }
  }, [gameState?.currentQuestionIndex, refetch]);

  const question = questionData?.data?.question;
  // Use game state's currentQuestionIndex as source of truth, fallback to API response
  const currentQuestionIndex =
    (gameState?.currentQuestionIndex ??
      questionData?.data?.currentQuestionIndex ??
      0) + 1;
  const isAnsweringState = gameState?.gameStatus === "answering";

  const normalizeId = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      if (typeof value._id === "string") return value._id;
      if (value._id) return String(value._id);
      if (value.id) return String(value.id);
      return String(value);
    }
    return String(value);
  };

  const leaderboardTeams = leaderboardData?.data?.leaderboard || [];
  const currentAnsweringTeam = gameState?.currentAnsweringTeam as
    | { teamNumber?: number; teamName?: string }
    | string
    | undefined;

  const resolvedTeam =
    typeof currentAnsweringTeam === "object" && currentAnsweringTeam
      ? currentAnsweringTeam
      : leaderboardTeams.find(
          (team) => normalizeId(team._id) === normalizeId(currentAnsweringTeam),
        );

  const answeringTeamLabel = resolvedTeam
    ? `Team #${resolvedTeam.teamNumber ?? "-"}${resolvedTeam.teamName ? ` - ${resolvedTeam.teamName}` : ""}`
    : "Selected team";

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
        overflow: "auto",
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
          justifyContent: "flex-start",
          padding: {
            xs: "20px 16px 40px 16px",
            sm: "30px 20px 50px 20px",
            md: "40px 24px 60px 24px",
          },
          position: "relative",
        }}
      >
        {isAnsweringState && (
          <Typography
            sx={{
              color: "#FFFFFF",
              fontWeight: 800,
              fontSize: { xs: "20px", sm: "24px", md: "28px" },
              textAlign: "center",
              textShadow: "2px 2px 8px rgba(0, 0, 0, 0.8)",
              mb: 3,
              mt: 1,
            }}
          >
            {answeringTeamLabel} is answering
          </Typography>
        )}

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
            questionText={
              question?.questionContent?.text || question?.questionText || ""
            }
            questionImage={question?.questionImage}
            questionVideo={question?.quetionVideo}
            questionMedia={
              question?.questionContent?.media?.length
                ? question.questionContent.media
                : question?.questionAssets
            }
          />
        </Box>

        {/* No Buzzer in Presenter Mode */}
      </Box>
    </Box>
  );
};

export default PresenterBuzzerRound;
