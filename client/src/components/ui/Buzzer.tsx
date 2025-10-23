import React, { useState, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import buzzerNormal from "../../assets/buzzer/Buzzer.webp";
import buzzerPressed from "../../assets/buzzer/Buzzer_presed.webp";

interface BuzzerProps {
  onPress?: () => void;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  showPressText?: boolean;
}

const Buzzer: React.FC<BuzzerProps> = ({
  onPress,
  disabled = false,
  size = "large",
  showPressText = true,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Size configurations
  const sizeConfig = {
    small: {
      width: "120px",
      height: "120px",
      fontSize: "14px",
    },
    medium: {
      width: "180px",
      height: "180px",
      fontSize: "16px",
    },
    large: {
      width: "240px",
      height: "240px",
      fontSize: "18px",
    },
  };

  const currentSize = sizeConfig[size];

  const handlePress = useCallback(() => {
    if (disabled || isAnimating) return;

    setIsAnimating(true);
    setIsPressed(true);

    // Call the onPress callback
    if (onPress) {
      onPress();
    }

    // Animation sequence: press down, hold briefly, then release
    // setTimeout(() => {
    //   setIsPressed(false);
    // }, 150);

    setTimeout(() => {
      setIsAnimating(false);
    }, 400);
  }, [disabled, isAnimating, onPress]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      {/* Buzzer Button */}
      <Box
        onClick={handlePress}
        sx={{
          width: currentSize.width,
          height: currentSize.height,
          backgroundImage: `url(${isPressed ? buzzerPressed : buzzerNormal})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          cursor: disabled ? "default" : "pointer",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.1s ease",
          transform: isPressed
            ? "scale(0.95) translateY(2px)"
            : isAnimating
            ? "scale(1.02)"
            : "scale(1)",
          filter: disabled ? "grayscale(50%) opacity(0.6)" : "none",
          "&:hover": {
            transform: disabled
              ? "scale(1)"
              : isPressed
              ? "scale(0.95) translateY(2px)"
              : "scale(1.05)",
            filter: disabled
              ? "grayscale(50%) opacity(0.6)"
              : "brightness(1.1)",
          },
          "&:active": {
            transform: disabled ? "scale(1)" : "scale(0.95) translateY(3px)",
          },
        }}
      >
        {/* Press Text */}
        {showPressText && !isPressed && (
          <Typography
            variant="body2"
            sx={{
              color: "white",
              fontWeight: "bold",
              fontSize: currentSize.fontSize,
              textAlign: "center",
              textShadow: "2px 2px 4px rgba(0, 0, 0, 0.7)",
              letterSpacing: "0.5px",
              marginTop: "10px",
              animation: isAnimating ? "pulse 0.5s ease-in-out" : "none",
              "@keyframes pulse": {
                "0%": {
                  opacity: 1,
                  transform: "scale(1)",
                },
                "50%": {
                  opacity: 0.8,
                  transform: "scale(1.1)",
                },
                "100%": {
                  opacity: 1,
                  transform: "scale(1)",
                },
              },
            }}
          >
            Press
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Buzzer;
