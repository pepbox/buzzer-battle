import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CasinoIcon from "@mui/icons-material/Casino";

interface CategorySpinWheelModalProps {
  open: boolean;
  onClose: () => void;
  categories?: string[];
  onSelectCategory?: (category: string) => void;
}

const DEFAULT_CATEGORIES = [
  "Who Am I?",
  "English",
  "Song",
  "Jumble",
  "Prop Round",
  "Bollywood",
  "Sports",
  "GK",
];

const WHEEL_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFE66D",
  "#1A535C",
  "#FF9F1C",
  "#2EC4B6",
  "#E71D36",
  "#9B5DE5",
];

export const CategorySpinWheelModal: React.FC<CategorySpinWheelModalProps> = ({
  open,
  onClose,
  categories = DEFAULT_CATEGORIES,
  onSelectCategory,
}) => {
  const activeCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const [spinning, setSpinning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Draw the spin wheel canvas
  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const numSegments = activeCategories.length;
    const anglePerSegment = (2 * Math.PI) / numSegments;

    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < numSegments; i++) {
      const startAngle = i * anglePerSegment;
      const endAngle = (i + 1) * anglePerSegment;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Text label rendering
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + anglePerSegment / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 14px Roboto, sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.fillText(activeCategories[i], radius - 20, 5);
      ctx.restore();
    }

    // Draw center pin
    ctx.beginPath();
    ctx.arc(center, center, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [open, activeCategories]);

  const handleSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setSelectedCategory(null);

    const extraRounds = 5 + Math.floor(Math.random() * 5); // 5 to 10 full turns
    const winningIndex = Math.floor(Math.random() * activeCategories.length);
    const numSegments = activeCategories.length;
    const degreesPerSegment = 360 / numSegments;

    // Pointer is at the top (270 degrees). Calculate target angle.
    const targetSegmentCenter = winningIndex * degreesPerSegment + degreesPerSegment / 2;
    const totalRotation = extraRounds * 360 + (360 - targetSegmentCenter);

    setRotationDegrees((prev) => prev + totalRotation);

    setTimeout(() => {
      setSpinning(false);
      const category = activeCategories[winningIndex];
      setSelectedCategory(category);
      if (onSelectCategory) {
        onSelectCategory(category);
      }
    }, 3500);
  };

  return (
    <Dialog open={open} onClose={spinning ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CasinoIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Category Spin Wheel
          </Typography>
        </Box>
        <IconButton onClick={onClose} disabled={spinning} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 2 }}>
        {/* Wheel container with pointer */}
        <Box sx={{ position: "relative", width: 300, height: 300, my: 1 }}>
          {/* Top Pointer */}
          <Box
            sx={{
              position: "absolute",
              top: -10,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "12px solid transparent",
              borderRight: "12px solid transparent",
              borderTop: "24px solid #E71D36",
              zIndex: 10,
              filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.4))",
            }}
          />

          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            style={{
              transform: `rotate(${rotationDegrees}deg)`,
              transition: spinning ? "transform 3.5s cubic-bezier(0.15, 0.90, 0.25, 1.00)" : "none",
              borderRadius: "50%",
              boxShadow: "0px 6px 16px rgba(0,0,0,0.25)",
            }}
          />
        </Box>

        {/* Selected Result Banner */}
        {selectedCategory && (
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Selected Category:
            </Typography>
            <Chip
              label={selectedCategory}
              color="primary"
              sx={{ fontSize: "1.1rem", fontWeight: "bold", py: 2, px: 2, mt: 0.5 }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pb: 3, gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleSpin}
          disabled={spinning}
          startIcon={<CasinoIcon />}
          sx={{ minWidth: 160, borderRadius: 3, fontWeight: "bold" }}
        >
          {spinning ? "Spinning..." : "SPIN WHEEL"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategorySpinWheelModal;
