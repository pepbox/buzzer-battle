import React, { useEffect, useRef, useState, useCallback } from "react";
import { Box, Button, Chip, Typography, useTheme } from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";

export interface SpinWheelProps {
  categories?: string[];
  selectedCategory?: string | null;
  spinPermissionGranted?: boolean;
  canSpin?: boolean;
  isBuzzerPerson?: boolean;
  isMyTeamTurn?: boolean;
  onSpin?: () => Promise<void> | void;
  isSpinning?: boolean;
  onSpinComplete?: (category: string) => void;
  size?: number;
  showControls?: boolean;
}

const DEFAULT_CATEGORIES = [
  "Who Am I?",
  "English Vinglish",
  "Guess The Song",
  "Rumble Jumble : Guess The Movie and the song",
  "Prop Round : Guess The Movie",
];

const WHEEL_PALETTE = [
  { start: "#F43F5E", end: "#BE123C", text: "#FFFFFF" }, // Crimson Rose
  { start: "#06B6D4", end: "#0E7490", text: "#FFFFFF" }, // Vibrant Cyan
  { start: "#F59E0B", end: "#B45309", text: "#FFFFFF" }, // Golden Amber
  { start: "#8B5CF6", end: "#6D28D9", text: "#FFFFFF" }, // Electric Violet
  { start: "#10B981", end: "#047857", text: "#FFFFFF" }, // Emerald Green
  { start: "#EC4899", end: "#BE185D", text: "#FFFFFF" }, // Magenta Pink
  { start: "#3B82F6", end: "#1D4ED8", text: "#FFFFFF" }, // Royal Azure
  { start: "#F97316", end: "#C2410C", text: "#FFFFFF" }, // Fiery Tangerine
];

// Realistic synthesized click sound with speed-based pitch and volume
const playTickSound = (velocityFactor: number = 1) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseFreq = 580 + Math.min(velocityFactor, 2) * 220;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.022);

    const vol = Math.min(0.25, 0.08 + Math.min(velocityFactor, 2) * 0.1);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.022);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.022);
  } catch (_) {}
};

// Rich multi-chord victory fanfare
const playWinSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [
      { f: 523.25, t: 0, d: 0.18 },    // C5
      { f: 659.25, t: 0.09, d: 0.18 }, // E5
      { f: 783.99, t: 0.18, d: 0.22 }, // G5
      { f: 1046.5, t: 0.28, d: 0.65 }, // C6
      { f: 1318.5, t: 0.38, d: 0.75 }, // E6
    ];
    notes.forEach(({ f, t, d }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + t;
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, startTime);
      gain.gain.setValueAtTime(0.22, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + d);
    });
  } catch (_) {}
};

// Format slice label with icon and clean line breaks
const getWheelDisplayInfo = (
  category: string
): { icon: string; line1: string; line2?: string } => {
  const norm = (category || "").toLowerCase();
  if (norm.includes("rumble") || norm.includes("jumble")) {
    return { icon: "🎬", line1: "Rumble", line2: "Jumble" };
  }
  if (norm.includes("prop")) {
    return { icon: "🎭", line1: "Prop", line2: "Round" };
  }
  if (norm.includes("who am i") || norm.includes("whoami")) {
    return { icon: "❓", line1: "Who", line2: "Am I?" };
  }
  if (norm.includes("english") || norm.includes("vinglish")) {
    return { icon: "🔤", line1: "English", line2: "Vinglish" };
  }
  if (norm.includes("song")) {
    return { icon: "🎵", line1: "Guess The", line2: "Song" };
  }
  const parts = category.split("/");
  const leaf = parts[parts.length - 1] || category;
  if (leaf.length > 12) {
    const words = leaf.split(" ");
    const mid = Math.ceil(words.length / 2);
    return {
      icon: "🎯",
      line1: words.slice(0, mid).join(" "),
      line2: words.slice(mid).join(" "),
    };
  }
  return { icon: "🎯", line1: leaf };
};

