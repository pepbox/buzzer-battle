import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from "@mui/material";
import { QuestionBankItem } from "../types/interfaces";
import { renderMediaPreview } from "../utils/renderMediaPreview";

export interface QuestionPreviewModalProps {
  open: boolean;
  onClose: () => void;
  question: QuestionBankItem | null;
}

const QuestionPreviewModal: React.FC<QuestionPreviewModalProps> = ({
  open,
  onClose,
  question,
}) => {
  if (!question) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Question Preview</DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Question */}
          <Box>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              color="text.secondary"
            >
              Question
            </Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              {question.questionText ||
                question.questionContent?.text ||
                "No question text"}
            </Typography>
          </Box>

          {/* Question Media */}
          {question.questionContent?.media &&
            question.questionContent.media.length > 0 && (
              <Box>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color="text.secondary"
                >
                  Question Media
                </Typography>
                <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap" }}>
                  {question.questionContent.media.map((media, idx) =>
                    renderMediaPreview({ media, idx, showActions: false }),
                  )}
                </Box>
              </Box>
            )}

          {/* Answer */}
          <Box>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              color="text.secondary"
            >
              Answer
            </Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              {question.answerContent?.text || "No answer text"}
            </Typography>
          </Box>

          {/* Answer Media */}
          {question.answerContent?.media &&
            question.answerContent.media.length > 0 && (
              <Box>
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color="text.secondary"
                >
                  Answer Media
                </Typography>
                <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap" }}>
                  {question.answerContent.media.map((media, idx) =>
                    renderMediaPreview({ media, idx, showActions: false }),
                  )}
                </Box>
              </Box>
            )}

          {question.questionAssets && question.questionAssets.length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color="text.secondary"
              >
                Question Assets
              </Typography>
              <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap" }}>
                {question.questionAssets.map((media, idx) =>
                  renderMediaPreview({ media, idx, showActions: false }),
                )}
              </Box>
            </Box>
          )}

          {/* Metadata */}
          <Box
            sx={{
              display: "flex",
              gap: 3,
              pt: 2,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                Score
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {question.score ?? 0}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Folder
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {question.folder || "General"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Options
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {question.options?.length || 0}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Buzzer
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {question.keepBuzzer === false ? "Off" : "On"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Hidden From Users
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {question.hideFromUsers ? "Yes" : "No"}
              </Typography>
            </Box>
          </Box>

          {/* Options if any */}
          {question.options && question.options.length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color="text.secondary"
              >
                Options
              </Typography>
              <Box
                sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}
              >
                {question.options.map((opt, idx) => (
                  <Typography key={opt.optionId} variant="body2">
                    {String.fromCharCode(97 + idx)}) {opt.optionText}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuestionPreviewModal;
