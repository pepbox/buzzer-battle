import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { QuestionBankItem } from "../types/interfaces";
import CurrentQuestionListItem from "./CurrentQuestionListItem";
import { useDragDropReorder } from "../hooks/useDragDropReorder";
import QuestionPreviewModal from "./QuestionPreviewModal";
import QuestionLibraryManager from "./QuestionLibraryManager";

export interface CurrentQuestionsModalProps {
  open: boolean;
  onClose: () => void;
  selectedQuestionIds: string[];
  questionLookup: Map<string, QuestionBankItem>;
  onSave: (questionIds: string[]) => Promise<void>;
  onEdit: (question: QuestionBankItem) => void;
  onAddQuestions?: () => void;
  isSaving?: boolean;
  error?: string | null;
  onErrorDismiss?: () => void;
}

const CurrentQuestionsModal: React.FC<CurrentQuestionsModalProps> = ({
  open,
  onClose,
  selectedQuestionIds,
  questionLookup,
  onSave,
  onEdit,
  isSaving = false,
  error = null,
  onErrorDismiss,
}) => {
  const {
    draggingId,
    items,
    handleDragStart,
    handleDragOver,
    handleDrop,
    setItems,
  } = useDragDropReorder(selectedQuestionIds);

  const [localError, setLocalError] = useState<string | null>(null);
  const [previewQuestion, setPreviewQuestion] =
    useState<QuestionBankItem | null>(null);
  const [questionLibraryOpen, setQuestionLibraryOpen] = useState(false);

  // Sync items with selectedQuestionIds when modal opens
  React.useEffect(() => {
    if (open) {
      setItems(selectedQuestionIds);
      setLocalError(null);
    }
  }, [open, selectedQuestionIds, setItems]);

  const handleRemoveQuestion = (questionId: string) => {
    setItems((prev) => prev.filter((id) => id !== questionId));
  };

  const handleSave = async () => {
    try {
      setLocalError(null);
      await onSave(items);
      onClose();
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to save questions";
      setLocalError(errorMsg);
    }
  };

  const isLoading = isSaving;
  const hasQuestions = items.length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        Current Question List ({items.length})
      </DialogTitle>

      <DialogContent sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {(error || localError) && (
          <Alert
            severity="error"
            onClose={() => {
              setLocalError(null);
              onErrorDismiss?.();
            }}
            sx={{ mb: 2 }}
          >
            {error || localError}
          </Alert>
        )}

        {!hasQuestions ? (
          <Typography color="text.secondary">
            No questions selected yet. Click "Add Questions" to get started.
          </Typography>
        ) : (
          <List sx={{ display: "flex", flexDirection: "column", gap: 1, p: 0 }}>
            {items.map((questionId: string, index: number) => {
              const question = questionLookup.get(questionId);

              return (
                <CurrentQuestionListItem
                  key={`question-${questionId}`}
                  questionId={questionId}
                  question={question}
                  index={index}
                  isDragging={draggingId === questionId}
                  onDragStart={handleDragStart}
                  onDragOver={(e) => handleDragOver(e)}
                  onDrop={handleDrop}
                  onEdit={(qId) => {
                    const q = questionLookup.get(qId);
                    if (q) onEdit(q);
                  }}
                  onRemove={(qId) => {
                    handleRemoveQuestion(qId);
                  }}
                  onPreview={(question) => setPreviewQuestion(question)}
                  loading={isLoading}
                />
              );
            })}
          </List>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          padding: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          gap: 1,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setQuestionLibraryOpen(true)}
            disabled={isLoading}
            sx={{ textTransform: "none" }}
          >
            Add Questions
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={onClose} disabled={isLoading}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isLoading || !hasQuestions}
            sx={{
              minWidth: 120,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            {isLoading && <CircularProgress size={20} />}
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </Box>
      </DialogActions>

      {/* Question Preview Modal */}
      <QuestionPreviewModal
        open={Boolean(previewQuestion)}
        onClose={() => setPreviewQuestion(null)}
        question={previewQuestion}
      />

      <Dialog
        open={questionLibraryOpen}
        onClose={() => setQuestionLibraryOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add Questions</DialogTitle>
        <DialogContent sx={{ p: 0, minHeight: 0 }}>
          <QuestionLibraryManager
            selectedQuestionIds={items}
            onQuestionsSaved={(questionIds) => {
              setItems(questionIds);
              setQuestionLibraryOpen(false);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestionLibraryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default CurrentQuestionsModal;
