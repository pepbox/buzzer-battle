import React from "react";
import {
  Paper,
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
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

  return (
    <Paper
      variant="outlined"
      sx={{
        p: variant === "minimal" ? 1.25 : 1.5,
        borderColor: isSelected ? "primary.main" : "divider",
        boxShadow: isSelected ? "0 6px 20px rgba(25, 118, 210, 0.14)" : "none",
        transition: "all 150ms ease",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: variant === "minimal" ? "center" : "flex-start",
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            fontWeight={600}
            variant={variant === "minimal" ? "body2" : "body1"}
          >
            {question.questionText ||
              question.questionContent?.text ||
              "Untitled question"}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: variant === "minimal" ? "none" : "block" }}
          >
            Folder: {question.folder || "General"} | Score:{" "}
            {question.score ?? 0} | Options: {question.options?.length || 0}
          </Typography>
          {variant !== "minimal" &&
            !!question.questionContent?.media?.length && (
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  mt: 1,
                  flexWrap: "wrap",
                }}
              >
                {question.questionContent.media.map((media, idx) =>
                  renderMediaPreview({ media, idx, showActions: false }),
                )}
              </Box>
            )}
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: variant === "minimal" ? 0.5 : 1,
            flexShrink: 0,
            flexDirection: variant === "minimal" ? "row" : "row",
          }}
        >
          {showSelectButton && onSelect && (
            <Button
              size={variant === "minimal" ? "small" : "medium"}
              variant={isSelected ? "contained" : "outlined"}
              onClick={() => onSelect(question._id)}
              disabled={loading}
            >
              {isSelected ? "Selected" : "Select"}
            </Button>
          )}

          {showPreview && onView && (
            <IconButton
              size="small"
              onClick={() => onView(question)}
              disabled={loading}
              title="View question"
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          )}

          {showEditDelete && onEdit && (
            <IconButton
              size="small"
              onClick={() => onEdit(question)}
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
              onClick={() => onDelete(question)}
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
