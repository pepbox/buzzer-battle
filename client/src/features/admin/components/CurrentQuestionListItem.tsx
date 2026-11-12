import React from "react";
import { formatQuestionScoring } from "../utils/scoring";
import {
  Paper,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Switch,
  FormControlLabel,
  Tooltip,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
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
  /** Already played / live in the running game: can't be moved or removed. */
  locked?: boolean;
  /** Whether this admin may edit the question (server `isEditable`). */
  canEdit?: boolean;
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
  locked = false,
  canEdit = true,
}) => {
  return (
    <Paper
      variant="outlined"
      draggable={!locked}
      onDragStart={(event) => {
        if (locked) {
          event.preventDefault();
          return;
        }
        onDragStart(questionId);
      }}
      onDragOver={onDragOver}
      onDrop={() => onDrop(questionId)}
      sx={{
        p: 1.25,
        borderColor: isDragging ? "primary.main" : "divider",
        opacity: isDragging ? 0.65 : 1,
        cursor: locked ? "default" : "grab",
        bgcolor: locked ? "action.hover" : undefined,
        transition: "all 150ms ease",
        "&:active": {
          cursor: locked ? "default" : "grabbing",
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
        {locked ? (
          <Tooltip title="Already played or live — can't be moved or removed during the game">
            <LockOutlinedIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
          </Tooltip>
        ) : (
          <DragIndicatorIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
        )}
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
            Score: {formatQuestionScoring(question)} | Buzzer:{" "}
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
          {canEdit && (
            <IconButton
              size="small"
              onClick={() => onEdit(questionId)}
              disabled={loading || !question}
              title="Edit question"
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          )}

          <IconButton
            size="small"
            color="error"
            onClick={() => onRemove(questionId)}
            disabled={loading || locked}
            title={locked ? "Locked during the game" : "Remove from list"}
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
