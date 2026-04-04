import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { QuestionMediaItem } from "../types/interfaces";
import { renderMediaPreview } from "../utils/renderMediaPreview";

export interface MediaUploadFieldProps {
  label: string;
  mediaItems: QuestionMediaItem[];
  onUpload: (file: File) => Promise<void>;
  onRemove: (clientId: string) => void;
  onPreview: (media: QuestionMediaItem) => void;
  isUploading?: boolean;
  accept?: string;
}

const MediaUploadField: React.FC<MediaUploadFieldProps> = ({
  label,
  mediaItems,
  onUpload,
  onRemove,
  onPreview,
  isUploading = false,
  accept = "image/*,video/*,audio/*",
}) => {
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await onUpload(file);
    } catch (error) {
      console.error("Upload failed:", error);
    }

    // Reset file input to allow re-selecting same file
    setFileInputKey((prev) => prev + 1);
    e.currentTarget.value = "";
  };

  return (
    <Box>
      <Button
        component="label"
        variant="outlined"
        startIcon={
          isUploading ? <CircularProgress size={20} /> : <UploadFileIcon />
        }
        disabled={isUploading}
        sx={{ textTransform: "none" }}
      >
        {label}
        <input
          key={fileInputKey}
          hidden
          type="file"
          accept={accept}
          onChange={handleFileSelect}
        />
      </Button>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
        {mediaItems.map((media, idx) => {
          const isCurrentlyUploading = media.uploadStatus === "uploading";
          const mediaKey = media.clientId || `media-${idx}`;

          return (
            <Box
              key={mediaKey}
              sx={{
                position: "relative",
                display: "inline-flex",
                flexDirection: "column",
                gap: 0.5,
              }}
            >
              {isCurrentlyUploading && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    borderRadius: 1,
                    zIndex: 10,
                  }}
                >
                  <Box sx={{ textAlign: "center" }}>
                    <CircularProgress size={32} />
                    <Typography
                      variant="caption"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      Uploading...
                    </Typography>
                  </Box>
                </Box>
              )}

              {renderMediaPreview({
                media,
                idx,
                onPreview,
                onRemove: media.clientId
                  ? () => onRemove(media.clientId as string)
                  : undefined,
                showActions: true,
                isUploading: isCurrentlyUploading,
              })}

              {isCurrentlyUploading && (
                <LinearProgress
                  variant="indeterminate"
                  sx={{ borderRadius: 999, minWidth: 120 }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default MediaUploadField;
