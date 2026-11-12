import React, { useEffect, useRef, useState } from "react";
import { Box, Button } from "@mui/material";

export interface SpinWheelProps {
  segments: string[];
  winningIndex?: number;
  isSpinning?: boolean;
  durationMs?: number;
  onSpin?: () => void;
  canSpin?: boolean;
  /**
   * Fixed presets, or "auto" to fit the space the parent gives it (width AND height),
   * keeping the spin button visible on small phones. The parent must give it a
   * bounded height (e.g. flex: 1; min-height: 0).
   */
  size?: "small" | "medium" | "large" | "fill" | "auto";
  /** Upper bound for the wheel diameter in px (mainly for size="auto"). */
  maxDiameter?: number;
  showSpinButton?: boolean;
  spinButtonText?: string;
  onSpinEnd?: () => void;
}

const MIN_DIAMETER = 140;
const LABEL_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MIN_FONT = 10;

interface LabelLayout {
  lines: string[];
  fontSize: number;
}

/**
 * Fit a category label inside its wheel segment.
 * Text runs along the radius, so its length is limited by the space between the hub
 * and the rim, and its height (line count x font size) by the segment's arc width.
 * Tries the largest font first, then two lines, then ellipsis at the minimum size.
 */
const fitLabel = (
  ctx: CanvasRenderingContext2D,
  label: string,
  maxWidth: number,
  maxHeight: number,
  maxFont: number,
): LabelLayout => {
  const fits = (text: string, size: number) => {
    ctx.font = `800 ${size}px ${LABEL_FONT}`;
    return ctx.measureText(text).width <= maxWidth;
  };
  const words = label.split(/\s+/).filter(Boolean);

  for (let size = Math.floor(maxFont); size >= MIN_FONT; size--) {
    if (size * 1.15 <= maxHeight && fits(label, size)) {
      return { lines: [label], fontSize: size };
    }
    if (words.length > 1 && size * 2.3 <= maxHeight) {
      // Most balanced two-line split
      let best: string[] | null = null;
      let bestDiff = Infinity;
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(" ");
        const b = words.slice(i).join(" ");
        if (fits(a, size) && fits(b, size)) {
          const diff = Math.abs(a.length - b.length);
          if (diff < bestDiff) {
            bestDiff = diff;
            best = [a, b];
          }
        }
      }
      if (best) return { lines: best, fontSize: size };
    }
  }

  // Still too long: use a small-but-readable size and show as much as possible.
  const size = Math.max(
    MIN_FONT,
    Math.min(12, Math.floor(maxFont), Math.floor(maxHeight / 1.15)),
  );
  const truncate = (text: string) => {
    if (fits(text, size)) return text;
    let cut = text;
    while (cut.length > 1 && !fits(`${cut.trimEnd()}…`, size)) {
      cut = cut.slice(0, -1);
    }
    return `${cut.trimEnd()}…`;
  };

  if (words.length > 1 && size * 2.3 <= maxHeight) {
    // First line: as many whole words as fit; second line: the rest, truncated.
    let firstCount = 1;
    while (
      firstCount < words.length - 1 &&
      fits(words.slice(0, firstCount + 1).join(" "), size)
    ) {
      firstCount++;
    }
    return {
      lines: [
        truncate(words.slice(0, firstCount).join(" ")),
        truncate(words.slice(firstCount).join(" ")),
      ],
      fontSize: size,
    };
  }

  return { lines: [truncate(label)], fontSize: size };
};

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
  maxDiameter,
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [available, setAvailable] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Track the space we can use so the wheel never overflows (or pushes the
  // spin button off-screen) on small devices.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const buttonBlock = showSpinButton
        ? (buttonRef.current?.offsetHeight ?? 0) + 16
        : 0;
      setAvailable({
        width: el.clientWidth,
        // 16px headroom for the pointer that sits above the wheel
        height: size === "auto" ? Math.max(0, el.clientHeight - buttonBlock - 16) : 0,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [size, showSpinButton]);

  // Dimension presets
  const sizeMap = {
    small: 260,
    medium: 360,
    large: 480,
    fill: 540,
    auto: 360,
  };
  const presetDiameter = maxDiameter ?? sizeMap[size] ?? 360;
  const fitLimits = [presetDiameter];
  if (available.width > 0) fitLimits.push(available.width - 8);
  if (size === "auto" && available.height > 0) fitLimits.push(available.height);
  const diameter = Math.max(
    MIN_DIAMETER,
    Math.floor(Math.min(...fitLimits)),
  );
  const radius = diameter / 2;

  const validSegments = segments && segments.length > 0 ? segments : ["No Categories"];
  const numSegments = validSegments.length;
  const arcSize = (2 * Math.PI) / numSegments;

  // Geometry shared by label fitting and drawing
  // Margins scale with the wheel so small wheels keep room for labels.
  const wheelRadius = radius - Math.max(9, Math.round(diameter * 0.045)); // rim, pegs, shadow
  const hubRadius = Math.max(14, diameter * 0.085);
  const labelOuter = wheelRadius - Math.max(6, diameter * 0.025);
  const labelInner = hubRadius + 4;

  // Label layouts only change with segments/diameter, not every animation frame.
  const labelCacheRef = useRef<{ key: string; layouts: LabelLayout[] } | null>(null);
  const getLabelLayouts = (ctx: CanvasRenderingContext2D): LabelLayout[] => {
    const key = `${diameter}|${validSegments.join("\u0000")}`;
    if (labelCacheRef.current?.key === key) return labelCacheRef.current.layouts;

    const maxWidth = labelOuter - labelInner;
    const maxFont = Math.min(24, diameter / 14);
    const layouts = validSegments.map((label) => {
      // Arc width available at the label's middle; a single segment has no limit.
      const midRadius = labelOuter - maxWidth * 0.35;
      const arcWidth =
        numSegments === 1 ? Infinity : 2 * midRadius * Math.sin(arcSize / 2) * 0.9;
      return fitLabel(ctx, label, maxWidth, arcWidth, maxFont);
    });
    labelCacheRef.current = { key, layouts };
    return layouts;
  };

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
    const labelLayouts = getLabelLayouts(ctx);

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

      // Draw label: fitted size, dark outline for contrast on every segment colour
      ctx.save();
      const textAngle = angle + arcSize / 2;
      ctx.rotate(textAngle);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const { lines, fontSize } = labelLayouts[i];
      ctx.font = `800 ${fontSize}px ${LABEL_FONT}`;
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(2.5, fontSize / 4);
      ctx.strokeStyle = "rgba(15, 23, 42, 0.75)";
      ctx.fillStyle = "#ffffff";
      const lineHeight = fontSize * 1.15;
      lines.forEach((line, lineIndex) => {
        const y = (lineIndex - (lines.length - 1) / 2) * lineHeight;
        ctx.strokeText(line, labelOuter, y);
        ctx.fillText(line, labelOuter, y);
      });
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
      ref={containerRef}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        userSelect: "none",
        width: "100%",
        ...(size === "auto" && { height: "100%", minHeight: 0 }),
      }}
    >
      {/* Outer Wrapper with Glowing Border */}
      <Box
        sx={{
          position: "relative",
          width: diameter,
          height: diameter,
          mt: 2, // room for the pointer so it never overlaps content above
          flexShrink: 0,
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
        <Box ref={buttonRef} sx={{ mt: 2, textAlign: "center", flexShrink: 0 }}>
          <Button
            variant="contained"
            onClick={onSpin}
            disabled={!canSpin || localSpinning}
            sx={{
              px: 5,
              py: 1.25,
              fontSize: "1.15rem",
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
