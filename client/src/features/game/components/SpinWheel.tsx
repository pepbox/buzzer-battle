import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Chip, Typography, useTheme } from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";

interface SpinWheelProps {
  categories?: string[];
  selectedCategory?: string | null;
  spinPermissionGranted?: boolean;
  canSpin?: boolean;
  isBuzzerPerson?: boolean;
  isMyTeamTurn?: boolean;
  onSpin?: () => Promise<void> | void;
  isSpinning?: boolean;
}

const DEFAULT_CATEGORIES = [
  "Who Am I?",
  "English Vinglish",
  "Guess The Song",
  "Rumble Jumble : Guess The Movie and the song",
  "Prop Round : Guess The Movie",
];

const WHEEL_COLORS = [
  "#E11D48", // Vibrant Rose
  "#0D9488", // Vibrant Teal
  "#F59E0B", // Vibrant Amber
  "#6366F1", // Vibrant Indigo
  "#8B5CF6", // Vibrant Purple
  "#10B981", // Vibrant Emerald
  "#EC4899", // Vibrant Pink
  "#0284C7", // Vibrant Sky
];

const playTickSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(750, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  } catch (_) {}
};

const playWinSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.09;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  } catch (_) {}
};

const getWheelDisplayLabel = (category: string): { line1: string; line2?: string } => {
  const norm = (category || "").toLowerCase();
  if (norm.includes("rumble") || norm.includes("jumble")) {
    return { line1: "Rumble", line2: "Jumble" };
  }
  if (norm.includes("prop")) {
    return { line1: "Prop", line2: "Round" };
  }
  if (norm.includes("who am i") || norm.includes("whoami")) {
    return { line1: "Who", line2: "Am I?" };
  }
  if (norm.includes("english") || norm.includes("vinglish")) {
    return { line1: "English", line2: "Vinglish" };
  }
  if (norm.includes("song")) {
    return { line1: "Guess The", line2: "Song" };
  }
  const parts = category.split("/");
  const leaf = parts[parts.length - 1] || category;
  if (leaf.length > 12) {
    const words = leaf.split(" ");
    const mid = Math.ceil(words.length / 2);
    return {
      line1: words.slice(0, mid).join(" "),
      line2: words.slice(mid).join(" "),
    };
  }
  return { line1: leaf };
};

