import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, Button } from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import coinImage from "../../../assets/questions/coin.webp";
import collarImage from "../../../assets/questions/collor.webp";
import SmartMedia from "../../../components/ui/SmartMedia";

export interface QuestionOption {
  optionId: string;
  optionText: string;
}

export interface QuestionData {
  id: string;
  text?: string;
  image?: string;
  video?: string;
  isHiddenPlaceholder?: boolean;
  media?: Array<{
    type: "text" | "image" | "video" | "audio" | "gif" | "file";
    url?: string;
    text?: string;
    name?: string;
  }>;
  score?: number;
  options: QuestionOption[];
}

interface QuestionProps {
  questionData: QuestionData;
  questionNumber?: number;
  selectedOptionId?: string;
  onOptionSelect?: (optionId: string) => void;
  disabled?: boolean;
  showResults?: boolean;
  correctOptionId?: string;
  showOptions?: boolean; // NEW: When false, hide MCQ options (for verbal answer flow)
  showVerbalHint?: boolean;
}

const Question: React.FC<QuestionProps> = ({
  questionData,
  questionNumber,
  selectedOptionId,
  onOptionSelect,
  disabled = false,
  showResults = false,
  correctOptionId,
  showOptions = true, // Default to showing options for backward compatibility
  showVerbalHint = true,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Stop background audio/video from playing in OS media notification tray
  // once the Question component is closed or unmounted.
  useEffect(() => {
    const currentContainer = containerRef.current;
    return () => {
      if (currentContainer) {
        const mediaElements = currentContainer.querySelectorAll("audio, video");
        mediaElements.forEach((el: any) => {
          if (typeof el.pause === "function") {
            el.pause();
          }
          // Completely detach src to clear out OS media session references
          el.removeAttribute("src");
          el.load();
        });
      }
    };
  }, []);

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

  const renderMedia = () => {
    const explicitMedia = questionData.media || [];
    const legacyMedia = [
      questionData.image ? { type: "image", url: questionData.image } : null,
      questionData.video ? { type: "video", url: questionData.video } : null,
    ].filter(Boolean) as Array<{
      type: "text" | "image" | "video" | "audio" | "gif" | "file";
      url?: string;
      text?: string;
      name?: string;
    }>;

    const mediaItems = explicitMedia.length > 0 ? explicitMedia : legacyMedia;
    if (!mediaItems.length) return null;

    const mediaStyles = {
      width: "100%",
      maxHeight: "320px",
      objectFit: "contain" as const,
      borderRadius: "0px",
      my: 0,
      display: "block",
    };

    return mediaItems.map((media, index) => {
      if (!media) return null;

      if (media.type === "text") {
        return (
          <Typography
            key={`media-text-${index}`}
            variant="body2"
            sx={{ textAlign: "center", color: "#475569", my: "8px" }}
          >
            {media.text}
          </Typography>
        );
      }
      return (
        <SmartMedia
          key={`smart-media-${index}`}
          media={media}
          alt={media.name || `Question media ${index + 1}`}
          sx={mediaStyles}
          audioSx={{ width: "100%", my: "10px" }}
          iframeSx={{ minHeight: 320, my: "10px" }}
        />
      );
    });
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: "480px",
        flex: "1",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Question Number Banner */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "90px",
          backgroundImage: `url(${collarImage})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          zIndex: 2,
          marginBottom: "-40px",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mt: "10px",
            color: "white",
            fontWeight: "bold",
            fontSize: {
              xs: "16px",
              sm: "18px",
              md: "20px",
            },
            textAlign: "center",
            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          {questionNumber ? `QUESTION ${questionNumber}` : "QUESTION"}
        </Typography>
      </Box>
      {/* Question Content Box */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          backgroundColor: "white",
          borderRadius: "20px",
          overflow: "hidden",
          padding: {
            xs: "25px 20px 40px 20px",
            sm: "30px 25px 45px 25px",
            md: "35px 30px 50px 30px",
          },
          boxShadow: "0px 3.67px 3.67px 1.83px #00000040",
          border: "6px solid #005DA8",
          zIndex: 1,
          minHeight: "120px",
          display: "flex",
          gap: 0,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Centered Question Points (inside box) */}
        {questionData.score !== undefined && questionData.score > 0 && (
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              alignSelf: "center",
              backgroundColor: "#2196F3",
              borderRadius: "16px",
              padding: "2px 8px 2px 4px",
              boxShadow: "0px 2px 8px rgba(0,0,0,0.15)",
              gap: 0.5,
              mt: "-8px",
              mb: "12px",
            }}
          >
            <Box
              component="img"
              src={coinImage}
              alt="Points"
              sx={{ width: "20px", height: "20px" }}
            />
            <Typography
              variant="body2"
              sx={{
                color: "white",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              X {questionData.score}
            </Typography>
          </Box>
        )}

        {/* Question Text */}
        {questionData.isHiddenPlaceholder && questionData.text ? (
          <Box
            sx={{
              width: "100%",
              mb: "12px",
            }}
          >
            <Box
              sx={{
                width: "100%",
                backgroundColor: "#DCFCE7",
                border: "2px solid #22C55E",
                borderRadius: "14px",
                px: "16px",
                py: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                mb: 1.5,
              }}
            >
              <WarningAmberRoundedIcon
                sx={{ color: "#F59E0B", fontSize: 28, flexShrink: 0 }}
              />
              <Typography
                variant="body1"
                sx={{
                  color: "#166534",
                  fontWeight: 700,
                  textAlign: "center",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                Question Hidden
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                mb: 1.5,
              }}
            >
              {/* <WarningAmberRoundedIcon
                sx={{ color: "#F59E0B", fontSize: 28, flexShrink: 0 }}
              /> */}
              <Typography
                variant="h5"
                sx={{
                  color: "#333",
                  fontWeight: 400,
                  fontSize: "14px",
                  textAlign: "center",
                  lineHeight: 1.4,
                  wordBreak: "break-word",
                  fontStyle: "italic",
                }}
              >
                {questionData.text}
              </Typography>
            </Box>
          </Box>
        ) : (
          questionData.text && (
            <Typography
              variant="h4"
              sx={{
                color: "#333",
                fontWeight: 700,
                textAlign: "center",
                lineHeight: 1.5,
                wordBreak: "break-word",
                mb: "12px",
              }}
            >
              {questionData.text}
            </Typography>
          )
        )}

        {/* Media Section - full bleed and anchored to bottom */}
        <Box
          sx={{
            width: {
              xs: "calc(100% + 40px)",
              sm: "calc(100% + 50px)",
              md: "calc(100% + 60px)",
            },
            mx: {
              xs: "-20px",
              sm: "-25px",
              md: "-30px",
            },
            mb: {
              xs: "-40px",
              sm: "-45px",
              md: "-50px",
            },
            mt: "auto",
            alignSelf: "stretch",
          }}
        >
          {renderMedia()}
        </Box>

        {/* Verbal Answer Hint - Only show when options are hidden */}

        {/* Options Section - Only show when showOptions is true */}
        {showOptions && (
          <Box
            sx={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              mt: "4px",
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
        )}
      </Box>
      {!showOptions && showVerbalHint && (
        <Typography
          variant="body2"
          sx={{
            fontSize: "14px",
            fontWeight: 500,
            textAlign: "center",
            color: "#FFF",
            marginTop: "28px",
            fontStyle: "italic",
          }}
        >
          You’ve been chosen. Speak your answer aloud
        </Typography>
      )}
    </Box>
  );
};

export default Question;
