import React from "react";
import { formatQuestionScoring } from "../utils/scoring";
import {
  Paper,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Checkbox,
  Chip,
  Tooltip,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DriveFileMoveIcon from "@mui/icons-material/DriveFileMove";
import { QuestionBankItem } from "../types/interfaces";
import { renderMediaPreview } from "../utils/renderMediaPreview";
import { useAdminAuth } from "../services/useAdminAuth";

export interface QuestionCardProps {
  question: QuestionBankItem;
  isSelected?: boolean;
  onSelect?: (questionId: string) => void;
  onEdit?: (question: QuestionBankItem) => void;
  onDelete?: (question: QuestionBankItem) => void;
  onView?: (question: QuestionBankItem) => void;
  onCopy?: (question: QuestionBankItem) => void;
  onMove?: (question: QuestionBankItem) => void;
  actionButtons?: "select" | "edit-delete" | "all"; // different button sets
  variant?: "default" | "minimal"; // for reuse in different contexts
  loading?: boolean;
  /** Overrides the logged-in admin id (e.g. "superadmin" in the global library). */
  currentAdminId?: string;
  /** Question is already played/live in the running game: can't be deselected. */
  locked?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onView,
  onCopy,
  onMove,
  actionButtons = "select",
  variant = "default",
  loading = false,
  currentAdminId: currentAdminIdProp,
  locked = false,
}) => {
  const { admin } = useAdminAuth();
  const currentAdminId = currentAdminIdProp ?? (admin?.id || "");
  const isSuperAdmin = currentAdminId === "superadmin";
  const isOwner = isSuperAdmin || question.createdBy === currentAdminId || !question.createdBy;
  // Server tells us whether this admin may edit/delete the question (session admins
  // can only edit their own session's private questions). Fall back to ownership
  // for older payloads without the flag.
  const canEdit = isSuperAdmin ? true : (question.isEditable ?? isOwner);
  const hasScopeInfo = question.session !== undefined;
  const isPrivateQuestion = Boolean(question.session);

  const showSelectButton =
    actionButtons === "select" || actionButtons === "all";
  const showEditDelete =
    actionButtons === "edit-delete" || actionButtons === "all";
  const showPreview = actionButtons === "all";
  // A locked question that is selected can't be removed from the session mid-game.
  const selectionLocked = locked && isSelected;
  const isSelectable = showSelectButton && Boolean(onSelect) && !selectionLocked;

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
                if (selectionLocked) return;
                onSelect(question._id);
              }}
              disabled={loading || selectionLocked}
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
            {!isSuperAdmin && (hasScopeInfo || locked) && (
              <Box sx={{ display: "flex", gap: 0.75, mt: 0.5, flexWrap: "wrap" }}>
                {hasScopeInfo && (
                  <Chip
                    size="small"
                    label={isPrivateQuestion ? "My question" : "Library"}
                    color={isPrivateQuestion ? "secondary" : "default"}
                    variant="outlined"
                    sx={{ height: 20, fontSize: 11 }}
                  />
                )}
                {locked && (
                  <Tooltip title="Already played or live in this game — it can't be moved or removed now">
                    <Chip
                      size="small"
                      icon={<LockOutlinedIcon sx={{ fontSize: 14 }} />}
                      label="Locked"
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  </Tooltip>
                )}
              </Box>
            )}
            {variant !== "minimal" && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.75 }}
              >
                Folder: {question.folder || "General"} | Score:{" "}
                {formatQuestionScoring(question)} | Options: {question.options?.length || 0}{" "}
                | Hidden: {question.hideFromUsers ? "Yes" : "No"} | Owner:{" "}
                {question.createdBy === "superadmin"
                  ? "Super Admin"
                  : question.createdBy === currentAdminId
                    ? "You"
                    : "Other Admin"}
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

          {showEditDelete && canEdit && onEdit && (
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

          {showEditDelete && currentAdminId === "superadmin" && onMove && (
            <IconButton
              size="small"
              onClick={(event) => {
                stopEvent(event);
                onMove(question);
              }}
              disabled={loading}
              title="Move question"
            >
              <DriveFileMoveIcon fontSize="small" />
            </IconButton>
          )}

          {onCopy && (
            <IconButton
              size="small"
              onClick={(event) => {
                stopEvent(event);
                onCopy(question);
              }}
              disabled={loading}
              title="Copy question"
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          )}

          {showEditDelete && canEdit && onDelete && (
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
