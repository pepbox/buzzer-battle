import React, { useEffect, useState, useRef } from "react";
import { Box, Chip, Paper, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import SpinWheel from "../../../components/ui/SpinWheel";
import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";
import {
  useFetchAvailableCategoriesQuery,
  useFetchGameStateQuery,
} from "../services/gameStateApi";
import { useFetchOverallLeaderboardQuery } from "../services/teamApi";
import { useTriggerSpinWheel } from "../../admin/services/adminRemoteApi";

export const SpinWheelPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const team = useAppSelector((state: RootState) => state.team?.team);
  const gameState = useAppSelector(
    (state: RootState) => state.gameState.gameState,
  );
  const { data: categoriesData, refetch: refetchCategories } =
    useFetchAvailableCategoriesQuery();
  const { data: leaderboardData } = useFetchOverallLeaderboardQuery();
  useFetchGameStateQuery();
  const { triggerSpinWheel } = useTriggerSpinWheel();

  const [isSpinning, setIsSpinning] = useState(
    Boolean(gameState?.spinWheelState?.isSpinning),
  );
  const [winningIndex, setWinningIndex] = useState<number | undefined>(
    gameState?.spinWheelState?.winningIndex,
  );
  const [landedCategory, setLandedCategory] = useState<string | null>(null);
  const pendingTargetCategoryRef = useRef<string | null>(null);

  const normalizeId = (val: any): string => {
    if (!val) return "";
    if (typeof val === "string") return val;
    return val._id || val.id || String(val);
  };

  const currentAnsweringTeamId = normalizeId(gameState?.currentAnsweringTeam);
  const myTeamId = normalizeId(team?._id);
  const isMyTeamTurn = Boolean(
    currentAnsweringTeamId && currentAnsweringTeamId === myTeamId,
  );
  const isCaptain = team?.playerRole === "BUZZER_PERSON";
  const isCaptainTurn = isMyTeamTurn && isCaptain;

  // Resolving selected team display name for spectators
  const answeringTeamObj =
    typeof gameState?.currentAnsweringTeam === "object" &&
    gameState?.currentAnsweringTeam !== null
      ? (gameState.currentAnsweringTeam as any)
      : leaderboardData?.data?.leaderboard?.find(
          (t: any) =>
            normalizeId(t._id || t.teamId) === currentAnsweringTeamId,
        );

  const selectedTeamName =
    answeringTeamObj?.teamName ||
    (answeringTeamObj?.teamNumber
      ? `Team ${answeringTeamObj.teamNumber}`
      : "Selected Team");

  // Categories
  const segments =
    gameState?.availableCategories?.length
      ? gameState.availableCategories
      : categoriesData?.data?.categories?.length
        ? categoriesData.data.categories
        : ["General"];

  const hasLandedThisTurnRef = useRef(false);

  // Clear landed chip whenever team changes or before spin starts
  useEffect(() => {
    if (!gameState?.spinWheelState?.isSpinning) {
      setLandedCategory(null);
      pendingTargetCategoryRef.current = null;
      hasLandedThisTurnRef.current = false;
    }
  }, [gameState?.currentAnsweringTeam]);

  // Socket listener for sync
  useEffect(() => {
    const handleSpinTriggered = (data: any) => {
      hasLandedThisTurnRef.current = false;
      setIsSpinning(true);
      setLandedCategory(null);
      pendingTargetCategoryRef.current = data?.targetCategory || null;
      if (data?.winningIndex !== undefined) {
        setWinningIndex(data.winningIndex);
      }
    };

    const handleWheelLanded = (data: any) => {
      hasLandedThisTurnRef.current = true;
      setIsSpinning(false);
      const landed = data?.targetCategory || pendingTargetCategoryRef.current;
      if (landed) {
        setLandedCategory(landed);
      }
      refetchCategories();
    };

    websocketService.on(Events.WHEEL_SPIN_TRIGGERED, handleSpinTriggered);
    websocketService.on(Events.WHEEL_LANDED, handleWheelLanded);

    return () => {
      websocketService.off(Events.WHEEL_SPIN_TRIGGERED, handleSpinTriggered);
      websocketService.off(Events.WHEEL_LANDED, handleWheelLanded);
    };
  }, [refetchCategories]);

  useEffect(() => {
    if (gameState?.spinWheelState?.isSpinning && !hasLandedThisTurnRef.current) {
      setIsSpinning(true);
      if (gameState.spinWheelState.winningIndex !== undefined) {
        setWinningIndex(gameState.spinWheelState.winningIndex);
      }
      if (gameState.spinWheelState.targetCategory) {
        pendingTargetCategoryRef.current = gameState.spinWheelState.targetCategory;
      }
    }
  }, [gameState?.spinWheelState]);

  const handleSpinClick = () => {
    if (!isCaptainTurn || isSpinning) return;

    if (websocketService.getConnectionStatus()) {
      websocketService.emit("spin-wheel", {
        sessionId,
        teamId: team?._id,
      });
    } else {
      triggerSpinWheel(team?._id);
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        p: { xs: 1.5, sm: 2.5 },
        gap: 1,
        background: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)",
        color: "#ffffff",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      {/* Top Banner */}
      <Box sx={{ width: "100%", textAlign: "center", flexShrink: 0 }}>
        <Chip
          label="🎡 CATEGORY WHEEL"
          sx={{
            bgcolor: "#f59e0b",
            color: "#0f172a",
            fontWeight: 800,
            fontSize: "0.85rem",
            letterSpacing: "0.08em",
            mb: 1,
          }}
        />

        {isCaptainTurn ? (
          <Paper
            elevation={4}
            sx={{
              p: 1.25,
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(239, 68, 68, 0.25) 100%)",
              border: "2px solid #f59e0b",
              color: "#ffffff",
              backdropFilter: "blur(10px)",
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.05rem", sm: "1.25rem" } }}>
              🎯 It's Your Turn to Spin!
            </Typography>
            <Typography variant="body2" sx={{ color: "#cbd5e1", mt: 0.25 }}>
              Tap the SPIN button to pick your team's category.
            </Typography>
          </Paper>
        ) : (
          <Paper
            elevation={1}
            sx={{
              p: 1.5,
              borderRadius: "16px",
              bgcolor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#cbd5e1",
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold">
              {isMyTeamTurn
                ? "🎯 Your Team's Turn"
                : currentAnsweringTeamId
                  ? `🎯 ${selectedTeamName}'s Turn`
                  : "Waiting for Team Turn"}
            </Typography>
            <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.5 }}>
              {isMyTeamTurn
                ? "Your Captain is spinning the wheel on their screen."
                : currentAnsweringTeamId
                  ? `${selectedTeamName} is spinning the wheel. Watch the main presenter screen!`
                  : "The host will assign a team to spin the wheel shortly."}
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Main Content: Interactive Wheel ONLY for Captain, Spectator Waiting Card for Everyone Else */}
      {isCaptainTurn ? (
        <>
          {/* Takes all remaining height; the wheel sizes itself to fit with the button visible */}
          <Box
            sx={{
              flex: "1 1 auto",
              minHeight: 0,
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <SpinWheel
              segments={segments}
              winningIndex={winningIndex}
              isSpinning={isSpinning}
              durationMs={gameState?.spinWheelState?.durationMs || 5000}
              onSpin={handleSpinClick}
              canSpin={!isSpinning}
              size="auto"
              maxDiameter={360}
              showSpinButton={true}
              spinButtonText="SPIN WHEEL!"
              onSpinEnd={() => {
                setIsSpinning(false);
                if (pendingTargetCategoryRef.current) {
                  setLandedCategory(pendingTargetCategoryRef.current);
                }
              }}
            />
          </Box>

          {/* Bottom Category Status for Captain */}
          <Box
            sx={{
              width: "100%",
              textAlign: "center",
              flexShrink: 0,
              minHeight: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {landedCategory && (
              <Paper
                elevation={4}
                sx={{
                  p: 1,
                  borderRadius: "50px",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#ffffff",
                  boxShadow: "0 6px 20px rgba(16, 185, 129, 0.4)",
                  width: "100%",
                  maxWidth: 360,
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  🎯 LANDED ON: {landedCategory.toUpperCase()}
                </Typography>
              </Paper>
            )}
          </Box>
        </>
      ) : (
        /* Spectator / Non-Captain Waiting View - No wheel spinning on device */
        <Box
          sx={{
            my: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            maxWidth: 420,
            width: "100%",
            px: 2,
          }}
        >
          <Paper
            elevation={6}
            sx={{
              p: 3.5,
              borderRadius: "24px",
              background:
                "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)",
              border: isSpinning
                ? "2px solid #f59e0b"
                : "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              textAlign: "center",
              boxShadow: isSpinning
                ? "0 0 30px rgba(245, 158, 11, 0.3)"
                : "0 12px 32px rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(16px)",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <Box
              sx={{
                fontSize: 54,
                mb: 2,
                animation: isSpinning ? "spin 2s linear infinite" : "none",
                "@keyframes spin": {
                  "0%": { transform: "rotate(0deg)" },
                  "100%": { transform: "rotate(360deg)" },
                },
              }}
            >
              🎡
            </Box>

            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: isSpinning ? "#f59e0b" : "#ffffff",
                mb: 1,
              }}
            >
              {isMyTeamTurn
                ? "🎯 Your Captain is spinning!"
                : currentAnsweringTeamId
                  ? `🎯 ${selectedTeamName} is spinning!`
                  : "Waiting for Team Turn"}
            </Typography>

            <Typography
              variant="body1"
              sx={{ color: "#cbd5e1", mb: 2.5, lineHeight: 1.6 }}
            >
              {isMyTeamTurn
                ? isSpinning
                  ? "Your Captain is spinning the wheel! Look at the main presenter screen to see which category lands!"
                  : "Your Captain will spin the wheel on their screen. Watch the main presenter screen!"
                : currentAnsweringTeamId
                  ? isSpinning
                    ? "The wheel is spinning! Watch the main presenter screen to see which category they get!"
                    : `Waiting for ${selectedTeamName} to spin the wheel on the presenter screen.`
                  : "The host will assign a team to spin the wheel shortly."}
            </Typography>

            {isSpinning && (
              <Chip
                label="🎡 WHEEL IS SPINNING..."
                sx={{
                  bgcolor: "rgba(245, 158, 11, 0.2)",
                  color: "#f59e0b",
                  fontWeight: 800,
                  border: "1px solid #f59e0b",
                  py: 2,
                  px: 1,
                  fontSize: "0.9rem",
                }}
              />
            )}

            {landedCategory && !isSpinning && (
              <Chip
                label={`🎯 LANDED ON: ${landedCategory.toUpperCase()}`}
                sx={{
                  bgcolor: "#10b981",
                  color: "#ffffff",
                  fontWeight: 800,
                  py: 2,
                  px: 1,
                  fontSize: "0.95rem",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
                }}
              />
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default SpinWheelPage;