// Particle definition for celebratory confetti
interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({
  categories = DEFAULT_CATEGORIES,
  selectedCategory: initialCategory,
  spinPermissionGranted = false,
  isBuzzerPerson = false,
  isMyTeamTurn = false,
  onSpin,
  onSpinComplete,
  size = 320,
  showControls = true,
}) => {
  const theme = useTheme();
  const activeCategories =
    categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  const [isAnimating, setIsAnimating] = useState(false);
  const [landedCategory, setLandedCategory] = useState<string | null>(
    initialCategory || null
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Physics animation state references
  const rotationRef = useRef<number>(0);
  const needleAngleRef = useRef<number>(0);
  const needleVelocityRef = useRef<number>(0);
  const lastPegCrossedRef = useRef<number>(-1);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const ledPhaseRef = useRef<number>(0);

  // Helper to calculate exact rotation angle so a category centers right under the 12 o'clock needle
  const getTargetRotation = useCallback(
    (cat: string) => {
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
      // 12 o'clock needle is at 270 degrees
      return ((270 - targetSliceCenterDeg) % 360 + 360) % 360;
    },
    [activeCategories]
  );

  // Initialize starting angle based on initialCategory
  useEffect(() => {
    if (initialCategory && !isAnimating) {
      setLandedCategory(initialCategory);
      rotationRef.current = getTargetRotation(initialCategory);
    }
  }, [initialCategory, getTargetRotation, isAnimating]);

  // Main Canvas Rendering Function
  const drawWheel = useCallback(
    (currentRotation: number, needleAngle: number) => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = size;
      const height = size;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const center = width / 2;
      const rimWidth = 14;
      const radius = center - rimWidth - 6;
      const numSegments = activeCategories.length;
      const anglePerSegment = (2 * Math.PI) / numSegments;
      const rotationRad = (currentRotation * Math.PI) / 180;

      // 1. Outer rim deep shadow
      ctx.beginPath();
      ctx.arc(center, center, center - 4, 0, 2 * Math.PI);
      ctx.fillStyle = "#090D16";
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      ctx.fill();
      ctx.shadowColor = "transparent";

      // 2. Outer 3D Metallic Gold Rim
      const goldRim = ctx.createRadialGradient(
        center,
        center,
        radius,
        center,
        center,
        center - 4
      );
      goldRim.addColorStop(0, "#D97706");
      goldRim.addColorStop(0.3, "#FDE68A");
      goldRim.addColorStop(0.6, "#F59E0B");
      goldRim.addColorStop(0.85, "#FEF3C7");
      goldRim.addColorStop(1, "#92400E");

      ctx.beginPath();
      ctx.arc(center, center, center - 4, 0, 2 * Math.PI);
      ctx.arc(center, center, radius + 2, 0, 2 * Math.PI, true);
      ctx.fillStyle = goldRim;
      ctx.fill();

      // 3. Perimeter Chasing LED Lights
      const numLeds = 18;
      ledPhaseRef.current = (ledPhaseRef.current + 0.1) % (numLeds * 2);
      for (let i = 0; i < numLeds; i++) {
        const ledAngle = (i * 2 * Math.PI) / numLeds;
        const ledDist = center - rimWidth / 2 - 4;
        const ledX = center + ledDist * Math.cos(ledAngle);
        const ledY = center + ledDist * Math.sin(ledAngle);

        const isActive =
          Math.floor((i + ledPhaseRef.current) % numLeds) % 2 === 0;

        ctx.beginPath();
        ctx.arc(ledX, ledY, 3.2, 0, 2 * Math.PI);
        if (isActive) {
          ctx.fillStyle = "#FFFBEB";
          ctx.shadowColor = "#FBBF24";
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = "#451A03";
          ctx.shadowColor = "transparent";
        }
        ctx.fill();
        ctx.shadowColor = "transparent";

        ctx.strokeStyle = "#92400E";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 4. Draw Rotating Slices
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(rotationRad);

      for (let i = 0; i < numSegments; i++) {
        const startAngle = i * anglePerSegment;
        const endAngle = (i + 1) * anglePerSegment;
        const pal = WHEEL_PALETTE[i % WHEEL_PALETTE.length];

        // Slice wedge
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();

        // Wedge gradient
        const midAngle = startAngle + anglePerSegment / 2;
        const gradX = radius * Math.cos(midAngle);
        const gradY = radius * Math.sin(midAngle);
        const sliceGrad = ctx.createLinearGradient(0, 0, gradX, gradY);
        sliceGrad.addColorStop(0, pal.start);
        sliceGrad.addColorStop(1, pal.end);
        ctx.fillStyle = sliceGrad;
        ctx.fill();

        // Slice border divider
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner specular highlight on slice
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.95, startAngle, endAngle);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Category Text and Icon
        ctx.save();
        ctx.rotate(midAngle);

        const { icon, line1, line2 } = getWheelDisplayInfo(activeCategories[i]);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = pal.text;
        ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
        ctx.shadowBlur = 4;

        const textDist = radius * 0.65;

        // Draw Icon
        ctx.font = "14px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
        ctx.fillText(icon, radius * 0.86, 0);

        if (line2) {
          ctx.font = "bold 12px Roboto, Montserrat, sans-serif";
          ctx.fillText(line1, textDist, -7);
          ctx.font = "bold 11px Roboto, Montserrat, sans-serif";
          ctx.fillText(line2, textDist, 8);
        } else {
          ctx.font = "bold 13px Roboto, Montserrat, sans-serif";
          ctx.fillText(line1, textDist, 0);
        }

        ctx.restore();
      }

      // Outer Pegs / Chrome Studs around the slice boundaries
      for (let i = 0; i < numSegments; i++) {
        const pinAngle = i * anglePerSegment;
        const pinDist = radius - 2;
        const pinX = pinDist * Math.cos(pinAngle);
        const pinY = pinDist * Math.sin(pinAngle);

        // Peg shadow
        ctx.beginPath();
        ctx.arc(pinX, pinY, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = "#1E293B";
        ctx.fill();

        // Metallic Peg Head
        const pegGrad = ctx.createRadialGradient(
          pinX - 1,
          pinY - 1,
          1,
          pinX,
          pinY,
          4
        );
        pegGrad.addColorStop(0, "#FFFFFF");
        pegGrad.addColorStop(0.4, "#E2E8F0");
        pegGrad.addColorStop(0.8, "#64748B");
        pegGrad.addColorStop(1, "#334155");

        ctx.beginPath();
        ctx.arc(pinX, pinY, 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = pegGrad;
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore(); // Restore rotating slices transform

      // 5. Center 3D Gold Chrome Hub
      const hubRadius = 26;

      // Hub Outer Rim
      const hubRimGrad = ctx.createRadialGradient(
        center - 4,
        center - 4,
        hubRadius * 0.3,
        center,
        center,
        hubRadius
      );
      hubRimGrad.addColorStop(0, "#FEF3C7");
      hubRimGrad.addColorStop(0.4, "#F59E0B");
      hubRimGrad.addColorStop(0.8, "#D97706");
      hubRimGrad.addColorStop(1, "#78350F");

      ctx.beginPath();
      ctx.arc(center, center, hubRadius, 0, 2 * Math.PI);
      ctx.fillStyle = hubRimGrad;
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowColor = "transparent";

      ctx.strokeStyle = "#FFFBEB";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Center Glowing Ruby Gem
      const rubyGrad = ctx.createRadialGradient(
        center - 2,
        center - 2,
        1,
        center,
        center,
        10
      );
      rubyGrad.addColorStop(0, "#FECACA");
      rubyGrad.addColorStop(0.3, "#EF4444");
      rubyGrad.addColorStop(0.8, "#B91C1C");
      rubyGrad.addColorStop(1, "#7F1D1D");

      ctx.beginPath();
      ctx.arc(center, center, 10, 0, 2 * Math.PI);
      ctx.fillStyle = rubyGrad;
      ctx.fill();
      ctx.strokeStyle = "#FCA5A5";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 6. 3D Metallic Top Pointer Needle (with dynamic physics deflection)
      ctx.save();
      const needleX = center;
      const needleY = 4;

      ctx.translate(needleX, needleY);
      ctx.rotate((needleAngle * Math.PI) / 180);

      // Needle drop shadow
      ctx.beginPath();
      ctx.moveTo(-13, 0);
      ctx.lineTo(13, 0);
      ctx.lineTo(0, 32);
      ctx.closePath();
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      ctx.fill();
      ctx.shadowColor = "transparent";

      // Needle Golden Bezel
      const needleGold = ctx.createLinearGradient(-12, 0, 12, 30);
      needleGold.addColorStop(0, "#FEF08A");
      needleGold.addColorStop(0.5, "#EAB308");
      needleGold.addColorStop(1, "#A16207");

      ctx.beginPath();
      ctx.moveTo(-13, 0);
      ctx.lineTo(13, 0);
      ctx.lineTo(0, 32);
      ctx.closePath();
      ctx.fillStyle = needleGold;
      ctx.fill();

      // Needle Ruby Center
      ctx.beginPath();
      ctx.moveTo(-8, 2);
      ctx.lineTo(8, 2);
      ctx.lineTo(0, 26);
      ctx.closePath();
      ctx.fillStyle = "#DC2626";
      ctx.fill();

      // Needle Top Pivot Cap
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, 2 * Math.PI);
      ctx.fillStyle = "#FFFBEB";
      ctx.fill();
      ctx.strokeStyle = "#78350F";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      // 7. Render Confetti / Sparkle Particles
      if (particlesRef.current.length > 0) {
        particlesRef.current.forEach((p) => {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        });
      }

      ctx.restore();
    },
    [activeCategories, size]
  );

  // Spawn celebration confetti particles
  const spawnConfetti = () => {
    const particles: ConfettiParticle[] = [];
    const colors = [
      "#FBBF24",
      "#EC4899",
      "#3B82F6",
      "#10B981",
      "#F43F5E",
      "#8B5CF6",
      "#FFFFFF",
    ];
    const center = size / 2;

    for (let i = 0; i < 45; i++) {
      const angle = (Math.random() * 2 - 1) * Math.PI;
      const speed = 2.5 + Math.random() * 6;
      particles.push({
        x: center,
        y: center,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 5 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 18,
        opacity: 1,
        life: 0,
        maxLife: 60 + Math.random() * 40,
      });
    }
    particlesRef.current = particles;
  };

  // Continuous animation loop for idle/confetti or during active spin
  useEffect(() => {
    if (!isAnimating) {
      // If idle, render static state or update particles if any remain
      const renderIdle = () => {
        if (particlesRef.current.length > 0) {
          particlesRef.current.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.12; // gravity
            p.rotation += p.vRot;
            p.life += 1;
            p.opacity = 1 - p.life / p.maxLife;
          });
          particlesRef.current = particlesRef.current.filter(
            (p) => p.life < p.maxLife
          );
          drawWheel(rotationRef.current, needleAngleRef.current);
          animationFrameRef.current = requestAnimationFrame(renderIdle);
        } else {
          drawWheel(rotationRef.current, needleAngleRef.current);
        }
      };
      renderIdle();
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isAnimating, drawWheel]);

  // Execute authentic spin animation with full physics simulation
  const spinToCategory = useCallback(
    (targetCategory: string) => {
      setIsAnimating(true);
      setLandedCategory(null);
      particlesRef.current = [];

      const numSegments = activeCategories.length;
      let targetIndex = activeCategories.findIndex(
        (c) =>
          c.toLowerCase() === targetCategory.toLowerCase() ||
          c.toLowerCase().includes(targetCategory.toLowerCase()) ||
          targetCategory.toLowerCase().includes(c.toLowerCase())
      );
      if (targetIndex === -1) targetIndex = 0;

      const degreesPerSegment = 360 / numSegments;
      const targetSliceCenterDeg = (targetIndex + 0.5) * degreesPerSegment;
      const targetEndAngle =
        ((270 - targetSliceCenterDeg) % 360 + 360) % 360;

      const startAngle = rotationRef.current;
      const startMod = ((startAngle % 360) + 360) % 360;
      let delta = (targetEndAngle - startMod + 360) % 360;
      if (delta < 60) delta += 360;

      // 5 full spins + delta
      const totalRotationDelta = 5 * 360 + delta;
      const finalAngle = startAngle + totalRotationDelta;

      const durationMs = 4200;
      const startTime = performance.now();
      lastPegCrossedRef.current = -1;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);

        // Quintic-style ease out: fast initial spin with smooth friction deceleration
        // Easing formula: 1 - (1 - t)^4.5
        const easeOut = 1 - Math.pow(1 - progress, 4.5);

        let currentRot = startAngle + totalRotationDelta * easeOut;

        // Micro-elastic settling on landing
        if (progress > 0.96) {
          const settleProgress = (progress - 0.96) / 0.04;
          const bounce =
            Math.sin(settleProgress * Math.PI * 2) *
            1.2 *
            (1 - settleProgress);
          currentRot += bounce;
        }

        rotationRef.current = currentRot;

        // Current angular velocity in degrees/frame
        const velocityFactor = Math.pow(1 - progress, 3.5) * 2.5;

        // Track peg collision with 12 o'clock needle (270 degrees)
        const anglePerPeg = 360 / numSegments;
        const currentModAngle = ((currentRot % 360) + 360) % 360;
        // Find which peg index is currently passing 270 deg
        const pegOffset = ((270 - currentModAngle + 360) % 360) / anglePerPeg;
        const currentPegIndex = Math.floor(pegOffset);
        const pegFraction = pegOffset - currentPegIndex;

        // Needle deflection physics
        if (pegFraction < 0.28 && velocityFactor > 0.05) {
          // Peg is pushing needle
          needleAngleRef.current = -16 * (1 - pegFraction / 0.28) * Math.min(1, velocityFactor + 0.3);
        } else {
          // Needle snaps back with spring damping
          needleVelocityRef.current += (0 - needleAngleRef.current) * 0.35;
          needleVelocityRef.current *= 0.7;
          needleAngleRef.current += needleVelocityRef.current;
        }

        // Trigger peg tick sound when new peg crosses
        if (currentPegIndex !== lastPegCrossedRef.current) {
          lastPegCrossedRef.current = currentPegIndex;
          if (progress < 0.98) {
            playTickSound(velocityFactor);
          }
        }

        // Draw frame
        drawWheel(currentRot, needleAngleRef.current);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Animation Complete
          rotationRef.current = finalAngle;
          needleAngleRef.current = 0;
          setIsAnimating(false);
          const winner = activeCategories[targetIndex] || targetCategory;
          setLandedCategory(winner);
          playWinSound();
          spawnConfetti();
          drawWheel(finalAngle, 0);

          if (onSpinComplete) {
            onSpinComplete(winner);
          }
        }
      };

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [activeCategories, drawWheel, onSpinComplete]
  );

  // Listen for socket SPIN_WHEEL_RESULT event for synchronized multi-client spins
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
  }, [spinToCategory]);

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
        maxWidth: `${size + 40}px`,
        mx: "auto",
        my: 1,
      }}
    >
      {/* Canvas Spin Wheel */}
      <Box
        sx={{
          position: "relative",
          width: size,
          height: size,
          my: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            borderRadius: "50%",
            display: "block",
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
            animation: "landedPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            "@keyframes landedPop": {
              "0%": { transform: "scale(0.7)", opacity: 0 },
              "100%": { transform: "scale(1)", opacity: 1 },
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "rgba(255,255,255,0.95)",
              fontWeight: 800,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
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
                boxShadow:
                  "0 6px 20px rgba(16, 185, 129, 0.5), 0 0 0 3px rgba(255,255,255,0.8)",
                border: "2px solid #FFFFFF",
              }}
            />
          </Box>
        </Box>
      )}

      {/* Interactive Action or Status Messages */}
      {showControls && (
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
      )}
    </Box>
  );
};

export default SpinWheel;
