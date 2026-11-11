import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QuestionRound from "../components/Question_Round";
import { QuestionData } from "../../question/components/Question";
import { useFetchCurrentQuestionQuery } from "../../question/services/questions.api";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import Error from "../../../components/ui/Error";
import { Box, Typography } from "@mui/material";
import {
  GameBackground,
  GameStatusScreen,
} from "../../../components/ui/GameScreen";
import { NailedIt, CloseCall } from "../../question/components/StatusCard";
import { useFetchOverallLeaderboardQuery } from "../services/teamApi";
import { useFetchSessionQuery } from "../../session/services/session.api";

import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";

// Verbal Answer Flow: User sees question only, speaks answer aloud,
// admin marks it correct/wrong via RemoteControl

const QuestionRoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  const normalizeId = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string") return value.trim();
    if (typeof value === "object") {
      if (typeof value._id === "string") return value._id.trim();
      if (value._id) return String(value._id).trim();
      if (typeof value.id === "string") return value.id.trim();
      if (value.id) return String(value.id).trim();
      if (typeof value.teamId === "string") return value.teamId.trim();
      if (value.teamId) return String(value.teamId).trim();
      if (value.toString && typeof value.toString === "function") {
        const str = value.toString();
        if (str !== "[object Object]") return str.trim();
      }
    }
    return String(value).trim();
  };

  const isSameTeam = (id1: any, id2: any): boolean => {
    const norm1 = normalizeId(id1);
    const norm2 = normalizeId(id2);
    return Boolean(norm1 && norm2 && norm1 === norm2);
  };

  // Answer flow state management for verbal answer flow
  const [answerStatus, setAnswerStatus] = useState<
    "waiting" | "status" | "result" | null
  >(null);

  // Store answer result from admin's decision
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    pointsAwarded: number;
    teamId?: string;
    teamName?: string;
    isMyTeam?: boolean;
  } | null>(null);

  // Get team and game state from Redux
  const team = useAppSelector((state: RootState) => state.team?.team);
  const teamRef = useRef(team);
  teamRef.current = team;

  const gameState = useAppSelector(
    (state: RootState) => state.gameState.gameState,
  );

  // Fetch current question
  const {
    data: questionData,
    isLoading,
    isFetching,
    error,
    refetch: refetchCurrentQuestion,
  } = useFetchCurrentQuestionQuery();

  const question = questionData?.data?.question;
  const currentQuestionIndex = questionData?.data?.currentQuestionIndex;
  const expectedQuestionIndex = gameState?.currentQuestionIndex;
  const isQuestionTransitioning =
    expectedQuestionIndex !== undefined &&
    expectedQuestionIndex >= 0 &&
    currentQuestionIndex !== expectedQuestionIndex;
  const activeQuestion = isQuestionTransitioning ? undefined : question;

  // Is this team the one the host has currently selected to answer?
  const isCurrentlyChosen = isSameTeam(gameState?.currentAnsweringTeam, team?._id);
  const hasOtherAnsweringTeam =
    Boolean(normalizeId(gameState?.currentAnsweringTeam)) && !isCurrentlyChosen;

  // Treat as answering team if currently chosen, or if we just answered and no other
  // team has been selected since (e.g. idle after our answer). Once the question is
  // passed to another team, this team must no longer be treated as answering.
  const isAnsweringTeam =
    isCurrentlyChosen ||
    Boolean(
      answerResult?.isMyTeam &&
        answerStatus === "result" &&
        !hasOtherAnsweringTeam,
    );

  // Fetch leaderboard and session data to resolve team names and mode
  const { data: leaderboardData } = useFetchOverallLeaderboardQuery();
  const { data: sessionData } = useFetchSessionQuery();
  // gameMode is authoritative; `spinWheelState` always exists on the game state
  // (Mongoose defaults), so its presence alone does not imply spin-wheel mode.
  const knownGameMode =
    sessionData?.data?.gameMode || (gameState as any)?.gameMode;
  const isSpinWheel = knownGameMode
    ? knownGameMode === "SPIN_WHEEL"
    : Boolean(gameState?.currentCategory) ||
      Boolean((gameState as any)?.spinWheelState?.selectedTeamId);

  const answeringTeamObj =
    typeof gameState?.currentAnsweringTeam === "object" &&
    gameState?.currentAnsweringTeam !== null
      ? (gameState.currentAnsweringTeam as any)
      : leaderboardData?.data?.leaderboard?.find(
          (t: any) =>
            isSameTeam(t._id || t.teamId, gameState?.currentAnsweringTeam || answerResult?.teamId)
        );

  const answeringTeamName =
    answeringTeamObj?.teamName ||
    (answeringTeamObj?.teamNumber
      ? `Team ${answeringTeamObj.teamNumber}`
      : "Another team");

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

      const myId = teamRef.current?._id || (teamRef.current as any)?.id;
      const isMyTeam = isSameTeam(data?.teamId, myId);
      const targetTeamName =
        data?.teamName ||
        (isMyTeam ? teamRef.current?.teamName : answeringTeamName);

      setAnswerResult({
        isCorrect: true,
        pointsAwarded: data.pointsAwarded || 0,
        teamId: data?.teamId,
        teamName: targetTeamName,
        isMyTeam,
      });

      if (isMyTeam) {
        setAnswerStatus("status");
      }
    };

    const handleAnswerMarkedWrong = (data: any) => {
      console.log("❌ Answer marked wrong by admin:", data);

      setIsWaitingAfterWrong(true);
      const myId = teamRef.current?._id || (teamRef.current as any)?.id;
      const isMyTeam = isSameTeam(data?.teamId, myId);
      const targetTeamName =
        data?.teamName ||
        (isMyTeam ? teamRef.current?.teamName : answeringTeamName);

      setAnswerResult({
        isCorrect: false,
        pointsAwarded: 0,
        teamId: data?.teamId,
        teamName: targetTeamName,
        isMyTeam,
      });

      if (isMyTeam) {
        setAnswerStatus("status");
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

      // If game transitions to buzzer_round or spin_round (new question/turn), navigate and reset status
      if (data.gameStatus === "buzzer_round") {
        setIsWaitingAfterWrong(false);
        setAnswerStatus(null);
        setAnswerResult(null);
        navigate(`/game/${sessionId}/buzzer`);
      }
      if (data.gameStatus === "spin_round") {
        setIsWaitingAfterWrong(false);
        setAnswerStatus(null);
        setAnswerResult(null);
        navigate(`/game/${sessionId}/spin-wheel`);
      }
    };

    const handleQuestionPassed = (data: any) => {
      console.log("🔄 Question passed to next team:", data);

      // If current team was passed (they answered wrong), navigate to waiting
      const myId = teamRef.current?._id || (teamRef.current as any)?.id;
      if (isSameTeam(data?.previousTeamId, myId)) {
        navigate(`/game/${sessionId}/buzzer-leaderboard`);
      }
    };

    const handleHintRevealed = (data: any) => {
      console.log("💡 Hint revealed by admin:", data);
      refetchCurrentQuestion();
    };

    websocketService.on(
      Events.ANSWER_MARKED_CORRECT,
      handleAnswerMarkedCorrect,
    );
    websocketService.on(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
    websocketService.on(Events.GAME_STATE_CHANGED, handleGameStateChanged);
    websocketService.on(Events.QUESTION_PASSED, handleQuestionPassed);
    websocketService.on(Events.TEAM_SELECTED, handleTeamSelected);
    websocketService.on(Events.HINT_REVEALED, handleHintRevealed);

    return () => {
      websocketService.off(
        Events.ANSWER_MARKED_CORRECT,
        handleAnswerMarkedCorrect,
      );
      websocketService.off(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
      websocketService.off(Events.GAME_STATE_CHANGED, handleGameStateChanged);
      websocketService.off(Events.QUESTION_PASSED, handleQuestionPassed);
      websocketService.off(Events.TEAM_SELECTED, handleTeamSelected);
      websocketService.off(Events.HINT_REVEALED, handleHintRevealed);
    };
  }, [team?._id, sessionId, navigate, answerStatus, isAnsweringTeam, answeringTeamName]);

  // Priority 1: When an answer is evaluated, show NailedIt or CloseCall status screen ONLY to the answering team
  if (answerStatus === "status" && answerResult && answerResult.isMyTeam) {
    return (
      <>
        {answerResult.isCorrect ? (
          <NailedIt
            isMyTeam={true}
            teamName={team?.teamName}
            setAnswerStatus={setAnswerStatus}
          />
        ) : (
          <CloseCall
            isMyTeam={true}
            teamName={team?.teamName}
            setAnswerStatus={setAnswerStatus}
          />
        )}
      </>
    );
  }

  if (
    (isLoading && !activeQuestion) ||
    isQuestionTransitioning ||
    (isFetching && !activeQuestion)
  ) {
    return (
      <GameStatusScreen
        icon="⏳"
        title="Loading question..."
        subtitle="Get ready!"
        showSpinner
      />
    );
  }

  if (error || !activeQuestion) {
    return (
      <GameBackground>
        <Error
          title="Couldn't load the question"
          message="Please wait a moment or try again."
          onRetry={() => refetchCurrentQuestion()}
        />
      </GameBackground>
    );
  }

  const isNoBuzzerQuestion = (gameState as any)?.isNoBuzzerQuestion;
  const isHiddenQuestion = activeQuestion.hideFromUsers === true;

  if (!isAnsweringTeam && !isNoBuzzerQuestion) {
    // For non-answering teams in buzzer and spin questions, show a waiting screen
    // (on the game background) instead of the question.
    const isIdle = gameState?.gameStatus === "idle";
    return (
      <GameStatusScreen
        {...(isIdle
          ? isSpinWheel
            ? {
                icon: "🎡",
                title: "Turn ended",
                subtitle: "Waiting for the host to select the next team...",
                showSpinner: true,
              }
            : {
                icon: "⏭️",
                title: "Waiting for next question...",
                subtitle: "Stay sharp — the next round is coming up.",
                showSpinner: true,
              }
          : {
              icon: "🎯",
              title: `${answeringTeamName} is answering...`,
              subtitle: isSpinWheel
                ? "Watch closely — your turn is coming up."
                : "Get ready — you might get a chance if they miss!",
            })}
      />
    );
  }
  // For no-buzzer questions, everyone sees the question (continue rendering below)

  // Convert question to QuestionData format
  const isBuzzerPerson = team?.playerRole === "BUZZER_PERSON";
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
    hint: isBuzzerPerson ? activeQuestion.hint : undefined,
    hintPenalty: activeQuestion.hintPenalty,
  };

  return (
    <>
      {/* <Typography color="#000">{JSON.stringify(answerStatus)}</Typography> */}
      {/* Phase 1: Question Phase - Show question without options (verbal answer flow) */}
      {(!answerStatus || answerStatus === "waiting" || answerStatus === "result") && (
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
            showVerbalHint={
              isCurrentlyChosen &&
              gameState?.gameStatus === "answering" &&
              isBuzzerPerson
            }
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
                backgroundColor: isAnsweringTeam
                  ? "rgba(0, 0, 0, 0.85)"
                  : "rgba(20, 20, 30, 0.9)",
                color: "white",
                padding: "14px 28px",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                gap: 2,
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                border: isAnsweringTeam
                  ? "1px solid rgba(255,255,255,0.2)"
                  : "2px solid #FFD700",
                backdropFilter: "blur(12px)",
              }}
            >
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1rem", sm: "1.15rem" },
                  color: isAnsweringTeam ? "#FFF" : "#FFD700",
                  textAlign: "center",
                }}
              >
                {gameState?.gameStatus === "idle"
                  ? (isSpinWheel
                      ? "Turn ended. Waiting for host to select next team..."
                      : "Waiting for next question...")
                  : isAnsweringTeam
                    ? "Waiting for admin to mark your answer..."
                    : `🎯 ${answeringTeamName} is answering...`}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
};

export default QuestionRoundPage;
