import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import {
  QuestionBankItem,
  useDeleteQuestionMutation,
  useFetchQuestionBankQuery,
  useFetchQuestionFoldersQuery,
  useUpdateSessionQuestionsMutation,
} from "../services/admin.Api";
import { useFetchSessionQuery } from "../../session/services/session.api";
import QuestionCard from "./QuestionCard";
import QuestionEditorDialog from "./QuestionEditorDialog";
import QuestionPreviewModal from "./QuestionPreviewModal";

type SortOrder = "newest" | "oldest";

export interface QuestionLibraryManagerProps {
  selectedQuestionIds?: string[];
  onQuestionsSaved?: (questionIds: string[]) => void | Promise<void>;
  onOpenCurrentList?: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
  showCurrentListButton?: boolean;
}

const uniqueIds = (questionIds: string[]) => Array.from(new Set(questionIds));

const QuestionLibraryManager: React.FC<QuestionLibraryManagerProps> = ({
  selectedQuestionIds: selectedQuestionIdsProp,
  onQuestionsSaved,
  onOpenCurrentList,
  onBack,
  showBackButton = false,
  showCurrentListButton = false,
}) => {
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState<QuestionBankItem | null>(null);
  const [questionToDelete, setQuestionToDelete] =
    useState<QuestionBankItem | null>(null);
  const [previewQuestion, setPreviewQuestion] =
    useState<QuestionBankItem | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: sessionResponse } = useFetchSessionQuery();
  const {
    data: foldersResponse,
    isLoading: isFoldersLoading,
    refetch: refetchFolders,
  } = useFetchQuestionFoldersQuery();

  const queryArgs = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      folder: selectedFolder,
      sort,
      page: 1,
      limit: 200,
    }),
    [debouncedSearch, selectedFolder, sort],
  );

  const {
    data: questionBankResponse,
    isLoading: isQuestionLoading,
    refetch: refetchQuestions,
  } = useFetchQuestionBankQuery(queryArgs);
  const [updateSessionQuestions, { isLoading: isSavingQuestions }] =
    useUpdateSessionQuestionsMutation();
  const [deleteQuestion, { isLoading: isDeletingQuestion }] =
    useDeleteQuestionMutation();

  const folders = useMemo(() => {
    const apiFolders = foldersResponse?.data?.folders || [];
    return ["all", ...apiFolders.filter((folder) => folder.toLowerCase() !== "all")];
  }, [foldersResponse]);

  const questionBank = questionBankResponse?.data?.questions || [];
  const currentSessionQuestionIds = sessionResponse?.data?.questions || [];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    setSelectedQuestionIds(
      uniqueIds(selectedQuestionIdsProp ?? currentSessionQuestionIds),
    );
  }, [currentSessionQuestionIds, selectedQuestionIdsProp]);

  const visibleQuestionIds = useMemo(
    () => questionBank.map((question) => question._id),
    [questionBank],
  );

  const allVisibleSelected =
    visibleQuestionIds.length > 0 &&
    visibleQuestionIds.every((questionId) =>
      selectedQuestionIds.includes(questionId),
    );

  const someVisibleSelected =
    visibleQuestionIds.some((questionId) =>
      selectedQuestionIds.includes(questionId),
    ) && !allVisibleSelected;

  const toggleQuestion = (questionId: string) => {
    setSelectedQuestionIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  };

  const handleToggleVisibleQuestions = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { checked } = event.target;

    setSelectedQuestionIds((current) => {
      if (checked) {
        return uniqueIds([...current, ...visibleQuestionIds]);
      }

      const visibleSet = new Set(visibleQuestionIds);
      return current.filter((questionId) => !visibleSet.has(questionId));
    });
  };

  const handleSaveQuestions = async () => {
    setSaveError(null);

    try {
      await updateSessionQuestions({ questions: selectedQuestionIds }).unwrap();
      await onQuestionsSaved?.(selectedQuestionIds);
    } catch (error: any) {
      setSaveError(error?.data?.message || "Failed to save session questions");
    }
  };

  const handleEditQuestion = (question: QuestionBankItem) => {
    setEditingQuestion(question);
    setEditModalOpen(true);
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete?._id) return;

    setActionError(null);
    try {
      await deleteQuestion(questionToDelete._id).unwrap();
      setSelectedQuestionIds((current) =>
        current.filter((id) => id !== questionToDelete._id),
      );
      setQuestionToDelete(null);
      refetchQuestions();
      refetchFolders();
    } catch (error: any) {
      setActionError(error?.data?.message || "Failed to delete question");
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(circle at 15% 10%, #f4f8ff 0%, #eef2ff 40%, #f7f8fc 100%)",
      }}
    >
      <Paper
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h5" fontWeight={700}>
            Question Library
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {showCurrentListButton && (
              <Button onClick={onOpenCurrentList}>Current Question List</Button>
            )}
            {showBackButton && <Button onClick={onBack}>Back to Dashboard</Button>}
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 2 }}>
          <TextField
            fullWidth
            placeholder="Search question, answer, options, folder"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
              ),
            }}
          />
          <IconButton onClick={(e) => setSortAnchorEl(e.currentTarget)}>
            <FilterListIcon />
          </IconButton>
          <Menu
            anchorEl={sortAnchorEl}
            open={Boolean(sortAnchorEl)}
            onClose={() => setSortAnchorEl(null)}
          >
            <MenuItem
              onClick={() => {
                setSort("newest");
                setSortAnchorEl(null);
              }}
            >
              Newest
            </MenuItem>
            <MenuItem
              onClick={() => {
                setSort("oldest");
                setSortAnchorEl(null);
              }}
            >
              Oldest
            </MenuItem>
          </Menu>
        </Box>
      </Paper>

      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      <Paper
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          overflow: "hidden",
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            width: { xs: "38%", md: "20%" },
            borderRight: "1px solid",
            borderColor: "divider",
            p: 1.25,
            minHeight: 0,
            overflowY: "auto",
            backgroundColor: "#fbfbff",
          }}
        >
          <Typography variant="subtitle2" sx={{ px: 1, py: 0.5 }}>
            Folders
          </Typography>
          <List dense>
            {isFoldersLoading ? (
              <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              folders.map((folder) => (
                <ListItem key={folder} disablePadding>
                  <ListItemButton
                    selected={selectedFolder === folder}
                    onClick={() => setSelectedFolder(folder)}
                  >
                    <ListItemText
                      primary={folder === "all" ? "All" : folder}
                      primaryTypographyProps={{ noWrap: true }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        </Box>

        <Box
          sx={{
            width: { xs: "62%", md: "80%" },
            p: 2,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
              mb: 1,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              {questionBank.length} result{questionBank.length === 1 ? "" : "s"}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Selected: {selectedQuestionIds.length}
              </Typography>
              <FormControlLabel
                sx={{ mr: 0 }}
                control={
                  <Checkbox
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    onChange={handleToggleVisibleQuestions}
                  />
                }
                label="Select all"
              />
            </Box>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", pr: 0.5 }}>
            {isQuestionLoading ? (
              <Box sx={{ py: 5, display: "flex", justifyContent: "center" }}>
                <CircularProgress />
              </Box>
            ) : !questionBank.length ? (
              <Typography color="text.secondary">
                No questions found.
              </Typography>
            ) : (
              <List sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {questionBank.map((question) => (
                  <QuestionCard
                    key={question._id}
                    question={question}
                    isSelected={selectedQuestionIds.includes(question._id)}
                    onSelect={toggleQuestion}
                    onEdit={handleEditQuestion}
                    onDelete={(item) => setQuestionToDelete(item)}
                    onView={(item) => setPreviewQuestion(item)}
                    actionButtons="all"
                  />
                ))}
              </List>
            )}
          </Box>
        </Box>
      </Paper>

      <Paper
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          position: "sticky",
          bottom: 12,
          zIndex: 2,
          backdropFilter: "blur(4px)",
          backgroundColor: "rgba(255,255,255,0.92)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setCreateModalOpen(true)}
          >
            Create New Question
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveQuestions}
            disabled={isSavingQuestions}
          >
            {isSavingQuestions
              ? "Saving..."
              : `Save Questions (${selectedQuestionIds.length})`}
          </Button>
        </Box>
      </Paper>

      <QuestionEditorDialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        folders={folders.filter((name) => name !== "all")}
        defaultFolder={selectedFolder === "all" ? "General" : selectedFolder}
        mode="create"
        onSaved={() => {
          refetchQuestions();
          refetchFolders();
        }}
      />

      <QuestionEditorDialog
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingQuestion(null);
        }}
        folders={folders.filter((name) => name !== "all")}
        defaultFolder={selectedFolder === "all" ? "General" : selectedFolder}
        mode="edit"
        initialQuestion={editingQuestion}
        onSaved={() => {
          refetchQuestions();
          refetchFolders();
        }}
      />

      <Dialog
        open={Boolean(questionToDelete)}
        onClose={() => setQuestionToDelete(null)}
      >
        <DialogTitle>Delete Question</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this question? This will also remove
            it from all sessions.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestionToDelete(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteQuestion}
            disabled={isDeletingQuestion}
          >
            {isDeletingQuestion ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <QuestionPreviewModal
        open={Boolean(previewQuestion)}
        onClose={() => setPreviewQuestion(null)}
        question={previewQuestion}
      />
    </Box>
  );
};

export default QuestionLibraryManager;
