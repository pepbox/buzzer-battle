import React, { useState, useEffect, ReactNode } from "react";
import { Box, Typography, Fade } from "@mui/material";
import { useAppSelector } from "../../app/hooks";
import { RootState } from "../../app/store";
import correctBg from "../../assets/background/correct_bg.webp";
import timerIcon from "../../assets/leaderboard/timer.webp";

interface OverlayProps {
  children: ReactNode;
  startCountdown?: boolean;
  onCountdownComplete?: () => void;
}

type OverlayState = "paused" | "ready" | "countdown" | "go" | "hidden";

// Theme colors
const THEME_GREEN = "#2ECC71";
const THEME_GREEN_DARK = "#27AE60";

const Overlay: React.FC<OverlayProps> = ({
  children,
  startCountdown = false,
  onCountdownComplete,
}) => {
  const [overlayState, setOverlayState] = useState<OverlayState>("ready");
  const [countdownNumber, setCountdownNumber] = useState<number>(3);
  const [showOverlay, setShowOverlay] = useState<boolean>(false);
  const [isGamePaused, setIsGamePaused] = useState<boolean>(false);
  const { gameState } = useAppSelector((state: RootState) => state.gameState);

  useEffect(() => {
    if (gameState?.gameStatus === "paused") {
      setIsGamePaused(true);
      setShowOverlay(true);
      setOverlayState("paused");
    } else {
      setIsGamePaused(false);
      setShowOverlay(false);
      setOverlayState("hidden");
    }
  }, [gameState]);

  useEffect(() => {
    if (isGamePaused) {
      setOverlayState("paused");
      setShowOverlay(true);
    } else if (startCountdown && overlayState === "paused") {
      setOverlayState("ready");
    }
  }, [isGamePaused, startCountdown, overlayState]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (overlayState === "ready") {
      timer = setTimeout(() => {
        setOverlayState("countdown");
        setCountdownNumber(3);
      }, 1000);
    } else if (overlayState === "countdown") {
      if (countdownNumber > 1) {
        timer = setTimeout(() => {
          setCountdownNumber(countdownNumber - 1);
        }, 1000);
      } else {
        timer = setTimeout(() => {
          setOverlayState("go");
        }, 1000);
      }
    } else if (overlayState === "go") {
      timer = setTimeout(() => {
        setOverlayState("hidden");
        setShowOverlay(false);
        onCountdownComplete?.();
      }, 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [overlayState, countdownNumber, onCountdownComplete]);

  // Card component for overlay content
  const OverlayCard: React.FC<{ children: ReactNode }> = ({ children }) => (
    <Box
      sx={{
        backgroundColor: "#FFFFFF",
        borderRadius: "24px",
        border: `4px solid ${THEME_GREEN}`,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
        padding: { xs: "32px 40px", sm: "48px 64px" },
        minWidth: { xs: "280px", sm: "320px" },
        textAlign: "center",
        animation: "cardPop 0.4s ease-out",
        "@keyframes cardPop": {
          "0%": { transform: "scale(0.8)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
      }}
    >
      {children}
    </Box>
  );

  const getOverlayContent = () => {
    switch (overlayState) {
      case "paused":
        return (
          <OverlayCard>
            <Box
              component="img"
              src={timerIcon}
              alt="Timer"
              sx={{
                width: { xs: "48px", sm: "56px" },
                height: { xs: "48px", sm: "56px" },
                mb: 2,
              }}
            />
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: THEME_GREEN_DARK,
                mb: 1,
                fontSize: { xs: "1.75rem", sm: "2.25rem" },
              }}
            >
              The Game is Paused !
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: THEME_GREEN,
                fontSize: { xs: "1rem", sm: "1.1rem" },
                fontWeight: 500,
              }}
            >
              Take a breath,
              <br />
              The game will resume soon
            </Typography>
          </OverlayCard>
        );
      case "ready":
        return (
          <OverlayCard>
            <Box
              component="img"
              src={timerIcon}
              alt="Timer"
              sx={{
                width: { xs: "48px", sm: "56px" },
                height: { xs: "48px", sm: "56px" },
                mb: 2,
              }}
            />
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                color: THEME_GREEN_DARK,
                fontSize: { xs: "2.5rem", sm: "3rem" },
                animation: "pulse 0.5s ease-in-out",
                "@keyframes pulse": {
                  "0%": { transform: "scale(1)" },
                  "50%": { transform: "scale(1.05)" },
                  "100%": { transform: "scale(1)" },
                },
              }}
            >
              Ready !
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: THEME_GREEN,
                fontSize: { xs: "1rem", sm: "1.1rem" },
                fontWeight: 500,
                mt: 1,
              }}
            >
              Get set...
            </Typography>
          </OverlayCard>
        );
      case "countdown":
        return (
          <OverlayCard>
            <Typography
              key={countdownNumber}
              variant="h1"
              sx={{
                fontWeight: 700,
                color: THEME_GREEN_DARK,
                fontSize: { xs: "5rem", sm: "7rem" },
                lineHeight: 1,
                animation: "bounceIn 0.8s ease-out",
                "@keyframes bounceIn": {
                  "0%": { transform: "scale(0.3)", opacity: 0 },
                  "50%": { transform: "scale(1.05)", opacity: 1 },
                  "70%": { transform: "scale(0.9)" },
                  "100%": { transform: "scale(1)" },
                },
              }}
            >
              {countdownNumber}
            </Typography>
          </OverlayCard>
        );
      case "go":
        return (
          <OverlayCard>
            <Box sx={{ fontSize: { xs: "48px", sm: "56px" }, mb: 1 }}>🔥</Box>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                color: THEME_GREEN_DARK,
                fontSize: { xs: "2.5rem", sm: "3rem" },
                animation: "zoomIn 0.6s ease-out",
                "@keyframes zoomIn": {
                  "0%": { transform: "scale(0)", opacity: 0 },
                  "100%": { transform: "scale(1)", opacity: 1 },
                },
              }}
            >
              Go...
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: THEME_GREEN,
                fontSize: { xs: "1rem", sm: "1.1rem" },
                fontWeight: 500,
                mt: 1,
              }}
            >
              You're on fire...
            </Typography>
          </OverlayCard>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ position: "relative", width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {/* Main content */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          transition: "opacity 0.3s ease-in-out",
          overflow: "hidden"
        }}
      >
        {children}
      </Box>

      {/* Overlay */}
      <Fade in={showOverlay} timeout={300}>
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${correctBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <Fade in={true} timeout={500} key={overlayState}>
            <Box>{getOverlayContent()}</Box>
          </Fade>
        </Box>
      </Fade>
    </Box>
  );
};

export default Overlay;
