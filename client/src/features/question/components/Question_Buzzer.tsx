import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import collarImage from "../../../assets/questions/collor.webp";

interface QuestionBuzzerProps {
  questionNumber: number;
  questionText: string;
  questionImage?: string;
  questionVideo?: string;
  questionMedia?: Array<{
    type: "text" | "image" | "video" | "gif" | "file";
    url?: string;
    text?: string;
    name?: string;
  }>;
}

const QuestionBuzzer: React.FC<QuestionBuzzerProps> = ({
  questionNumber,
  questionText,
  questionImage,
  questionVideo,
  questionMedia,
}) => {
  const theme = useTheme();

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
    const explicitMedia = questionMedia || [];
    const legacyMedia = [
      questionImage ? { type: "image", url: questionImage } : null,
      questionVideo ? { type: "video", url: questionVideo } : null,
    ].filter(Boolean) as Array<{
      type: "text" | "image" | "video" | "gif" | "file";
      url?: string;
      text?: string;
      name?: string;
    }>;

    const mediaItems = explicitMedia.length > 0 ? explicitMedia : legacyMedia;
    if (!mediaItems.length) return null;

    const mediaStyles = {
      width: "100%",
      maxHeight: "220px",
      objectFit: "contain" as const,
      borderRadius: "12px",
      my: "10px",
    };

    return mediaItems.map((media, index) => {
      if (!media) return null;

      if (media.type === "text") {
        return (
          <Typography
            key={`buzzer-media-text-${index}`}
            variant="body2"
            sx={{ textAlign: "center", color: "#475569", my: "8px" }}
          >
            {media.text}
          </Typography>
        );
      }

      if ((media.type === "image" || media.type === "gif") && media.url) {
        return (
          <Box
            key={`buzzer-media-image-${index}`}
            component="img"
            src={media.url}
            alt={media.name || `Question media ${index + 1}`}
            sx={mediaStyles}
          />
        );
      }

      if (media.type === "video" && media.url) {
        return (
          <Box
            key={`buzzer-media-video-${index}`}
            component="video"
            src={media.url}
            controls
            sx={mediaStyles}
          />
        );
      }

      if (media.url) {
        const derivedType = getMediaType(media.url);
        if (derivedType === "video") {
          return (
            <Box
              key={`buzzer-media-video-fallback-${index}`}
              component="video"
              src={media.url}
              controls
              sx={mediaStyles}
            />
          );
        }
        return (
          <Box
            key={`buzzer-media-image-fallback-${index}`}
            component="img"
            src={media.url}
            alt={media.name || `Question media ${index + 1}`}
            sx={mediaStyles}
          />
        );
      }

      return null;
    });
  };
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: "380px",
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
          QUESTION {questionNumber}
        </Typography>
      </Box>

      {/* Question Content Box */}
      <Box
        sx={{
          position: "relative",
          width: "78%",
          backgroundColor: "white",
          borderRadius: "20px",
          padding: {
            xs: "25px 20px 70px 20px",
            sm: "30px 25px 70px 25px",
            md: "35px 30px 70px 30px",
          },
          boxShadow: "0px 3.67px 3.67px 1.83px #00000040",
          border: `6px solid ${theme.palette.primary.dark}`,
          zIndex: 1,
          minHeight: "120px",
          display: "flex",
          gap: "12px",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {renderMedia()}
        <Typography
          variant="h4"
          sx={{
            color: "#333",
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {questionText}
        </Typography>
      </Box>
    </Box>
  );
};

export default QuestionBuzzer;
