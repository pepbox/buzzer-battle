import React, { ReactNode } from "react";
import { Box, CircularProgress, SxProps, Theme, Typography } from "@mui/material";
import normalBg from "../../assets/background/normal_bg.webp";
import questionBg from "../../assets/background/question_bg.webp";

/**
 * Shared full-screen background for player (team) screens.
 *
 * Every in-game screen should sit on one of the game backgrounds so that no state
 * (waiting, turn ended, loading, errors) ever falls through to the plain white
 * layout behind it. The gradient is layered *under* the image so it acts as a
 * fallback while the image loads, instead of being overridden by it.
 */
const BACKGROUNDS = {
  normal: normalBg,
  question: questionBg,
} as const;

const FALLBACK_GRADIENT = "linear-gradient(180deg, #87CEEB 0%, #4682B4 100%)";

interface GameBackgroundProps {
  children?: ReactNode;
  variant?: keyof typeof BACKGROUNDS;
  /** Center children both ways (default true). */
  centered?: boolean;
  sx?: SxProps<Theme>;
}

export const GameBackground: React.FC<GameBackgroundProps> = ({
  children,
  variant = "normal",
  centered = true,
  sx,
}) => (
  <Box
    sx={[
      {
        width: "100%",
        flex: "1 0 auto",
        minHeight: "100%",
        backgroundImage: `url(${BACKGROUNDS[variant]}), ${FALLBACK_GRADIENT}`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        ...(centered && {
          alignItems: "center",
          justifyContent: "center",
        }),
        p: { xs: 2, sm: 3 },
        boxSizing: "border-box",
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    {children}
  </Box>
);

interface GameStatusMessageProps {
  /** Emoji or icon shown above the title. */
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Show an animated spinner under the text (for "waiting" states). */
  showSpinner?: boolean;
}

/**
 * A readable, on-brand status panel for waiting / informational player states,
 * designed to sit on top of a GameBackground.
 */
export const GameStatusMessage: React.FC<GameStatusMessageProps> = ({
  icon,
  title,
  subtitle,
  showSpinner = false,
}) => (
  <Box
    role="status"
    aria-live="polite"
    sx={{
      width: "100%",
      maxWidth: 420,
      textAlign: "center",
      color: "#FFFFFF",
      backgroundColor: "rgba(15, 23, 42, 0.72)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 215, 0, 0.35)",
      borderRadius: "20px",
      boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
      px: { xs: 3, sm: 4 },
      py: { xs: 3, sm: 4 },
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 1.25,
      animation: "gameStatusFadeIn 300ms ease-out",
      "@keyframes gameStatusFadeIn": {
        from: { opacity: 0, transform: "translateY(8px)" },
        to: { opacity: 1, transform: "translateY(0)" },
      },
    }}
  >
    {icon && (
      <Typography component="div" sx={{ fontSize: 40, lineHeight: 1 }} aria-hidden>
        {icon}
      </Typography>
    )}
    <Typography
      component="h2"
      sx={{
        color: "#FFD700",
        fontWeight: 800,
        fontSize: { xs: "1.25rem", sm: "1.45rem" },
        lineHeight: 1.3,
        textShadow: "0 2px 4px rgba(0, 0, 0, 0.4)",
      }}
    >
      {title}
    </Typography>
    {subtitle && (
      <Typography
        sx={{
          color: "rgba(255, 255, 255, 0.85)",
          fontWeight: 500,
          fontSize: { xs: "0.95rem", sm: "1rem" },
          lineHeight: 1.5,
        }}
      >
        {subtitle}
      </Typography>
    )}
    {showSpinner && (
      <CircularProgress size={26} thickness={5} sx={{ color: "#FFD700", mt: 1 }} />
    )}
  </Box>
);

/** Convenience: full-screen background + status message. */
export const GameStatusScreen: React.FC<
  GameStatusMessageProps & { variant?: keyof typeof BACKGROUNDS }
> = ({ variant, ...messageProps }) => (
  <GameBackground variant={variant}>
    <GameStatusMessage {...messageProps} />
  </GameBackground>
);

export default GameBackground;
