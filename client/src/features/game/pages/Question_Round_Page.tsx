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

  // Get team from Redux
  const team = useAppSelector((state: RootState) => state.team?.team);
  const gameState = useAppSelector(
    (state: RootState) => state.gameState.gameState,
  );

  // Fetch current question
  const {
    data: questionData,
    isLoading,
    error,
  } = useFetchCurrentQuestionQuery();

  const question = questionData?.data?.question;
  const currentQuestionIndex = questionData?.data?.currentQuestionIndex;

  // Check if current team is the answering team
  const isAnsweringTeam =
    normalizeId(gameState?.currentAnsweringTeam) === normalizeId(team?._id);

  // Track current question index to detect changes
  const previousQuestionIndexRef = useRef<number | undefined>(undefined);

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
        navigate(`/game/${sessionId}/buzzer`);
      }
    };

    const handleQuestionPassed = (data: any) => {
      console.log("🔄 Question passed to next team:", data);

      // If current team was passed (they answered wrong), navigate to waiting
      if (normalizeId(data?.previousTeamId) === normalizeId(team?._id)) {
        navigate(`/game/${sessionId}/leaderboard`);
      }
    };

    websocketService.on(
      Events.ANSWER_MARKED_CORRECT,
      handleAnswerMarkedCorrect,
    );
    websocketService.on(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
    websocketService.on(Events.GAME_STATE_CHANGED, handleGameStateChanged);
    websocketService.on(Events.QUESTION_PASSED, handleQuestionPassed);

    return () => {
      websocketService.off(
        Events.ANSWER_MARKED_CORRECT,
        handleAnswerMarkedCorrect,
      );
      websocketService.off(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
      websocketService.off(Events.GAME_STATE_CHANGED, handleGameStateChanged);
      websocketService.off(Events.QUESTION_PASSED, handleQuestionPassed);
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

  if (isLoading) {
    return <Loader />;
  }

  if (error || !question) {
    return <Error />;
  }

  const isNoBuzzerQuestion = (gameState as any)?.isNoBuzzerQuestion;

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
          minHeight: "100vh",
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
    id: question._id,
    text: question.questionContent?.text || question.questionText,
    image: question.questionImage,
    video: question.quetionVideo,
    media: question.questionContent?.media?.length
      ? question.questionContent.media
      : question.questionAssets?.filter((item: any) =>
          ["image", "video", "gif", "text", "file"].includes(item?.type),
        ),
    score: question.score,
    options: question.options,
  };

  return (
    <>
      {/* Phase 1: Question Phase - Show question without options (verbal answer flow) */}
      {(!answerStatus || answerStatus === "waiting") && (
        <Box sx={{ position: "relative" }}>
          <QuestionRound
            questionData={questionDataFormatted}
            teamName={team?.teamName || ""}
            teamNumber={team?.teamNumber || 0}
            totalPoints={team?.teamScore || 0}
            questionPoints={questionDataFormatted.score || 0}
            disabled={true} // Always disabled - no MCQ selection
            showOptions={false} // Hide options for verbal answer flow
            showVerbalHint={isAnsweringTeam}
          />

          {/* Waiting Overlay - Different message for answering team vs others */}
          <Box
            sx={{
              position: "fixed",
              bottom: 80, // Above team info bar
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
                  : `Waiting for ${
                      typeof gameState?.currentAnsweringTeam === "object"
                        ? gameState.currentAnsweringTeam?.teamName
                        : "the selected team"
                    } to answer...`}
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
