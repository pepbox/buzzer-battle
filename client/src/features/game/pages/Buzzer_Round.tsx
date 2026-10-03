import React, { useState, useEffect } from "react";
import { Box, Alert, Chip, Typography, Backdrop, CircularProgress, useTheme } from "@mui/material";
import Question, { QuestionData } from "../../question/components/Question";
import Buzzer from "../../../components/ui/Buzzer";
import SpinWheel from "../components/SpinWheel";
import normalBg from "../../../assets/background/question_bg.webp";
import { useFetchCurrentQuestionQuery } from "../../question/services/questions.api";
import { usePressBuzzerMutation } from "../services/buzzerApi";
import { useSpinWheelMutation } from "../services/gameStateApi";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import Loader from "../../../components/ui/Loader";
import Error from "../../../components/ui/Error";
import { websocketService } from "../../../services/websocket/websocketService";

// Admin-controlled buzzer round - no timer, admin clicks "Allow Top Team" to proceed

const BuzzerRound: React.FC = () => {
  const theme = useTheme();
  const [buzzerPressed, setBuzzerPressed] = useState(false);
  const [buzzerError, setBuzzerError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [spinWheel, { isLoading: isSpinning }] = useSpinWheelMutation();

  // Get current team and game state from Redux
  const team = useAppSelector((state: RootState) => state.team.team);
  const gameState = useAppSelector(
    (state: RootState) => state.gameState.gameState,
  );

  // Press buzzer mutation
  const [pressBuzzer, { isLoading: isPressing }] = usePressBuzzerMutation();

  // Fetch current question
  const {
    data: questionData,
    isLoading,
    isFetching,
    error,
  } = useFetchCurrentQuestionQuery();

  const handleSpinWheel = async () => {
    try {
      await spinWheel().unwrap();
    } catch (err: any) {
      setBuzzerError(err?.data?.message || "Failed to spin wheel.");
    }
  };

  const question = questionData?.data?.question;
  const currentQuestionIndex = questionData?.data?.currentQuestionIndex;
  const expectedQuestionIndex = gameState?.currentQuestionIndex;
  const isQuestionTransitioning =
    expectedQuestionIndex !== undefined &&
    expectedQuestionIndex >= 0 &&
    currentQuestionIndex !== expectedQuestionIndex;
  const activeQuestion = isQuestionTransitioning ? undefined : question;
  const isHiddenQuestion =
    activeQuestion?.hideFromUsers === true ||
    gameState?.isQuestionVisible === false;

  const questionDataFormatted: QuestionData = {
    id: activeQuestion?._id || "",
    isHiddenPlaceholder: isHiddenQuestion,
    text: isHiddenQuestion
      ? "Question is visible on the presenter screen."
      : activeQuestion?.questionContent?.text || activeQuestion?.questionText,
    image: isHiddenQuestion ? undefined : activeQuestion?.questionImage,
    video: isHiddenQuestion ? undefined : activeQuestion?.quetionVideo,
    media: isHiddenQuestion
      ? undefined
      : activeQuestion?.questionContent?.media?.length
      ? activeQuestion.questionContent.media
      : activeQuestion?.questionAssets?.filter((item: any) =>
          ["image", "video", "audio", "gif", "text", "file"].includes(
            item?.type,
          ),
        ),
    score: activeQuestion?.score,
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

  const isBuzzerPerson = team?.playerRole !== "TEAM_MEMBER";

  const handleBuzzerPress = async () => {
    if (buzzerPressed || !team || isPressing || isLocked || !isBuzzerPerson) return;

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

  const isSpinWheelMode =
    gameState?.roundType === "SPIN_WHEEL" || gameState?.isSpinWheelEnabled;

  // Show loading state
  if (isLoading && !activeQuestion && !isSpinWheelMode) {
    return <Loader />;
  }

  // Show error state
  if (
    !isSpinWheelMode &&
    (error ||
      (!activeQuestion &&
        !isFetching &&
        !isQuestionTransitioning))
  ) {
    return (
      <Box
        minHeight={"100%"}
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
        {/* Spin Wheel Header Banner */}
        {isSpinWheelMode && (
          <Box
            sx={{
              width: "100%",
              maxWidth: "600px",
              mb: 3,
              p: 2,
              borderRadius: "16px",
              backgroundColor: "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Chip
              label="🎰 SPIN WHEEL MODE ACTIVE"
              color="secondary"
              sx={{ fontWeight: "bold", fontSize: "0.85rem" }}
            />
            {gameState?.selectedCategory && (
              <Typography variant="h6" fontWeight="bold" color="primary.main">
                Selected Category: 🎯 {gameState.selectedCategory}
              </Typography>
            )}
          </Box>
        )}

        {/* Question Section */}
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          {activeQuestion &&
            (!isSpinWheelMode ||
              (gameState?.selectedCategory && !gameState?.spinPermissionGranted)) && (
              <Question
                key={questionDataFormatted.id}
                questionData={questionDataFormatted}
                questionNumber={(currentQuestionIndex || 0) + 1}
                showOptions={Boolean(questionDataFormatted?.options && questionDataFormatted.options.length > 0)}
                showVerbalHint={false}
                disabled={true}
              />
            )}
        </Box>

        {/* Action Section: Buzzer or Spin Wheel according to active round mode */}
        <Box
          bottom={10}
          sx={{
            zIndex: "10",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginTop: "-15px",
            marginBottom: "16px",
          }}
        >
          {isSpinWheelMode ? (
            /* SPIN WHEEL ROUND ACTION */
            (() => {
              const normalizeId = (val: any): string => {
                if (!val) return "";
                if (typeof val === "string") return val;
                if (typeof val === "object") {
                  if (val._id) return String(val._id);
                  if (val.id) return String(val.id);
                }
                return String(val);
              };

              const myTeamId = normalizeId(team?._id);
              const targetSpinTeamId =
                normalizeId((gameState as any)?.canSpinTeam) ||
                normalizeId(gameState?.currentAnsweringTeam);

              const isMyTeamTurn = !targetSpinTeamId || targetSpinTeamId === myTeamId;
              const isGameStarted =
                (currentQuestionIndex !== undefined && currentQuestionIndex >= 0) ||
                !!gameState?.spinPermissionGranted;

              if (!isGameStarted) {
                return (
                  <Box
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "16px",
                      padding: "20px 24px",
                      textAlign: "center",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                      maxWidth: "420px",
                      width: "100%",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: theme.palette.primary.main,
                        fontWeight: 800,
                      }}
                    >
                      ⏳ Waiting for the administrator to start the game...
                    </Typography>
                  </Box>
                );
              }

              return (
                <SpinWheel
                  categories={gameState?.availableCategories}
                  selectedCategory={gameState?.selectedCategory}
                  spinPermissionGranted={gameState?.spinPermissionGranted}
                  canSpin={isMyTeamTurn && !!gameState?.spinPermissionGranted}
                  isBuzzerPerson={isBuzzerPerson}
                  isMyTeamTurn={isMyTeamTurn}
                  onSpin={handleSpinWheel}
                  isSpinning={isSpinning}
                />
              );
            })()
          ) : (
            /* BUZZER ROUND ACTION */
            isBuzzerPerson ? (
              <Buzzer
                size="large"
                onPress={handleBuzzerPress}
                showPressText={true}
                disabled={
                  buzzerPressed || isPressing || isLocked || isQuestionTransitioning
                }
              />
            ) : (
              <Box
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  borderRadius: "16px",
                  padding: "20px 24px",
                  textAlign: "center",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  maxWidth: "360px",
                  width: "100%",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: theme.palette.primary.main,
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1.5,
                  }}
                >
                  <span>⏳</span> Waiting for Team Captain to buzz...
                </Typography>
              </Box>
            )
          )}
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
        open={
          isLocked || isQuestionTransitioning || (isFetching && !activeQuestion)
        }
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