export const SpinWheel: React.FC<SpinWheelProps> = ({
  categories = DEFAULT_CATEGORIES,
  selectedCategory: initialCategory,
  spinPermissionGranted = false,
  isBuzzerPerson = false,
  isMyTeamTurn = false,
  onSpin,
}) => {
  const theme = useTheme();
  const activeCategories =
    categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  const [isAnimating, setIsAnimating] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [landedCategory, setLandedCategory] = useState<string | null>(
    initialCategory || null
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Helper to calculate exact rotation angle so a category centers right under the 12 o'clock needle
  const getRotationForCategory = (cat: string) => {
    const numSegments = activeCategories.length;
    let targetIndex = activeCategories.findIndex(
      (c) =>
        c.toLowerCase() === cat.toLowerCase() ||
        c.toLowerCase().includes(cat.toLowerCase()) ||
        cat.toLowerCase().includes(c.toLowerCase())
    );
    if (targetIndex === -1) targetIndex = 0;
    const degreesPerSegment = 360 / numSegments;
    const targetSliceCenterDeg = (targetIndex + 0.5) * degreesPerSegment;
    return ((270 - targetSliceCenterDeg) % 360 + 360) % 360;
  };

  // Sync initial rotation if already selected on mount / update
  useEffect(() => {
    if (initialCategory && !isAnimating) {
      setLandedCategory(initialCategory);
      setRotationDegrees(getRotationForCategory(initialCategory));
    }
  }, [initialCategory, activeCategories]);

  // Draw the spin wheel canvas with rich gold rim, pegs, vibrant slices, and centered metallic hub
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 14;
    const numSegments = activeCategories.length;
    const anglePerSegment = (2 * Math.PI) / numSegments;

    ctx.clearRect(0, 0, size, size);

    // Outer dark background disc
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius + 12, 0, 2 * Math.PI);
    ctx.fillStyle = "#0F172A";
    ctx.fill();

    // Outer gold metallic ring
    const goldRing = ctx.createLinearGradient(0, 0, size, size);
    goldRing.addColorStop(0, "#F59E0B");
    goldRing.addColorStop(0.25, "#FEF3C7");
    goldRing.addColorStop(0.5, "#D97706");
    goldRing.addColorStop(0.75, "#FDE68A");
    goldRing.addColorStop(1, "#92400E");

    ctx.beginPath();
    ctx.arc(center, center, radius + 7, 0, 2 * Math.PI);
    ctx.lineWidth = 12;
    ctx.strokeStyle = goldRing;
    ctx.stroke();
    ctx.restore();

    // Slices
    for (let i = 0; i < numSegments; i++) {
      const startAngle = i * anglePerSegment;
      const endAngle = (i + 1) * anglePerSegment;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Render Text aligned along the slice radius
      ctx.translate(center, center);
      ctx.rotate(startAngle + anglePerSegment / 2);

      const { line1, line2 } = getWheelDisplayLabel(activeCategories[i]);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
      ctx.shadowBlur = 4;

      const textRadius = radius * 0.62;

      if (line2) {
        ctx.font = "bold 13px Roboto, Montserrat, sans-serif";
        ctx.fillText(line1, textRadius, -8);
        ctx.font = "bold 12px Roboto, Montserrat, sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.fillText(line2, textRadius, 9);
      } else {
        ctx.font = "bold 14px Roboto, Montserrat, sans-serif";
        ctx.fillText(line1, textRadius, 0);
      }

      ctx.restore();
    }

    // Outer edge pegs / studs
    for (let i = 0; i < numSegments; i++) {
      const pinAngle = i * anglePerSegment;
      const pinX = center + (radius + 4) * Math.cos(pinAngle);
      const pinY = center + (radius + 4) * Math.sin(pinAngle);

      ctx.beginPath();
      ctx.arc(pinX, pinY, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = "#FFFBEB";
      ctx.fill();
      ctx.strokeStyle = "#78350F";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Center metallic gold hub
    const hubGrad = ctx.createRadialGradient(
      center - 4,
      center - 4,
      2,
      center,
      center,
      24
    );
    hubGrad.addColorStop(0, "#FFF9C4");
    hubGrad.addColorStop(0.4, "#F59E0B");
    hubGrad.addColorStop(0.8, "#D97706");
    hubGrad.addColorStop(1, "#78350F");

    ctx.beginPath();
    ctx.arc(center, center, 24, 0, 2 * Math.PI);
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center red jewel
    ctx.beginPath();
    ctx.arc(center, center, 8, 0, 2 * Math.PI);
    ctx.fillStyle = "#DC2626";
    ctx.fill();
    ctx.strokeStyle = "#FCA5A5";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [activeCategories]);

  // Execute authentic spin animation to target category with 100% accurate needle stopping
  const spinToCategory = (targetCategory: string) => {
    setIsAnimating(true);
    setLandedCategory(null);

    const numSegments = activeCategories.length;
    let targetIndex = activeCategories.findIndex(
      (c) =>
        c.toLowerCase() === targetCategory.toLowerCase() ||
        c.toLowerCase().includes(targetCategory.toLowerCase()) ||
        targetCategory.toLowerCase().includes(c.toLowerCase())
    );

    if (targetIndex === -1) {
      targetIndex = 0;
    }

    const degreesPerSegment = 360 / numSegments;
    const targetSliceCenterDeg = (targetIndex + 0.5) * degreesPerSegment;
    // 12 o'clock needle is at 270 degrees
    const targetMod = ((270 - targetSliceCenterDeg) % 360 + 360) % 360;

    setRotationDegrees((currentR) => {
      const currentMod = ((currentR % 360) + 360) % 360;
      let delta = (targetMod - currentMod + 360) % 360;
      if (delta < 45) delta += 360;
      const extraSpins = (5 + Math.floor(Math.random() * 2)) * 360; // 5 to 6 full turns
      return currentR + extraSpins + delta;
    });

    // Realistic peg ticking sound simulation matching deceleration curve
    const startTime = Date.now();
    const duration = 4000;
    let tickTimeout: any;

    const scheduleTicks = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        playTickSound();
        const progress = elapsed / duration;
        // Interval slows down dynamically as wheel slows
        const interval = 45 + Math.pow(progress, 3) * 450;
        tickTimeout = setTimeout(scheduleTicks, interval);
      }
    };
    scheduleTicks();

    setTimeout(() => {
      if (tickTimeout) clearTimeout(tickTimeout);
      setIsAnimating(false);
      const landed = activeCategories[targetIndex] || targetCategory;
      setLandedCategory(landed);
      playWinSound();
    }, 4200);
  };

  // Listen for socket SPIN_WHEEL_RESULT event so all participants/presenter see the spin in real time
  useEffect(() => {
    const handleSpinResult = (data: any) => {
      if (data?.category) {
        spinToCategory(data.category);
      }
    };

    websocketService.on(Events.SPIN_WHEEL_RESULT, handleSpinResult);
    return () => {
      websocketService.off(Events.SPIN_WHEEL_RESULT, handleSpinResult);
    };
  }, [activeCategories]);

  const handleCaptainSpinClick = async () => {
    if (isAnimating) return;

    if (onSpin) {
      try {
        await onSpin();
      } catch (e) {
        console.error("Spin error:", e);
      }
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        maxWidth: "440px",
        mx: "auto",
        my: 1,
      }}
    >
      {/* Outer Wheel Container with Pin & Needle */}
      <Box
        sx={{
          position: "relative",
          width: 300,
          height: 300,
          my: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Top Pointer Needle with realistic drop shadow and tick motion */}
        <Box
          sx={{
            position: "absolute",
            top: -14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "15px solid transparent",
            borderRight: "15px solid transparent",
            borderTop: "28px solid #DC2626",
            zIndex: 30,
            filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.6))",
            transformOrigin: "50% 0%",
            animation: isAnimating
              ? "needleWobble 0.08s infinite alternate ease-in-out"
              : "none",
            "@keyframes needleWobble": {
              "0%": { transform: "translateX(-50%) rotate(-12deg)" },
              "100%": { transform: "translateX(-50%) rotate(8deg)" },
            },
          }}
        />

        {/* Animated Rotating Canvas Wheel */}
        <canvas
          ref={canvasRef}
          width={290}
          height={290}
          style={{
            transform: `rotate(${rotationDegrees}deg)`,
            transition: isAnimating
              ? "transform 4.2s cubic-bezier(0.12, 0.8, 0.18, 1)"
              : "none",
            borderRadius: "50%",
            boxShadow:
              "0 12px 35px rgba(0,0,0,0.45), 0 0 0 6px rgba(255,255,255,0.9)",
          }}
        />
      </Box>

      {/* Landed / Selected Category Banner */}
      {landedCategory && (
        <Box
          sx={{
            mt: 1.5,
            mb: 1,
            textAlign: "center",
            animation: "landedPop 0.6s ease-out, pulseGlow 2s infinite ease-in-out",
            "@keyframes landedPop": {
              "0%": { transform: "scale(0.8)", opacity: 0 },
              "100%": { transform: "scale(1)", opacity: 1 },
            },
            "@keyframes pulseGlow": {
              "0%, 100%": { transform: "scale(1)" },
              "50%": { transform: "scale(1.03)" },
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: "rgba(255,255,255,0.95)", fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" }}
          >
            🎯 Landed Category
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={landedCategory}
              color="primary"
              sx={{
                fontSize: "1.05rem",
                fontWeight: 900,
                py: 2.2,
                px: 2,
                backgroundColor: "#10B981",
                color: "#FFFFFF",
                boxShadow: "0 6px 20px rgba(16, 185, 129, 0.45)",
                border: "2px solid #FFFFFF",
              }}
            />
          </Box>
        </Box>
      )}

      {/* Interactive Action or Status Messages */}
      <Box sx={{ width: "100%", mt: 1.5, textAlign: "center" }}>
        {isBuzzerPerson ? (
          spinPermissionGranted && isMyTeamTurn ? (
            <Button
              variant="contained"
              onClick={handleCaptainSpinClick}
              disabled={isAnimating}
              startIcon={<CasinoIcon />}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: "18px",
                fontWeight: 800,
                borderRadius: "16px",
                backgroundColor: isAnimating ? "#64748B" : "#10B981",
                color: "white",
                boxShadow: "0 8px 25px rgba(16, 185, 129, 0.4)",
                "&:hover": {
                  backgroundColor: "#059669",
                  transform: "scale(1.03)",
                },
              }}
            >
              {isAnimating ? "Spinning Wheel... 🎡" : "SPIN THE WHEEL! 🎡"}
            </Button>
          ) : (
            <Box
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderRadius: "14px",
                p: 2,
                boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              }}
            >
              <Typography variant="body1" fontWeight="bold" color="#F59E0B">
                {spinPermissionGranted
                  ? "⏳ Another team is spinning the wheel..."
                  : "⏳ Waiting for Quiz Master to grant spin turn..."}
              </Typography>
            </Box>
          )
        ) : (
          <Box
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderRadius: "14px",
              p: 2,
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            }}
          >
            <Typography
              variant="body1"
              fontWeight="bold"
              color={theme.palette.primary.main}
            >
              {isMyTeamTurn
                ? "⏳ Waiting for your Team Captain to spin..."
                : "⏳ Another team is spinning the wheel..."}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SpinWheel;
