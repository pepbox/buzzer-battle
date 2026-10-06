import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CasinoIcon from "@mui/icons-material/Casino";
import SpinWheel from "../../game/components/SpinWheel";
import { useSpinWheelRequest } from "../services/adminRemoteApi";

interface CategorySpinWheelModalProps {
  open: boolean;
  onClose: () => void;
  categories?: string[];
  onSelectCategory?: (category: string) => void;
}

const DEFAULT_CATEGORIES = [
  "Who Am I?",
  "English Vinglish",
  "Guess The Song",
  "Rumble Jumble : Guess The Movie and the song",
  "Prop Round : Guess The Movie",
];

export const CategorySpinWheelModal: React.FC<CategorySpinWheelModalProps> = ({
  open,
  onClose,
  categories = DEFAULT_CATEGORIES,
  onSelectCategory,
}) => {
  const activeCategories =
    categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const [spinning, setSpinning] = useState(false);
  const { spinWheelRequest, isLoading: isRequestLoading } =
    useSpinWheelRequest();

  const handleAdminSpin = async () => {
    if (spinning || isRequestLoading) return;
    try {
      setSpinning(true);
      await spinWheelRequest().unwrap();
    } catch (err: any) {
      console.warn("Backend spin failed:", err);
      setSpinning(false);
    }
  };

  const handleSpinComplete = (category: string) => {
    setSpinning(false);
    if (onSelectCategory) {
      onSelectCategory(category);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={spinning ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "24px",
          background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
          color: "#FFFFFF",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 0.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CasinoIcon sx={{ color: "#F59E0B", fontSize: 28 }} />
          <Typography variant="h6" fontWeight="bold" sx={{ color: "#FFFFFF" }}>
            Category Spin Wheel
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={spinning}
          size="small"
          sx={{ color: "rgba(255, 255, 255, 0.7)" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 1,
          px: 2,
        }}
      >
        <SpinWheel
          categories={activeCategories}
          size={290}
          showControls={false}
          onSpinComplete={handleSpinComplete}
        />
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pb: 3, pt: 1, px: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleAdminSpin}
          disabled={spinning || isRequestLoading}
          startIcon={<CasinoIcon />}
          sx={{
            minWidth: 200,
            py: 1.4,
            borderRadius: "14px",
            fontWeight: 800,
            fontSize: "16px",
            background: "linear-gradient(135deg, #EC4899 0%, #BE185D 100%)",
            boxShadow: "0 8px 25px rgba(236, 72, 153, 0.4)",
            "&:hover": {
              background: "linear-gradient(135deg, #DB2777 0%, #9D174D 100%)",
              transform: "scale(1.02)",
            },
          }}
        >
          {spinning || isRequestLoading
            ? "Spinning Wheel... 🎡"
            : "SPIN WHEEL NOW 🎡"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategorySpinWheelModal;
