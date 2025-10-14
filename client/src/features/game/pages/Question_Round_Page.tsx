import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QuestionRound from "../compoenents/Question_Round";
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
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    pointsAwarded: number;
  } | null>(null);

  // Get team from Redux
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

  // Mutation for submitting answer
  const [sendResponse] = useSendQuestionResponseMutation();

  const question = questionData?.data?.question;

  // Check if current team is the answering team
  const isAnsweringTeam =
    typeof gameState?.currentAnsweringTeam === "object"
      ? gameState?.currentAnsweringTeam?._id === team?._id
      : gameState?.currentAnsweringTeam === team?._id;

  // If not the answering team, redirect to leaderboard
  useEffect(() => {
    if (gameState && !isAnsweringTeam && gameState.gameStatus === "answering") {
      navigate(`/game/${sessionId}/leaderboard`);
    }
  }, [gameState, isAnsweringTeam, navigate, sessionId]);

  const handleAnswerSelect = async (answer: string) => {
    if (!question || isAnswered) return;

    setSelectedAnswer(answer);
    setIsAnswered(true);
    setSubmittingAnswer(true);

    try {
      // Find the option ID for the selected answer text
      const selectedOption = question.options.find(
        (opt) => opt.optionText === answer
      );

      if (!selectedOption) {
        console.error("Selected option not found. Answer:", answer);
        console.error("Available options:", question.options);
        setSubmittingAnswer(false);
        setIsAnswered(false);
        return;
      }

      // Submit the answer
      const result = await sendResponse({
        questionId: question._id,
        responseOptionId: selectedOption._id,
      }).unwrap();

      console.log("Answer submitted successfully:", result);

      // Stop submitting overlay
      setSubmittingAnswer(false);

      // Store the result
      setAnswerResult({
        isCorrect: result.data.isCorrect,
        pointsAwarded: result.data.pointsAwarded,
      });

      // Move to status phase (show NailedIt or CloseCall)
      setAnswerStatus("status");

      // After 10 seconds, move to next phase
      setTimeout(() => {
        if (result.data.isCorrect) {
          // Show CorrectAnswer component
          setAnswerStatus("result");

          // After another 10 seconds, navigate to leaderboard
          setTimeout(() => {
            navigate(`/game/${sessionId}/leaderboard`);
          }, 10000);
        } else {
          // Wrong answer → Go directly to leaderboard
          navigate(`/game/${sessionId}/leaderboard`);
        }
      }, 10000);
    } catch (error) {
      console.error("Failed to submit answer:", error);
      setSubmittingAnswer(false);
      
      // On error, still show an error status and navigate
      setAnswerResult({
        isCorrect: false,
        pointsAwarded: 0,
      });
      setAnswerStatus("status");
      
      setTimeout(() => {
        navigate(`/game/${sessionId}/leaderboard`);
      }, 10000);
    }
  };

  const handleTimeUp = async () => {
    console.log("Time's up!");
    setIsAnswered(true);

    // Show TimesUp status screen
    setAnswerStatus("status");

    // After 10 seconds, navigate to leaderboard
    setTimeout(() => {
      navigate(`/game/${sessionId}/leaderboard`);
    }, 10000);
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
    media: question.questionImage
      ? {
          url: question.questionImage,
          alt: "Question image",
        }
      : undefined,
    options: question.options.map((opt) => opt.optionText),
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
          questionPoints={150} // Fixed 150 points per correct answer
          timeLimit={30}
          selectedAnswer={selectedAnswer}
          disabled={isAnswered}
          onAnswerSelect={handleAnswerSelect}
          onTimeUp={handleTimeUp}
        />
      )}

      {/* Phase 2: Status Screen (10 seconds) - Show result feedback */}
      {answerStatus === "status" && (
        <>
          {answerResult?.isCorrect && <NailedIt />}
          {answerResult && !answerResult.isCorrect && <CloseCall />}
          {!answerResult && <TimesUp />}
        </>
      )}

      {/* Phase 3: Correct Answer Screen (10 seconds) - Only for correct answers */}
      {answerStatus === "result" && answerResult?.isCorrect && (
        <CorrectAnswer
          pointsEarned={answerResult.pointsAwarded}
          totalScore={(team?.teamScore || 0) + answerResult.pointsAwarded}
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
