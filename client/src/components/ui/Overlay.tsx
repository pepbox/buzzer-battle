import React, { useState, useEffect, ReactNode } from "react";
import { Box, Typography, Fade } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useAppSelector } from "../../app/hooks";
import { RootState } from "../../app/store";

interface OverlayProps {
  children: ReactNode;
  startCountdown?: boolean;
  onCountdownComplete?: () => void;
}

type OverlayState = "paused" | "ready" | "countdown" | "go" | "hidden";

const Overlay: React.FC<OverlayProps> = ({
  children,
  startCountdown = false,
  onCountdownComplete,
}) => {
  const theme = useTheme();
  const [overlayState, setOverlayState] = useState<OverlayState>("ready");
  const [countdownNumber, setCountdownNumber] = useState<number>(3);
  const [showOverlay, setShowOverlay] = useState<boolean>(false);
  const [isGamePaused, setIsGamePaused] = useState<boolean>(false); // Simulated game pause state
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

  const getOverlayContent = () => {
    switch (overlayState) {
      case "paused":
        return (
          <Box textAlign="center">
            <Typography
              variant="h4"
              sx={{
                fontWeight: "bold",
                color: "#FFFFFF",
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                mb: 2,
                fontSize: { xs: "1.5rem", sm: "2rem" },
              }}
            >
              The Game is Paused !
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "#FFFFFF",
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Take a breath,
              <br />
              The game will resume soon
            </Typography>
          </Box>
        );
      case "ready":
        return (
          <Typography
            variant="h2"
            sx={{
              fontWeight: "bold",
              color: "#FFFFFF",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              fontSize: { xs: "2.5rem", sm: "3.5rem" },
              animation: "pulse 0.5s ease-in-out",
              "@keyframes pulse": {
                "0%": { transform: "scale(1)" },
                "50%": { transform: "scale(1.1)" },
                "100%": { transform: "scale(1)" },
              },
            }}
          >
            Ready !
          </Typography>
        );
      case "countdown":
        return (
          <Typography
            key={countdownNumber}
            variant="h1"
            sx={{
              fontWeight: "bold",
              color: "#FFFFFF",
              textShadow: "0 3px 6px rgba(0,0,0,0.5)",
              fontSize: { xs: "4rem", sm: "6rem" },
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
        );
      case "go":
        return (
          <Typography
            variant="h2"
            sx={{
              fontWeight: "bold",
              color: theme.palette.success.main,
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              fontSize: { xs: "2.5rem", sm: "3.5rem" },
              animation: "zoomIn 0.6s ease-out",
              "@keyframes zoomIn": {
                "0%": { transform: "scale(0)", opacity: 0 },
                "100%": { transform: "scale(1)", opacity: 1 },
              },
            }}
          >
            Go...
          </Typography>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Main content */}
      <Box
        sx={{
          // opacity: showOverlay ? 0.3 : 1,
          transition: "opacity 0.3s ease-in-out",
          // filter: showOverlay ? "blur(2px)" : "none",
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
            background: "rgba(0, 0, 0, 0.70)",
            backdropFilter: "blur(4px)",
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
