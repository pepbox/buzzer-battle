import React, { useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useFetchBuzzerLeaderboardQuery } from "../services/buzzerApi";
import { useFetchCurrentQuestionQuery } from "../../question/services/questions.api";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import Loader from "../../../components/ui/Loader";
import Error from "../../../components/ui/Error";
import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";

// Import assets
import normalBg from "../../../assets/background/normal_bg.webp";
import timerIcon from "../../../assets/leaderboard/timer.webp";
import positionOne from "../../../assets/leaderboard/one.webp";
import positionTwo from "../../../assets/leaderboard/two.webp";
import positionThree from "../../../assets/leaderboard/three.webp";
import positionFour from "../../../assets/leaderboard/four.webp";
import positionFive from "../../../assets/leaderboard/five.webp";

const BuzzerLeaderboard: React.FC = () => {
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

  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  // Get current team and game state from Redux
  const team = useAppSelector((state: RootState) => state.team.team);
  const gameState = useAppSelector(
    (state: RootState) => state.gameState.gameState,
  );

  // Fetch current question to check if it's a no-buzzer question
  const { data: questionData } = useFetchCurrentQuestionQuery();
  const isNoBuzzerQuestion = questionData?.data?.question?.keepBuzzer === false;
  const currentQuestionIndex = questionData?.data?.currentQuestionIndex;

  // Check if our team previously answered wrong for this specific question
  const [wasMarkedWrong, setWasMarkedWrong] = React.useState(false);

  useEffect(() => {
    if (sessionId && currentQuestionIndex !== undefined) {
      const resultKey = `answerResult_${sessionId}_${currentQuestionIndex}`;
      const savedResult = sessionStorage.getItem(resultKey);
      if (savedResult) {
        try {
          const parsed = JSON.parse(savedResult);
          if (parsed && parsed.isCorrect === false) {
            setWasMarkedWrong(true);
          } else {
            setWasMarkedWrong(false);
          }
        } catch {
          setWasMarkedWrong(false);
        }
      } else {
        setWasMarkedWrong(false);
      }
    }
  }, [sessionId, currentQuestionIndex, gameState?.gameStatus]);

  // Shared state: Is anyone currently marked wrong but we're still in the answering phase?
  const [isWaitingAfterWrong, setIsWaitingAfterWrong] = React.useState(false);

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

  useEffect(() => {
    const handleAnswerMarkedWrong = () => {
      setIsWaitingAfterWrong(true);
    };

    const handleTeamSelected = () => {
      setIsWaitingAfterWrong(false);
    };

    const handleGameStateChanged = (data: any) => {
      if (data.gameStatus !== "answering") {
        setIsWaitingAfterWrong(false);
      }
    };

    websocketService.on(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
    websocketService.on(Events.TEAM_SELECTED, handleTeamSelected);
    websocketService.on(Events.GAME_STATE_CHANGED, handleGameStateChanged);

    return () => {
      websocketService.off(Events.ANSWER_MARKED_WRONG, handleAnswerMarkedWrong);
      websocketService.off(Events.TEAM_SELECTED, handleTeamSelected);
      websocketService.off(Events.GAME_STATE_CHANGED, handleGameStateChanged);
    };
  }, []);

  // Fetch buzzer leaderboard
  const {
    data: leaderboardData,
    isLoading,
    error,
  } = useFetchBuzzerLeaderboardQuery();

  const leaderboard = leaderboardData?.data?.leaderboard || [];

  // Find current team's entry in the leaderboard
  const myTeamEntry = leaderboard.find(
    (entry) => normalizeId(entry.teamId) === normalizeId(team?._id),
  );

  // Get current answering team
  const currentAnsweringTeam = gameState?.currentAnsweringTeam;
  const answeringTeamId = normalizeId(currentAnsweringTeam);

  // Check if we're in answering state
  const isAnsweringState = gameState?.gameStatus === "answering";

  // Check if my team is the answering team
  const isMyTeamAnswering = answeringTeamId === normalizeId(team?._id);

  // Redirect answering team to question page
  useEffect(() => {
    if (isMyTeamAnswering && isAnsweringState && sessionId) {
      navigate(`/game/${sessionId}/question`);
    }
  }, [isMyTeamAnswering, isAnsweringState, sessionId, navigate]);

  // Position badge images
  const positionBadges: { [key: number]: string } = {
    1: positionOne,
    2: positionTwo,
    3: positionThree,
    4: positionFour,
    5: positionFive,
  };

  // Get rank text (1st, 2nd, 3rd, etc.)
  const getRankText = (rank: number): string => {
    if (rank === 1) return "1st";
    if (rank === 2) return "2nd";
    if (rank === 3) return "3rd";
    return `${rank}th`;
  };

  const fallbackRoundStartFromQueue = useMemo(() => {
    const timestamps = leaderboard
      .map((entry) => Number(entry.timestamp))
      .filter((value) => Number.isFinite(value));

    if (!timestamps.length) return undefined;
    return Math.min(...timestamps);
  }, [leaderboard]);

  const getElapsedMs = (
    entryTimestamp: string | number | undefined,
    roundStartTimestamp: number | undefined,
  ): number => {
    const timestamp = Number(entryTimestamp);
    const roundStart = Number(roundStartTimestamp);

    if (!Number.isFinite(timestamp)) {
      return 0;
    }

    if (Number.isFinite(roundStart) && roundStart > 0) {
      const elapsed = timestamp - roundStart;

      // Ignore clearly invalid values caused by stale round-start data.
      if (elapsed >= 0 && elapsed <= 10 * 60 * 1000) {
        return elapsed;
      }
    }

    // Fallback: show relative time against the earliest press in this queue.
    if (
      Number.isFinite(fallbackRoundStartFromQueue) &&
      fallbackRoundStartFromQueue !== undefined
    ) {
      return Math.max(0, timestamp - fallbackRoundStartFromQueue);
    }

    return 0;
  };

  // Format timestamp to show minutes:seconds:milliseconds (e.g., "00:01:42")
  const formatTime = (timestamp: string): string => {
    try {
      const totalMs = Number(timestamp);
      const minutes = Math.floor(totalMs / 60000);
      const seconds = Math.floor((totalMs % 60000) / 1000);
      const milliseconds = Math.floor((totalMs % 1000) / 10); // Get centiseconds (2 digits)

      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(milliseconds).padStart(2, "0")}`;
    } catch {
      return "00:00:00";
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return <Error />;
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
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* Answering Team Indicator */}
      {isAnsweringState && (
        <Typography
          variant="h6"
          sx={{
            color: "#FFD700",
            fontWeight: "bold",
            marginBottom: "24px",
            textAlign: "center",
            textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            padding: "12px 24px",
            borderRadius: "12px",
          }}
        >
          {isMyTeamAnswering ? (
            "🎯 Your turn to answer!"
          ) : (
            `🎯 ${typeof gameState?.currentAnsweringTeam === "object"
              ? (gameState.currentAnsweringTeam as any).teamName
              : "Another team"
            } is answering...`
          )}
        </Typography>
      )}

      {/* My Team Card */}
      <Box
        sx={{
          backgroundColor: "white",
          borderRadius: "24px",
          padding: "32px",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          textAlign: "center",
        }}
      >
        {myTeamEntry ? (
          <>
            {/* Success Message */}
            <Typography
              variant="h5"
              sx={{
                color: wasMarkedWrong ? "#EF4444" : "#4CAF50",
                fontWeight: "bold",
                marginBottom: "24px",
              }}
            >
              {wasMarkedWrong ? "❌ Your answer was wrong" : "🎉 Buzzer Pressed!"}
            </Typography>

            {/* Rank Badge */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              {positionBadges[myTeamEntry.rank] ? (
                <img
                  src={positionBadges[myTeamEntry.rank]}
                  alt={`Position ${myTeamEntry.rank}`}
                  style={{
                    width: "80px",
                    height: "80px",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    backgroundColor: "#3f51b5",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: "32px",
                  }}
                >
                  {myTeamEntry.rank}
                </Box>
              )}
            </Box>

            {/* Rank Text */}
            <Typography
              variant="h4"
              sx={{
                fontWeight: "bold",
                color: myTeamEntry.rank <= 3 ? "#FFD700" : "#333",
                marginBottom: "8px",
              }}
            >
              {getRankText(myTeamEntry.rank)} Place
            </Typography>

            {/* Team Name */}
            <Typography
              variant="h6"
              sx={{
                color: "#666",
                marginBottom: "24px",
              }}
            >
              {myTeamEntry.teamName}
            </Typography>

            {/* Time Display */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                padding: "16px 24px",
                borderRadius: "12px",
              }}
            >
              <img
                src={timerIcon}
                alt="Timer"
                style={{
                  width: "28px",
                  height: "28px",
                  objectFit: "contain",
                }}
              />
              <Typography
                sx={{
                  fontWeight: "bold",
                  fontSize: "28px",
                  color: myTeamEntry.rank <= 3 ? "#ff6b6b" : "#333",
                  fontFamily: "monospace",
                }}
              >
                {formatTime(
                  String(
                    getElapsedMs(
                      myTeamEntry.timestamp,
                      gameState?.buzzerRoundStartTime,
                    ),
                  ),
                )}
              </Typography>
            </Box>

            {/* Waiting Message */}
            {!isAnsweringState && (
              <Typography
                sx={{
                  color: "#888",
                  marginTop: "24px",
                  fontSize: "14px",
                }}
              >
                Waiting for admin to select a team...
              </Typography>
            )}
          </>
        ) : (
          <>
            {/* Not Pressed / Not Selected Message */}
            <Typography
              variant="h5"
              sx={{
                color: "#666",
                fontWeight: "bold",
                marginBottom: "16px",
              }}
            >
              ⏳ Waiting...
            </Typography>
            <Typography
              sx={{
                color: "#888",
                fontSize: "16px",
              }}
            >
              {isNoBuzzerQuestion
                ? "Waiting for admin to select your team..."
                : "You haven't pressed the buzzer"}
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};

export default BuzzerLeaderboard;
