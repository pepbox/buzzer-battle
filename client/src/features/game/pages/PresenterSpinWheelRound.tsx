import React, { useEffect, useState, useRef } from "react";
import { Box, Chip, Paper, Typography } from "@mui/material";
import { useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import { SpinWheel } from "../../../components/ui/SpinWheel";
import questionBg from "../../../assets/background/normal_bg.webp";
import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";
import { useFetchAvailableCategoriesQuery } from "../services/gameStateApi";
import { useFetchOverallLeaderboardQuery } from "../services/teamApi";

export const PresenterSpinWheelRound: React.FC = () => {
  const gameState = useAppSelector(
    (state: RootState) => state.gameState.gameState,
  );
  const { data: categoriesData, refetch: refetchCategories } =
    useFetchAvailableCategoriesQuery();
  const { data: leaderboardData } = useFetchOverallLeaderboardQuery();

  const [isSpinning, setIsSpinning] = useState(
    Boolean(gameState?.spinWheelState?.isSpinning),
  );
  const [winningIndex, setWinningIndex] = useState<number | undefined>(
    gameState?.spinWheelState?.winningIndex,
  );
  const [landedCategory, setLandedCategory] = useState<string | null>(null);
  const pendingTargetCategoryRef = useRef<string | null>(null);

  // Available categories to display on the wheel
  const segments =
    gameState?.availableCategories?.length
      ? gameState.availableCategories
      : categoriesData?.data?.categories?.length
        ? categoriesData.data.categories
        : ["General"];

  // Resolving answering team info
  const answeringTeamRaw: any = gameState?.currentAnsweringTeam;
  const answeringTeamId =
    typeof answeringTeamRaw === "string"
      ? answeringTeamRaw
      : answeringTeamRaw?._id;
  const teams = leaderboardData?.data?.leaderboard || [];
  const answeringTeam = teams.find(
    (t: any) =>
      t.teamId === answeringTeamId ||
      t._id === answeringTeamId ||
      (answeringTeamRaw &&
        typeof answeringTeamRaw === "object" &&
        t.teamNumber === answeringTeamRaw.teamNumber),
  );

  const teamName =
    answeringTeam?.teamName ||
    (typeof answeringTeamRaw === "object" ? answeringTeamRaw?.teamName : null) ||
    (typeof answeringTeamRaw === "object" && answeringTeamRaw?.teamNumber
      ? `Team ${answeringTeamRaw.teamNumber}`
      : "Selected Team");

  const hasLandedThisTurnRef = useRef(false);

  // Clear chip whenever team changes or before spin starts
  useEffect(() => {
    if (!gameState?.spinWheelState?.isSpinning) {
      setLandedCategory(null);
      pendingTargetCategoryRef.current = null;
      hasLandedThisTurnRef.current = false;
    }
  }, [gameState?.currentAnsweringTeam]);

  // Listen for socket wheel spin events to synchronize animation perfectly
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

  // Keep state synced with Redux updates
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

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        height: "100%",
        width: "100%",
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.85)), url(${questionBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        overflow: "hidden",
        p: 3,
        boxSizing: "border-box",
      }}
    >
      {/* Top Header Card */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
          zIndex: 2,
        }}
      >
        <Chip
          label="🎡 SPIN WHEEL ROUND"
          sx={{
            bgcolor: "#f59e0b",
            color: "#0f172a",
            fontWeight: 900,
            fontSize: "1rem",
            px: 2,
            py: 0.5,
            letterSpacing: "0.08em",
          }}
        />

        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.8)",
          }}
        >
          {teamName}&apos;s Turn to Spin!
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: "#cbd5e1",
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          {isSpinning
            ? "Wheel is spinning... which category will they get?"
            : landedCategory
              ? `🎯 Landed on ${landedCategory}! Loading question...`
              : "Waiting for the Team Captain to spin the wheel on their mobile screen..."}
        </Typography>
      </Box>

      {/* Center Interactive Mirror Spin Wheel */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          my: "auto",
          zIndex: 2,
        }}
      >
        <SpinWheel
          segments={segments}
          winningIndex={winningIndex}
          isSpinning={isSpinning}
          durationMs={gameState?.spinWheelState?.durationMs || 5000}
          size="large"
          showSpinButton={false}
          onSpinEnd={() => {
            setIsSpinning(false);
            if (pendingTargetCategoryRef.current) {
              setLandedCategory(pendingTargetCategoryRef.current);
            }
          }}
        />
      </Box>

      {/* Bottom Result / Info Pill */}
      <Box sx={{ zIndex: 2 }}>
        {landedCategory ? (
          <Paper
            elevation={6}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: "50px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#ffffff",
              boxShadow: "0 10px 25px rgba(16, 185, 129, 0.5)",
              animation: "bounce 0.6s ease",
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              🎯 CATEGORY: {landedCategory.toUpperCase()}
            </Typography>
          </Paper>
        ) : (
          <Paper
            elevation={3}
            sx={{
              px: 3,
              py: 1,
              borderRadius: "30px",
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              color: "#f8fafc",
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              {segments.length} Categories Available • 1 Question per Spin
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default PresenterSpinWheelRound;
