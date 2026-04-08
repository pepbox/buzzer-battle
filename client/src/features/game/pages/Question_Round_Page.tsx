import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QuestionRound from "../components/Question_Round";
import { QuestionData } from "../../question/components/Question";
import { useFetchCurrentQuestionQuery } from "../../question/services/questions.api";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import Loader from "../../../components/ui/Loader";
import Error from "../../../components/ui/Error";
import { Box, CircularProgress, Typography } from "@mui/material";
import { NailedIt, CloseCall } from "../../question/components/StatusCard";

import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";

// Verbal Answer Flow: User sees question only, speaks answer aloud,
// admin marks it correct/wrong via RemoteControl

const QuestionRoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

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

  // Answer flow state management for verbal answer flow
  const [answerStatus, setAnswerStatus] = useState<
    "waiting" | "status" | "result" | null
  >(null);

  // Store answer result from admin's decision
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    pointsAwarded: number;
  } | null>(null);

  // Get team and game state from Redux
  const team = useAppSelector((state: RootState) => state.team?.team);
  const gameState = useAppSelector(
    (state: RootState) => state.gameState.gameState,
  );

  // Fetch current question
  const {
    data: questionData,
    isLoading,
    isFetching,
    error,
  } = useFetchCurrentQuestionQuery();

  const question = questionData?.data?.question;
  const currentQuestionIndex = questionData?.data?.currentQuestionIndex;
  const expectedQuestionIndex = gameState?.currentQuestionIndex;
  const isQuestionTransitioning =
    expectedQuestionIndex !== undefined &&
    expectedQuestionIndex >= 0 &&
    currentQuestionIndex !== expectedQuestionIndex;
  const activeQuestion = isQuestionTransitioning ? undefined : question;

  // Check if current team is the answering team
  const isAnsweringTeam =
    normalizeId(gameState?.currentAnsweringTeam) === normalizeId(team?._id);

  // Track current question index to detect changes
  const previousQuestionIndexRef = useRef<number | undefined>(undefined);

  // Shared state: Is anyone currently marked wrong but we're still in the answering/idle phase?
  const [isWaitingAfterWrong, setIsWaitingAfterWrong] = useState(false);

  // Persistence for isWaitingAfterWrong
  useEffect(() => {
    if (sessionId && currentQuestionIndex !== undefined) {
      const waitKey = `isWaitingAfterWrong_${sessionId}_${currentQuestionIndex}`;
      const saved = sessionStorage.getItem(waitKey);
      if (saved) setIsWaitingAfterWrong(JSON.parse(saved));
    }
  }, [sessionId, currentQuestionIndex]);

  useEffect(() => {
    if (sessionId && currentQuestionIndex !== undefined) {
      const waitKey = `isWaitingAfterWrong_${sessionId}_${currentQuestionIndex}`;
      sessionStorage.setItem(waitKey, JSON.stringify(isWaitingAfterWrong));
    }
  }, [isWaitingAfterWrong, sessionId, currentQuestionIndex]);



  // Load from session storage to avoid losing state on refresh
  useEffect(() => {
    if (currentQuestionIndex === undefined || !sessionId) return;
    
    const statusKey = `answerStatus_${sessionId}_${currentQuestionIndex}`;
    const resultKey = `answerResult_${sessionId}_${currentQuestionIndex}`;
    
    // Only hydrate if we are currently null
    if (answerStatus === null) {
      const savedStatus = sessionStorage.getItem(statusKey);
      if (savedStatus) setAnswerStatus(JSON.parse(savedStatus));
    }
    
    if (answerResult === null) {
      const savedResult = sessionStorage.getItem(resultKey);
      if (savedResult) setAnswerResult(JSON.parse(savedResult));
    }
  }, [currentQuestionIndex, sessionId, answerStatus, answerResult]);

  // Save to session storage when status/result updates
  useEffect(() => {
    if (currentQuestionIndex === undefined || !sessionId) return;
    
    const statusKey = `answerStatus_${sessionId}_${currentQuestionIndex}`;
    const resultKey = `answerResult_${sessionId}_${currentQuestionIndex}`;
    
    if (answerStatus !== null) {
      sessionStorage.setItem(statusKey, JSON.stringify(answerStatus));
    }
    
    if (answerResult !== null) {
      sessionStorage.setItem(resultKey, JSON.stringify(answerResult));
    }
  }, [answerStatus, answerResult, sessionId, currentQuestionIndex]);

  // Reset answer state when question changes
  useEffect(() => {
    // Only reset if question actually changed
    if (
      previousQuestionIndexRef.current !== undefined &&
      previousQuestionIndexRef.current !== currentQuestionIndex
    ) {
      setAnswerStatus(null);
      setAnswerResult(null);
    }
    previousQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  // Listen for admin's answer decisions via WebSocket
  useEffect(() => {
    const handleAnswerMarkedCorrect = (data: any) => {
      console.log("✅ Answer marked correct by admin:", data);

      // Only process if this is for the current team
      if (normalizeId(data?.teamId) === normalizeId(team?._id)) {
        setAnswerResult({
          isCorrect: true,
          pointsAwarded: data.pointsAwarded || 0,
        });
        setAnswerStatus("status");

        // We show NailedIt for 2 seconds.
        // GameStateRouter automatically navigates us to /answer-reveal after 2 seconds!
      }
    };

    const handleAnswerMarkedWrong = (data: any) => {
      console.log("❌ Answer marked wrong by admin:", data);

      setIsWaitingAfterWrong(true);

      // Only process if this is for the current team
      if (normalizeId(data?.teamId) === normalizeId(team?._id)) {
        setAnswerResult({
          isCorrect: false,
          pointsAwarded: 0,
        });
        setAnswerStatus("status");

        // GameStateRouter automatically navigates us after 2 seconds because it watches the same socket event!
      }
    };

    const handleTeamSelected = () => {
      setIsWaitingAfterWrong(false);
    };

    const handleGameStateChanged = (data: any) => {
      console.log("🎮 Game state changed:", data.gameStatus);

      // If game transitions to idle and we haven't received answer result,
      // it means another team is being processed or question is complete
      if (
        data.gameStatus === "idle" &&
        answerStatus === null &&
        isAnsweringTeam
      ) {
        // Admin marked answer, wait for specific event
        setAnswerStatus("waiting");
      }

      // If game transitions to buzzer_round (new question), navigate accordingly
      if (data.gameStatus === "buzzer_round") {
        setIsWaitingAfterWrong(false);
        navigate(`/game/${sessionId}/buzzer`);
      }
    };

    const handleQuestionPassed = (data: any) => {
      console.log("🔄 Question passed to next team:", data);

      // If current team was passed (they answered wrong), navigate to waiting
      if (normalizeId(data?.previousTeamId) === normalizeId(team?._id)) {
        navigate(`/game/${sessionId}/buzzer-leaderboard`);
      }
    };

    websocketService.on(
      Events.ANSWER_MARKED_CORRECT,
      handleAnswerMarkedCorrect,
    );
    websocketService.on(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
    websocketService.on(Events.GAME_STATE_CHANGED, handleGameStateChanged);
    websocketService.on(Events.QUESTION_PASSED, handleQuestionPassed);
    websocketService.on(Events.TEAM_SELECTED, handleTeamSelected);

    return () => {
      websocketService.off(
        Events.ANSWER_MARKED_CORRECT,
        handleAnswerMarkedCorrect,
      );
      websocketService.off(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
      websocketService.off(Events.GAME_STATE_CHANGED, handleGameStateChanged);
      websocketService.off(Events.QUESTION_PASSED, handleQuestionPassed);
      websocketService.off(Events.TEAM_SELECTED, handleTeamSelected);
    };
  }, [team?._id, sessionId, navigate, answerStatus, isAnsweringTeam]);

  // If not the answering team AND this is a buzzer question, redirect to leaderboard
  // For no-buzzer questions, everyone stays on the question page
  useEffect(() => {
    const isNoBuzzerQuestion = (gameState as any)?.isNoBuzzerQuestion;
    const isShowingCloseCall =
      answerStatus === "status" && answerResult?.isCorrect === false;

    if (
      gameState &&
      !isAnsweringTeam &&
      gameState.gameStatus === "answering" &&
      !isNoBuzzerQuestion &&
      !isShowingCloseCall
    ) {
      navigate(`/game/${sessionId}/leaderboard`);
    }
  }, [
    gameState,
    isAnsweringTeam,
    navigate,
    sessionId,
    answerStatus,
    answerResult?.isCorrect,
  ]);

  if (isLoading && !activeQuestion) {
    return <Loader />;
  }

  if (isQuestionTransitioning || (isFetching && !activeQuestion)) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          minHeight: "100%",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography>Loading question...</Typography>
      </Box>
    );
  }

  if (error || !activeQuestion) {
    return <Error />;
  }

  const isNoBuzzerQuestion = (gameState as any)?.isNoBuzzerQuestion;
  const isHiddenQuestion = activeQuestion.hideFromUsers === true;

  const isShowingCloseCall =
    answerStatus === "status" && answerResult?.isCorrect === false;

  if (!isAnsweringTeam && !isNoBuzzerQuestion && !isShowingCloseCall) {
    // For buzzer questions, non-answering teams see waiting screen
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          minHeight: "100%",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography>Waiting for the answering team...</Typography>
      </Box>
    );
  }
  // For no-buzzer questions, everyone sees the question (continue rendering below)

  // Convert question to QuestionData format
  const questionDataFormatted: QuestionData = {
    id: activeQuestion._id,
    isHiddenPlaceholder: isHiddenQuestion,
    text: isHiddenQuestion
      ? "Question is visible on the presenter screen."
      : activeQuestion.questionContent?.text || activeQuestion.questionText,
    image: isHiddenQuestion ? undefined : activeQuestion.questionImage,
    video: isHiddenQuestion ? undefined : activeQuestion.quetionVideo,
    media: isHiddenQuestion
      ? undefined
      : activeQuestion.questionContent?.media?.length
      ? activeQuestion.questionContent.media
      : activeQuestion.questionAssets?.filter((item: any) =>
        ["image", "video", "audio", "gif", "text", "file"].includes(
          item?.type,
        ),
      ),
    score: activeQuestion.score,
    options: activeQuestion.options,
  };

  return (
    <>
      {/* <Typography color="#000">{JSON.stringify(answerStatus)}</Typography> */}
      {/* Phase 1: Question Phase - Show question without options (verbal answer flow) */}
      {(!answerStatus || answerStatus === "waiting") && (
        <Box
          sx={{
            position: "relative",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <QuestionRound
            questionData={questionDataFormatted}
            questionNumber={(currentQuestionIndex || 0) + 1}
            disabled={true} // Always disabled - no MCQ selection
            showOptions={false} // Hide options for verbal answer flow
            showVerbalHint={isAnsweringTeam}
          />

          {/* Waiting Overlay - Different message for answering team vs others */}
          <Box
            sx={{
              position: "absolute",
              bottom: "16px", // Above team info bar, properly nested
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <Box
              sx={{
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                color: "white",
                padding: "12px 24px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                gap: 2,
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              {/* <CircularProgress size={20} sx={{ color: "white" }} /> */}
              <Typography sx={{ fontWeight: 600, color: "#FFF" }}>
                {isAnsweringTeam
                  ? "Waiting for admin to mark your answer..."
                  : gameState?.currentAnsweringTeam
                    ? `🎯 ${typeof gameState?.currentAnsweringTeam === "object"
                      ? gameState.currentAnsweringTeam?.teamName
                      : "Another team"
                    } is answering...`
                    : "Waiting for admin to select a team..."
                }
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Phase 2: Status Screen - Show result feedback */}
      {answerStatus === "status" && (
        <>
          {answerResult?.isCorrect && (
            <NailedIt setAnswerStatus={setAnswerStatus} />
          )}
          {answerResult && !answerResult.isCorrect && <CloseCall />}
        </>
      )}

      {/* Phase 3: Correct Answer Screen - Only for correct answers */}
      {/* We no longer show CorrectAnswer here since the unified AnswerRevealPage takes over after 2s */}
    </>
  );
};

export default QuestionRoundPage;
