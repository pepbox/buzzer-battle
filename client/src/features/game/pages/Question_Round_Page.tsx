import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QuestionRound from "../components/Question_Round";
import { QuestionData } from "../../question/components/Question";
import {
  useFetchCurrentQuestionQuery,
  useSendQuestionResponseMutation,
} from "../../question/services/questions.api";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import Loader from "../../../components/ui/Loader";
import Error from "../../../components/ui/Error";
import { Box, CircularProgress, Typography } from "@mui/material";
import {
  NailedIt,
  CloseCall,
  TimesUp,
} from "../../question/components/StatusCard";
import CorrectAnswer from "../../question/components/Correct_Answer";
import { useRemainingTimer } from "../../../hooks/useTimerSync";

const QuestionRoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  // Answer flow state management
  const [answerStatus, setAnswerStatus] = useState<
    "answering" | "status" | "result" | null
  >(null);

  // Get team from Redux
  const team = useAppSelector((state: RootState) => state.team?.team);
  const gameState = useAppSelector(
    (state: RootState) => state.gameState.gameState
  );

  // Get answer result from Redux (persisted across re-renders and populated by RTK Query)
  const answerResult = useAppSelector(
    (state: RootState) => state.question?.responseResult
  );

  // Fetch current question
  const {
    data: questionData,
    isLoading,
    error,
  } = useFetchCurrentQuestionQuery();

  // Mutation for submitting answer
  const [sendResponse] = useSendQuestionResponseMutation();
  const question = questionData?.data?.question;

  const currentQuestionIndex = questionData?.data?.currentQuestionIndex;

  const timeLimit = 60; // 60 seconds for answering

  // Check if current team is the answering team
  const isAnsweringTeam =
    typeof gameState?.currentAnsweringTeam === "object"
      ? gameState?.currentAnsweringTeam?._id === team?._id
      : gameState?.currentAnsweringTeam === team?._id;

  // Track current question index to detect changes
  const previousQuestionIndexRef = useRef<number | undefined>(undefined);

  // Reset answer state when question changes
  useEffect(() => {
    // Only reset if question actually changed
    if (
      previousQuestionIndexRef.current !== undefined &&
      previousQuestionIndexRef.current !== currentQuestionIndex
    ) {
      setSelectedAnswer("");
      setIsAnswered(false);
      setSubmittingAnswer(false);
      setAnswerStatus(null);
      // Note: answerResult is now in Redux and cleared by GameStateRouter
    }
    previousQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  // Handle time up callback
  const handleTimeUp = async () => {
    setIsAnswered(true);

    // Show TimesUp status screen
    setAnswerStatus("status");

    // After 10 seconds, navigate to leaderboard
    setTimeout(() => {
      navigate(`/game/${sessionId}/leaderboard`);
    }, 10000);
  };

  // Use synced timer with server timestamp
  const { timeRemaining } = useRemainingTimer(
    gameState?.answeringRoundStartTime,
    timeLimit,
    handleTimeUp
  );

  // If not the answering team, redirect to leaderboard
  useEffect(() => {
    if (gameState && !isAnsweringTeam && gameState.gameStatus === "answering") {
      navigate(`/game/${sessionId}/leaderboard`);
    }
  }, [gameState, isAnsweringTeam, navigate, sessionId]);

  // Handle IDLE state transition - show result then redirect to leaderboard
  useEffect(() => {
    if (gameState?.gameStatus === "idle" && isAnsweringTeam) {
      console.log("🔵 Game transitioned to IDLE - showing result", {
        answerStatus,
        answerResult,
        hasAnswered: isAnswered,
      });

      // If we haven't already set the answer status, show the result
      if (answerStatus === null || answerStatus === "answering") {
        // Check if answer was submitted (we have answerResult in Redux)
        if (answerResult !== null) {
          console.log("✅ Answer was submitted - showing status screen");
          // Show the appropriate status screen
          setAnswerStatus("status");
        } else if (isAnswered) {
          // Answer was submitted but result not yet in Redux - wait a bit
          console.log("⏳ Answer submitted, waiting for result...");
          // Don't show TimesUp yet, give Redux time to update
        } else {
          console.log("⏰ Time expired without answer - showing TimesUp");
          // Time expired without answer - show Time Up
          setIsAnswered(true);
          setAnswerStatus("status");
          console.log("Setting timeout of 5 seconds from 4");
          setTimeout(() => {
            console.log("Set answer status to result after delay from 4");
            setAnswerStatus("result");
          }, 1000);
        }
      }
    }
  }, [
    gameState?.gameStatus,
    isAnsweringTeam,
    answerResult,
    answerStatus,
    isAnswered,
    navigate,
    sessionId,
  ]);

  // Handle delayed answer result - when Redux updates after IDLE state
  useEffect(() => {
    // If we're in IDLE state, answered, waiting, and now have a result
    if (
      gameState?.gameStatus === "idle" &&
      isAnsweringTeam &&
      isAnswered &&
      answerResult !== null &&
      answerStatus === null
    ) {
      console.log(
        "✅ Answer result arrived after IDLE - showing status screen"
      );
      setAnswerStatus("status");
      console.log("Setting timeout of 5 seconds");
      setTimeout(() => {
        console.log("Set answer status to result after delay");
        setAnswerStatus("result");
      }, 1000);
    }
  }, [
    answerResult,
    gameState?.gameStatus,
    isAnsweringTeam,
    isAnswered,
    answerStatus,
  ]);

  const handleAnswerSelect = async (answer: string) => {
    if (!question || isAnswered) return;

    setSelectedAnswer(answer);
    setIsAnswered(true);
    setSubmittingAnswer(true);

    try {
      // The answer is already the optionId, so we can use it directly
      console.log("Submitting answer with optionId:", answer);

      // Submit the answer - Redux slice will automatically store the result
      const result = await sendResponse({
        questionId: question._id,
        responseOptionId: answer,
      }).unwrap();

      console.log("Answer submitted successfully:", result);

      // Stop submitting overlay
      setSubmittingAnswer(false);
      console.log("Answer submission completed:", result.data.isCorrect);

      // Result is now stored in Redux via the slice's extraReducers
      // Move to status phase (show NailedIt or CloseCall)
      setAnswerStatus("status");
      console.log("Setting timeout of 5 seconds-from 1");
      if (result.data.isCorrect) {
        setTimeout(() => {
          console.log("Set answer status to result after delay-from 1");
          setAnswerStatus("result");
        }, 5000);
        setTimeout(() => {
          navigate(`/game/${sessionId}/leaderboard`);
        }, 10000);
      } else {
        setTimeout(() => {
          navigate(`/game/${sessionId}/leaderboard`);
        }, 5000);
      }

      // The IDLE state transition will handle navigation to leaderboard
      // No need to set timeouts here
    } catch (error) {
      console.error("Failed to submit answer:", error);
      setSubmittingAnswer(false);

      // On error, still show an error status
      // Note: Redux won't have the result, so we'll show TimesUp
      setAnswerStatus("status");
      console.log("Setting timeout of 5 seconds from 2");
      setTimeout(() => {
        console.log("Set answer status to result after delay from 2");
        setAnswerStatus("result");
      }, 1000);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (error || !question) {
    return <Error />;
  }

  if (!isAnsweringTeam) {
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

  // Convert question to QuestionData format
  const questionDataFormatted: QuestionData = {
    id: question._id,
    text: question.questionText,
    image: question.questionImage,
    video: question.quetionVideo,
    score: question.score,
    options: question.options,
  };

  return (
    <>
      {/* Phase 1: Question Phase - Show question with timer */}
      {(!answerStatus || answerStatus === "answering") && (
        <QuestionRound
          questionData={questionDataFormatted}
          teamName={team?.teamName || ""}
          teamNumber={team?.teamNumber || 0}
          totalPoints={team?.teamScore || 0}
          questionPoints={questionDataFormatted.score || 0} // Fixed 150 points per correct answer
          timeLimit={timeLimit}
          timeRemaining={timeRemaining}
          selectedAnswer={selectedAnswer}
          disabled={isAnswered}
          onAnswerSelect={handleAnswerSelect}
          onTimeUp={handleTimeUp}
        />
      )}

      {/* Phase 2: Status Screen (10 seconds) - Show result feedback */}
      {answerStatus === "status" && (
        <>
          {answerResult?.isCorrect && (
            <NailedIt setAnswerStatus={setAnswerStatus} />
          )}
          {answerResult && !answerResult.isCorrect && <CloseCall />}
          {!answerResult && <TimesUp />}
        </>
      )}

      {/* Phase 3: Correct Answer Screen (10 seconds) - Only for correct answers */}
      {answerStatus === "result" && answerResult?.isCorrect && (
        <CorrectAnswer
          pointsEarned={answerResult.pointsAwarded}
          totalScore={team?.teamScore || 0}
          teamRank={1} // TODO: Get actual rank from leaderboard
          teamName={team?.teamName || ""}
        />
      )}

      {/* Loading Overlay - While submitting answer */}
      {submittingAnswer && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            zIndex: 9999,
          }}
        >
          <CircularProgress sx={{ color: "white" }} />
          <Typography sx={{ color: "white" }}>
            Submitting your answer...
          </Typography>
        </Box>
      )}
    </>
  );
};

export default QuestionRoundPage;
