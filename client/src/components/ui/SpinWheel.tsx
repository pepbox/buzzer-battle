import React, { useEffect, useRef, useState } from "react";
import { Box, Button } from "@mui/material";

export interface SpinWheelProps {
  segments: string[];
  winningIndex?: number;
  isSpinning?: boolean;
  durationMs?: number;
  onSpin?: () => void;
  canSpin?: boolean;
  size?: "small" | "medium" | "large" | "fill";
  showSpinButton?: boolean;
  spinButtonText?: string;
  onSpinEnd?: () => void;
}

const SEGMENT_COLORS = [
  "#FF4B4B", // Red / Coral
  "#FF851B", // Orange
  "#FFC300", // Amber
  "#2ECC40", // Emerald
  "#0074D9", // Cobalt Blue
  "#7928CA", // Purple
  "#FF007A", // Magenta / Hot Pink
  "#00B4D8", // Cyan
  "#10B981", // Teal
  "#F59E0B", // Gold
  "#6366F1", // Indigo
  "#EC4899", // Rose
];

export const SpinWheel: React.FC<SpinWheelProps> = ({
  segments,
  winningIndex,
  isSpinning = false,
  durationMs = 5000,
  onSpin,
  canSpin = false,
  size = "medium",
  showSpinButton = true,
  spinButtonText = "SPIN!",
  onSpinEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [localSpinning, setLocalSpinning] = useState(false);
  const spinStartTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startRotationRef = useRef<number>(0);
  const targetRotationRef = useRef<number>(0);

  // Dimension presets
  const sizeMap = {
    small: 260,
    medium: 360,
    large: 480,
    fill: 540,
  };
  const diameter = sizeMap[size] || 360;
  const radius = diameter / 2;

  const validSegments = segments && segments.length > 0 ? segments : ["No Categories"];
  const numSegments = validSegments.length;
  const arcSize = (2 * Math.PI) / numSegments;

  // Draw the wheel on canvas
  const drawWheel = (rotationAngleDeg: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== diameter * dpr || canvas.height !== diameter * dpr) {
      canvas.width = diameter * dpr;
      canvas.height = diameter * dpr;
      canvas.style.width = `${diameter}px`;
      canvas.style.height = `${diameter}px`;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, diameter, diameter);

    const centerX = radius;
    const centerY = radius;
    const wheelRadius = radius - 16; // Margin for border / shadow

    // Rotate context
    ctx.translate(centerX, centerY);
    const rotationRad = (rotationAngleDeg * Math.PI) / 180;
    ctx.rotate(rotationRad);

    // Draw Segments
    for (let i = 0; i < numSegments; i++) {
      const angle = i * arcSize;
      const nextAngle = angle + arcSize;
      const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, wheelRadius, angle, nextAngle);
      ctx.closePath();

      // Radial gradient for 3D metallic feel
      const grad = ctx.createRadialGradient(0, 0, 20, 0, 0, wheelRadius);
      grad.addColorStop(0, "#ffffff33");
      grad.addColorStop(0.3, color);
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
      ctx.fill();

      // Segment separator border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      const textAngle = angle + arcSize / 2;
      ctx.rotate(textAngle);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Dynamic font size depending on diameter & number of segments
      const fontSize = Math.max(11, Math.min(18, Math.floor(diameter / (numSegments > 8 ? 26 : 20))));
      ctx.font = `bold ${fontSize}px sans-serif`;

      let label = validSegments[i];
      if (label.length > 15) {
        label = label.substring(0, 13) + "...";
      }

      ctx.fillText(label, wheelRadius - 20, 0);
      ctx.restore();
    }

    // Outer wheel border & studs/pegs
    ctx.beginPath();
    ctx.arc(0, 0, wheelRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#1e293b"; // Dark slate ring
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, wheelRadius + 4, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#f59e0b"; // Golden accent ring
    ctx.stroke();

    // Draw pegs on outer ring
    const totalPegs = Math.max(12, numSegments * 2);
    for (let p = 0; p < totalPegs; p++) {
      const pegAngle = (p * 2 * Math.PI) / totalPegs;
      const pegX = (wheelRadius + 2) * Math.cos(pegAngle);
      const pegY = (wheelRadius + 2) * Math.sin(pegAngle);
      ctx.beginPath();
      ctx.arc(pegX, pegY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 2;
      ctx.fill();
    }

    // Center Hub
    const hubRadius = Math.max(26, diameter * 0.12);
    const hubGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, hubRadius);
    hubGrad.addColorStop(0, "#ffffff");
    hubGrad.addColorStop(0.4, "#94a3b8");
    hubGrad.addColorStop(1, "#0f172a");

    ctx.beginPath();
    ctx.arc(0, 0, hubRadius, 0, 2 * Math.PI);
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#f59e0b";
    ctx.stroke();

    ctx.restore();
  };

  // Re-draw when segments or rotation changes
  useEffect(() => {
    drawWheel(currentRotation);
  }, [segments, currentRotation, diameter]);

  // Cubic ease-out calculation
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  const prevIsSpinningRef = useRef(false);
  const spinCompletedRef = useRef(false);

  // Handle spin animation
  useEffect(() => {
    const isNewSpinTrigger = isSpinning && !prevIsSpinningRef.current;
    prevIsSpinningRef.current = isSpinning;

    if (isNewSpinTrigger) {
      spinCompletedRef.current = false;
      setLocalSpinning(true);
      const startRot = currentRotation % 360;
      startRotationRef.current = startRot;

      // Pointer is at the TOP (12 o'clock, 270 deg or -90 deg from 0 rad).
      // Angle 0 in canvas is 3 o'clock (90 deg to right).
      // 12 o'clock is at angle 270 deg in canvas coordinate space.
      // If wheel rotates by R deg clockwise, point at angle A moves to (A + R) % 360.
      // So at 270 deg, the segment under the pointer is the one whose original angle was (270 - (R % 360) + 360) % 360.
      // We want the center of segment W to end up at 270 deg:
      // Center of segment W = (W + 0.5) * (360 / numSegments).
      // So (270 - (TargetR % 360) + 360) % 360 = CenterOfW.
      // Therefore TargetR % 360 = (270 - CenterOfW + 360) % 360.
      const winIdx = winningIndex !== undefined ? winningIndex : Math.floor(Math.random() * numSegments);
      const degPerSegment = 360 / numSegments;
      const centerAngleOfWinner = (winIdx + 0.5) * degPerSegment;
      let finalAngleModulo = (270 - centerAngleOfWinner + 360) % 360;

      // Add minimum full rotations (e.g., 6 full turns)
      const fullRotations = 360 * 6;
      const targetRot = startRot + fullRotations + ((finalAngleModulo - (startRot % 360) + 360) % 360);
      targetRotationRef.current = targetRot;

      spinStartTimeRef.current = performance.now();

      const animate = (now: number) => {
        if (!spinStartTimeRef.current) return;
        const elapsed = now - spinStartTimeRef.current;
        const progress = Math.min(elapsed / durationMs, 1);
        const easedProgress = easeOutCubic(progress);

        const newRot = startRot + (targetRot - startRot) * easedProgress;
        setCurrentRotation(newRot);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setLocalSpinning(false);
          spinCompletedRef.current = true;
          spinStartTimeRef.current = null;
          if (onSpinEnd) {
            onSpinEnd();
          }
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else if (!isSpinning) {
      setLocalSpinning(false);
    }
  }, [isSpinning, winningIndex, durationMs, numSegments]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        userSelect: "none",
      }}
    >
      {/* Outer Wrapper with Glowing Border */}
      <Box
        sx={{
          position: "relative",
          width: diameter,
          height: diameter,
          borderRadius: "50%",
          boxShadow: localSpinning
            ? "0 0 45px rgba(245, 158, 11, 0.6), 0 0 80px rgba(99, 102, 241, 0.4)"
            : "0 10px 30px rgba(0, 0, 0, 0.35)",
          transition: "box-shadow 0.4s ease",
        }}
      >
        {/* Top Pointer Indicator */}
        <Box
          sx={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "16px solid transparent",
            borderRight: "16px solid transparent",
            borderTop: "32px solid #ef4444", // Vibrant red pointer
            filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.4))",
            zIndex: 10,
            transition: localSpinning ? "transform 0.08s ease" : "none",
          }}
        />

        {/* Pointer Jewel / Cap */}
        <Box
          sx={{
            position: "absolute",
            top: -16,
            left: "50%",
            transform: "translateX(-50%)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            bgcolor: "#fbbf24",
            border: "2px solid #ffffff",
            zIndex: 11,
          }}
        />

        {/* Wheel Canvas */}
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            borderRadius: "50%",
          }}
        />
      </Box>

      {/* Optional Interactive Spin Button Below */}
      {showSpinButton && (
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Button
            variant="contained"
            onClick={onSpin}
            disabled={!canSpin || localSpinning}
            sx={{
              px: 5,
              py: 1.5,
              fontSize: "1.25rem",
              fontWeight: 800,
              letterSpacing: "0.08em",
              borderRadius: "50px",
              background: canSpin && !localSpinning
                ? "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)"
                : undefined,
              boxShadow: canSpin && !localSpinning
                ? "0 8px 24px rgba(239, 68, 68, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)"
                : undefined,
              "&:hover": {
                background: "linear-gradient(135deg, #d97706 0%, #dc2626 100%)",
                transform: "translateY(-2px)",
                boxShadow: "0 12px 28px rgba(239, 68, 68, 0.5)",
              },
              "&:active": {
                transform: "translateY(1px)",
              },
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {localSpinning ? "SPINNING..." : spinButtonText}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default SpinWheel;
