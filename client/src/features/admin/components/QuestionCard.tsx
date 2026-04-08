import React from "react";
import {
  Paper,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Checkbox,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { QuestionBankItem } from "../types/interfaces";
import { renderMediaPreview } from "../utils/renderMediaPreview";

export interface QuestionCardProps {
  question: QuestionBankItem;
  isSelected?: boolean;
  onSelect?: (questionId: string) => void;
  onEdit?: (question: QuestionBankItem) => void;
  onDelete?: (question: QuestionBankItem) => void;
  onView?: (question: QuestionBankItem) => void;
  actionButtons?: "select" | "edit-delete" | "all"; // different button sets
  variant?: "default" | "minimal"; // for reuse in different contexts
  loading?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onView,
  actionButtons = "select",
  variant = "default",
  loading = false,
}) => {
  const showSelectButton =
    actionButtons === "select" || actionButtons === "all";
  const showEditDelete =
    actionButtons === "edit-delete" || actionButtons === "all";
  const showPreview = actionButtons === "all";
  const isSelectable = showSelectButton && Boolean(onSelect);

  const handleSelect = () => {
    if (isSelectable && onSelect) {
      onSelect(question._id);
    }
  };

  const stopEvent = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <Paper
      variant="outlined"
      onClick={handleSelect}
      sx={{
        p: variant === "minimal" ? 1.25 : 2,
        borderColor: isSelected ? "success.main" : "rgba(15, 23, 42, 0.14)",
        borderWidth: isSelected ? 2 : 1,
        borderRadius: 3,
        backgroundColor: isSelected ? "#f6fff5" : "#ffffff",
        boxShadow: isSelected
          ? "0 8px 18px rgba(22, 163, 74, 0.10)"
          : "none",
        transition: "all 150ms ease",
        cursor: isSelectable ? "pointer" : "default",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: variant === "minimal" ? "center" : "flex-start",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "flex", gap: 1.25, flex: 1, minWidth: 0 }}>
          {showSelectButton && onSelect && (
            <Checkbox
              checked={isSelected}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(question._id);
              }}
              disabled={loading}
              sx={{
                mt: -0.5,
                color: isSelected ? "success.main" : "rgba(15, 23, 42, 0.35)",
                "&:hover": {
                  backgroundColor: "transparent",
                },
                "&.Mui-checked": {
                  color: "success.main",
                },
              }}
            />
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              fontWeight={700}
              variant={variant === "minimal" ? "body2" : "body1"}
              sx={{
                color: "text.primary",
                wordBreak: "break-word",
              }}
            >
              {question.questionText ||
                question.questionContent?.text ||
                "Untitled question"}
            </Typography>
            {variant !== "minimal" && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.75 }}
              >
                Folder: {question.folder || "General"} | Score:{" "}
                {question.score ?? 0} | Options: {question.options?.length || 0}{" "}
                | Hidden: {question.hideFromUsers ? "Yes" : "No"}
              </Typography>
            )}
            {variant !== "minimal" &&
              !!question.questionContent?.media?.length && (
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    mt: 1.5,
                    flexWrap: "wrap",
                  }}
                >
                  {question.questionContent.media.map((media, idx) =>
                    renderMediaPreview({ media, idx, showActions: false }),
                  )}
                </Box>
              )}
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexShrink: 0,
            flexDirection: variant === "minimal" ? "row" : "row",
            alignItems: "center",
          }}
        >
          {showPreview && onView && (
            <IconButton
              size="small"
              onClick={(event) => {
                stopEvent(event);
                onView(question);
              }}
              disabled={loading}
              title="View question"
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          )}

          {showEditDelete && onEdit && (
            <IconButton
              size="small"
              onClick={(event) => {
                stopEvent(event);
                onEdit(question);
              }}
              disabled={loading}
              title="Edit question"
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          )}

          {showEditDelete && onDelete && (
            <IconButton
              size="small"
              color="error"
              onClick={(event) => {
                stopEvent(event);
                onDelete(question);
              }}
              disabled={loading}
              title="Delete question"
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          )}

          {loading && <CircularProgress size={20} />}
        </Box>
      </Box>
    </Paper>
  );
};

export default QuestionCard;
