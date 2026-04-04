import React from "react";
import { Box, Chip, IconButton } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { QuestionMediaItem } from "../types/interfaces";

export interface RenderMediaPreviewProps {
  media: QuestionMediaItem;
  idx: number;
  onPreview?: (media: QuestionMediaItem) => void;
  onRemove?: (idx: number) => void;
  showActions?: boolean;
  isUploading?: boolean;
}

export const renderMediaPreview = ({
  media,
  idx,
  onPreview,
  onRemove,
  showActions = false,
  isUploading = false,
}: RenderMediaPreviewProps) => {
  const hasActions = (onPreview || onRemove) && showActions;
  const mediaUrl = media.url || media.previewUrl;

  if (!mediaUrl) {
    return (
      <Chip
        key={`${media.type}-${idx}`}
        size="small"
        label={media.text || media.name || media.type}
      />
    );
  }

  // Media wrapper for images/videos with optional action buttons
  const mediaWrapper = (
    mediaElement: React.ReactNode,
    aspectRatio?: string,
  ) => (
    <Box
      key={`media-wrapper-${idx}`}
      sx={{
        position: "relative",
        display: "inline-block",
        aspectRatio: aspectRatio,
      }}
    >
      {mediaElement}
      {hasActions && !isUploading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            display: "flex",
            gap: 0.5,
            background: "rgba(0, 0, 0, 0.5)",
            borderRadius: "0 4px 0 4px",
          }}
        >
          {onPreview && (
            <IconButton
              size="small"
              onClick={() => onPreview(media)}
              sx={{
                color: "white",
                padding: "4px",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          )}
          {onRemove && (
            <IconButton
              size="small"
              onClick={() => onRemove(idx)}
              sx={{
                color: "white",
                padding: "4px",
                "&:hover": { backgroundColor: "rgba(255, 68, 68, 0.3)" },
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}
    </Box>
  );

  if (media.type === "image" || media.type === "gif") {
    return mediaWrapper(
      <Box
        component="img"
        src={mediaUrl}
        alt={media.name || media.type}
        sx={{ width: 80, height: 60, objectFit: "cover", borderRadius: 1 }}
      />,
      "4 / 3",
    );
  }

  if (media.type === "video") {
    return mediaWrapper(
      <Box
        component="video"
        src={mediaUrl}
        controls
        sx={{ width: 120, height: 70, borderRadius: 1 }}
      />,
      "16 / 9",
    );
  }

  if (media.type === "audio") {
    return (
      <Box
        key={`media-audio-${idx}`}
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <Box component="audio" src={mediaUrl} controls sx={{ width: 180 }} />
        {hasActions && !isUploading && (
          <Box sx={{ display: "flex", gap: 0 }}>
            {onPreview && (
              <IconButton
                size="small"
                onClick={() => onPreview(media)}
                sx={{
                  color: "text.secondary",
                  padding: "4px",
                  "&:hover": { color: "primary.main" },
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            )}
            {onRemove && (
              <IconButton
                size="small"
                onClick={() => onRemove(idx)}
                sx={{
                  color: "text.secondary",
                  padding: "4px",
                  "&:hover": { color: "error.main" },
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Chip
      key={`${mediaUrl}-${idx}`}
      size="small"
      label={media.name || mediaUrl}
      component="a"
      href={mediaUrl}
      clickable
      target="_blank"
      rel="noreferrer"
    />
  );
};
