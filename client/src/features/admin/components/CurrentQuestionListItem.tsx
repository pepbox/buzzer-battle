import React from "react";
import {
  Paper,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Switch,
  FormControlLabel,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { QuestionBankItem } from "../types/interfaces";

export interface CurrentQuestionListItemProps {
  question: QuestionBankItem | undefined;
  questionId: string;
  index: number;
  isDragging?: boolean;
  onDragStart: (questionId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (targetQuestionId: string) => void;
  onEdit: (questionId: string) => void;
  onRemove: (questionId: string) => void;
  onPreview?: (question: QuestionBankItem) => void;
  onToggleHide?: (question: QuestionBankItem, checked: boolean) => void;
  isTogglingHide?: boolean;
  loading?: boolean;
}

const CurrentQuestionListItem: React.FC<CurrentQuestionListItemProps> = ({
  question,
  questionId,
  index,
  isDragging = false,
  onDragStart,
  onDragOver,
  onDrop,
  onEdit,
  onRemove,
  onPreview,
  onToggleHide,
  isTogglingHide = false,
  loading = false,
}) => {
  return (
    <Paper
      variant="outlined"
      draggable
      onDragStart={() => onDragStart(questionId)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(questionId)}
      sx={{
        p: 1.25,
        borderColor: isDragging ? "primary.main" : "divider",
        opacity: isDragging ? 0.65 : 1,
        cursor: "grab",
        transition: "all 150ms ease",
        "&:active": {
          cursor: "grabbing",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <DragIndicatorIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
        <Typography
          variant="body2"
          sx={{
            minWidth: 28,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {index + 1}.
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap fontWeight={600}>
            {question?.questionContent?.text ||
              question?.questionText ||
              "Question details unavailable"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Score: {question?.score ?? 0} | Buzzer:{" "}
            {question?.keepBuzzer === false ? "Off" : "On"}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
          {question && (
            <Box sx={{ mt: 0.5 }}>
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Switch
                    size="small"
                    checked={question.hideFromUsers === true}
                    disabled={loading || isTogglingHide}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      onToggleHide?.(question, event.target.checked)
                    }
                  />
                }
                label="Hide question"
              />
            </Box>
          )}
          {onPreview && question && (
            <IconButton
              size="small"
              onClick={() => onPreview(question)}
              disabled={loading || !question}
              title="Preview question"
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton
            size="small"
            onClick={() => onEdit(questionId)}
            disabled={loading || !question}
            title="Edit question"
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>

          <IconButton
            size="small"
            color="error"
            onClick={() => onRemove(questionId)}
            disabled={loading}
            title="Remove from list"
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>

          {(loading || isTogglingHide) && <CircularProgress size={20} />}
        </Box>
      </Box>
    </Paper>
  );
};

export default CurrentQuestionListItem;
