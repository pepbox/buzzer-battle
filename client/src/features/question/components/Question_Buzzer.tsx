import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import collarImage from "../../../assets/questions/collor.webp";

interface QuestionBuzzerProps {
  questionNumber: number;
  questionText: string;
  questionImage?: string;
  questionVideo?: string;
  questionMedia?: Array<{
    type: "text" | "image" | "video" | "audio" | "gif" | "file";
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
  const inlineVideoProps = {
    controls: true,
    playsInline: true,
    preload: "metadata" as const,
  };

  const getMediaType = (url: string): "image" | "video" | "audio" => {
    const extension = url.split(".").pop()?.toLowerCase();
    const audioExtensions = ["mp3", "wav", "ogg", "m4a", "aac", "flac"];
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

    if (audioExtensions.includes(extension || "")) {
      return "audio";
    }

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
      type: "text" | "image" | "video" | "audio" | "gif" | "file";
      url?: string;
      text?: string;
      name?: string;
    }>;

    const mediaItems = explicitMedia.length > 0 ? explicitMedia : legacyMedia;
    if (!mediaItems.length) return null;

    const mediaStyles = {
      width: "100%",
      maxHeight: "520px",
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
            {...inlineVideoProps}
            sx={mediaStyles}
          />
        );
      }

      if (media.type === "audio" && media.url) {
        return (
          <Box
            key={`buzzer-media-audio-${index}`}
            component="audio"
            src={media.url}
            controls
            preload="metadata"
            sx={{ width: "100%", my: "10px" }}
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
              {...inlineVideoProps}
              sx={mediaStyles}
            />
          );
        }
        if (derivedType === "audio") {
          return (
            <Box
              key={`buzzer-media-audio-fallback-${index}`}
              component="audio"
              src={media.url}
              controls
              preload="metadata"
              sx={{ width: "100%", my: "10px" }}
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
        maxWidth: "980px",
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
          width: "94%",
          backgroundColor: "white",
          borderRadius: "20px",
          padding: {
            xs: "22px 18px 36px 18px",
            sm: "28px 22px 40px 22px",
            md: "34px 28px 46px 28px",
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
            fontSize: {
              xs: "30px",
              sm: "38px",
              md: "44px",
            },
          }}
        >
          {questionText}
        </Typography>
      </Box>
    </Box>
  );
};

export default QuestionBuzzer;
