import React, { useState } from "react";
import { Box, Typography, Button } from "@mui/material";

export interface QuestionOption {
  optionId: string;
  optionText: string;
}

export interface QuestionData {
  id: string;
  text?: string;
  image?: string;
  video?: string;
  score?: number;
  options: QuestionOption[];
}

interface QuestionProps {
  questionData: QuestionData;
  selectedOptionId?: string;
  onOptionSelect?: (optionId: string) => void;
  disabled?: boolean;
  showResults?: boolean;
  correctOptionId?: string;
}

const Question: React.FC<QuestionProps> = ({
  questionData,
  selectedOptionId,
  onOptionSelect,
  disabled = false,
  showResults = false,
  correctOptionId,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string>("");

  const currentSelectedId = selectedOptionId || internalSelectedId;

  const handleOptionClick = (optionId: string) => {
    if (disabled) {
      console.log("Question component - Click ignored (disabled)");
      return;
    }

    if (onOptionSelect) {
      console.log("Question component - Option selected:", optionId);
      onOptionSelect(optionId);
    } else {
      setInternalSelectedId(optionId);
    }
  };

  const getOptionLabel = (index: number): string => {
    return String.fromCharCode(97 + index); // a, b, c, d, etc.
  };

  const getOptionBackgroundColor = (optionId: string): string => {
    if (showResults && correctOptionId) {
      if (optionId === correctOptionId) {
        return "#10B981"; // Green for correct answer
      }
      if (optionId === currentSelectedId && optionId !== correctOptionId) {
        return "#EF4444"; // Red for wrong selected answer
      }
    }

    if (optionId === currentSelectedId) {
      return "#1E89E0"; // Blue for selected option
    }

    return "#F8FAFC"; // Default light gray
  };

  const getOptionTextColor = (optionId: string): string => {
    if (showResults && correctOptionId) {
      if (optionId === correctOptionId) {
        return "#FFFFFF"; // White text for correct answer
      }
      if (optionId === currentSelectedId && optionId !== correctOptionId) {
        return "#FFFFFF"; // White text for wrong selected answer
      }
    }

    if (optionId === currentSelectedId) {
      return "#FFFFFF"; // White text for selected option
    }

    return "#000000"; // Default dark text
  };

  const getMediaType = (url: string): "image" | "video" => {
    const extension = url.split(".").pop()?.toLowerCase();
    const videoExtensions = [
      "mp4",
      "webm",
      "ogg",
      "avi",
      "mov",
      "wmv",
      "flv",
      "m4v",
    ];

    if (videoExtensions.includes(extension || "")) {
      return "video";
    }

    return "image"; // Default to image (includes gif, jpg, png, webp, etc.)
  };

  const renderMedia = () => {
    const mediaUrl = questionData.image || questionData.video;

    if (!mediaUrl) return null;

    const mediaType = getMediaType(mediaUrl);

    const mediaStyles = {
      width: "100%",
      maxHeight: "200px",
      objectFit: "cover" as const,
      borderRadius: "12px",
      marginBottom: "16px",
    };

    switch (mediaType) {
      case "image":
        return (
          <Box
            component="img"
            src={mediaUrl}
            alt="Question media"
            sx={mediaStyles}
          />
        );
      case "video":
        return (
          <Box
            component="video"
            src={mediaUrl}
            controls
            sx={{
              ...mediaStyles,
              maxHeight: "250px",
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: "#FFFFFF",
        borderRadius: "28px",
        border: "5.5px solid #005DA8",
        boxShadow: "0px 3.67px 3.67px 1.83px #00000040",
        padding: {
          xs: "20px",
          sm: "24px",
          md: "28px",
        },
        width: "100%",
        height: "100%",
        maxWidth: "400px",
        margin: "0 auto",
        flex: "1",
      }}
    >
      {/* Media Section */}
      {renderMedia()}

      {/* Question Text */}
      {questionData.text && (
        <Typography
          variant="body1"
          sx={{
            fontSize: "18px",
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.4,
            marginBottom:
              questionData.image || questionData.video ? "20px" : "24px",
            wordBreak: "break-word",
          }}
        >
          {questionData.text}
        </Typography>
      )}

      {/* Options Section */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        {questionData.options.map((option, index) => (
          <Button
            key={option.optionId}
            onClick={() => handleOptionClick(option.optionId)}
            disabled={disabled}
            sx={{
              backgroundColor: getOptionBackgroundColor(option.optionId),
              color: getOptionTextColor(option.optionId),
              border: "1.5px solid #72BFFF",
              borderRadius: "12px",
              padding: "8px",
              textAlign: "left",
              justifyContent: "flex-start",
              fontSize: "16px",
              fontWeight: 600,
              minHeight: "40px",
              boxShadow: "-6.31px -6.31px 6.78px 0px #00000040 inset",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: disabled
                  ? getOptionBackgroundColor(option.optionId)
                  : option.optionId === currentSelectedId
                  ? "#1976D2"
                  : "#F1F5F9",
              },
              "&:active": {
                transform: disabled ? "none" : "translateY(0px)",
              },
              "&.Mui-disabled": {
                backgroundColor: getOptionBackgroundColor(option.optionId),
                color: getOptionTextColor(option.optionId),
                opacity: 0.8,
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                px: "12px",
              }}
            >
              {/* Option Label (A, B, C, D) */}
              <Box
                sx={{
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: "4px",
                  fontSize: "10px",
                  fontWeight: 600,
                }}
              >
                {getOptionLabel(index)}
                {")"}
              </Box>

              {/* Option Text */}
              <Typography
                variant="body2"
                sx={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "inherit",
                  flex: 1,
                  textAlign: "left",
                }}
              >
                {option.optionText}
              </Typography>
            </Box>
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default Question;
