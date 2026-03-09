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
import {
  NailedIt,
  CloseCall,
} from "../../question/components/StatusCard";
import CorrectAnswer from "../../question/components/Correct_Answer";
import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";

// Verbal Answer Flow: User sees question only, speaks answer aloud,
// admin marks it correct/wrong via RemoteControl

const QuestionRoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

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
    (state: RootState) => state.gameState.gameState
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
      if (data.teamId === team?._id) {
        setAnswerResult({
          isCorrect: true,
          pointsAwarded: data.pointsAwarded || 0,
        });
        setAnswerStatus("status");

        // Show NailedIt for 5 seconds, then show result for 5 seconds, then navigate
        setTimeout(() => {
          setAnswerStatus("result");
        }, 5000);

        setTimeout(() => {
          navigate(`/game/${sessionId}/leaderboard`);
        }, 10000);
      }
    };

    const handleAnswerMarkedWrong = (data: any) => {
      console.log("❌ Answer marked wrong by admin:", data);

      // Only process if this is for the current team
      if (data.teamId === team?._id) {
        setAnswerResult({
          isCorrect: false,
          pointsAwarded: 0,
        });
        setAnswerStatus("status");

        // Show CloseCall for 5 seconds, then navigate to leaderboard
        setTimeout(() => {
          navigate(`/game/${sessionId}/leaderboard`);
        }, 5000);
      }
    };

    const handleGameStateChanged = (data: any) => {
      console.log("🎮 Game state changed:", data.gameStatus);

      // If game transitions to idle and we haven't received answer result,
      // it means another team is being processed or question is complete
      if (data.gameStatus === "idle" && answerStatus === null && isAnsweringTeam) {
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
      if (data.previousTeamId === team?._id) {
        navigate(`/game/${sessionId}/leaderboard`);
      }
    };

    websocketService.on(Events.ANSWER_MARKED_CORRECT, handleAnswerMarkedCorrect);
    websocketService.on(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
    websocketService.on(Events.GAME_STATE_CHANGED, handleGameStateChanged);
    websocketService.on(Events.QUESTION_PASSED, handleQuestionPassed);

    return () => {
      websocketService.off(Events.ANSWER_MARKED_CORRECT, handleAnswerMarkedCorrect);
      websocketService.off(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
      websocketService.off(Events.GAME_STATE_CHANGED, handleGameStateChanged);
      websocketService.off(Events.QUESTION_PASSED, handleQuestionPassed);
    };
  }, [team?._id, sessionId, navigate, answerStatus, isAnsweringTeam]);

  // If not the answering team, redirect to leaderboard
  useEffect(() => {
    if (gameState && !isAnsweringTeam && gameState.gameStatus === "answering") {
      navigate(`/game/${sessionId}/leaderboard`);
    }
  }, [gameState, isAnsweringTeam, navigate, sessionId]);

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
          />

          {/* Waiting for Admin Overlay */}
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
              <Typography sx={{ fontWeight: 600, color:"#FFF" }}>
                Waiting for admin to mark your answer...
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
      {answerStatus === "result" && answerResult?.isCorrect && (
        <CorrectAnswer
          pointsEarned={answerResult.pointsAwarded}
          totalScore={(team?.teamScore || 0) + answerResult.pointsAwarded}
          teamRank={1} // TODO: Get actual rank from leaderboard
          teamName={team?.teamName || ""}
        />
      )}
    </>
  );
};

export default QuestionRoundPage;

