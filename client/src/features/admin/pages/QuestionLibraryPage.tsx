import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
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
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useNavigate, useParams } from "react-router-dom";
import {
  CreateQuestionPayload,
  QuestionMediaItem,
  useCreateQuestionFolderMutation,
  useCreateQuestionMutation,
  useFetchQuestionBankQuery,
  useFetchQuestionFoldersQuery,
  useUpdateSessionQuestionsMutation,
  useUploadQuestionMediaMutation,
} from "../services/admin.Api";
import { useFetchSessionQuery } from "../../session/services/session.api";

type SortOrder = "newest" | "oldest";

type CreateQuestionModalProps = {
  open: boolean;
  onClose: () => void;
  folders: string[];
  defaultFolder: string;
  onCreated: () => void;
};

const renderMediaPreview = (media: QuestionMediaItem, idx: number) => {
  if (!media.url) {
    return (
      <Chip
        key={`${media.type}-${idx}`}
        size="small"
        label={media.text || media.name || media.type}
      />
    );
  }

  if (media.type === "image" || media.type === "gif") {
    return (
      <Box
        key={`${media.url}-${idx}`}
        component="img"
        src={media.url}
        alt={media.name || media.type}
        sx={{ width: 80, height: 60, objectFit: "cover", borderRadius: 1 }}
      />
    );
  }

  if (media.type === "video") {
    return (
      <Box
        key={`${media.url}-${idx}`}
        component="video"
        src={media.url}
        controls
        sx={{ width: 120, height: 70, borderRadius: 1 }}
      />
    );
  }

  return (
    <Chip
      key={`${media.url}-${idx}`}
      size="small"
      label={media.name || media.url}
      component="a"
      href={media.url}
      clickable
      target="_blank"
      rel="noreferrer"
    />
  );
};

const CreateQuestionModal: React.FC<CreateQuestionModalProps> = ({
  open,
  onClose,
  folders,
  defaultFolder,
  onCreated,
}) => {
  const [createQuestion, { isLoading: isCreating }] =
    useCreateQuestionMutation();
  const [createFolder, { isLoading: isCreatingFolder }] =
    useCreateQuestionFolderMutation();
  const [uploadMedia, { isLoading: isUploadingMedia }] =
    useUploadQuestionMediaMutation();

  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [score, setScore] = useState<number>(0);
  const [keepBuzzer, setKeepBuzzer] = useState(true);
  const [folder, setFolder] = useState(defaultFolder || "General");
  const [newFolderName, setNewFolderName] = useState("");
  const [optionText, setOptionText] = useState("");
  const [options, setOptions] = useState<Array<{ optionText: string }>>([]);
  const [questionMedia, setQuestionMedia] = useState<QuestionMediaItem[]>([]);
  const [questionAssets, setQuestionAssets] = useState<QuestionMediaItem[]>([]);
  const [answerMedia, setAnswerMedia] = useState<QuestionMediaItem[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFolder(defaultFolder || "General");
  }, [open, defaultFolder]);

  const hasQuestion = questionText.trim() || questionMedia.length > 0;
  const hasAnswer = answerText.trim() || answerMedia.length > 0;

  const handleUpload = async (
    file: File,
    target: "question" | "assets" | "answer",
  ) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await uploadMedia(formData).unwrap();
    const media = response.data.media;

    if (target === "question") {
      setQuestionMedia((prev) => [...prev, media]);
      return;
    }

    if (target === "assets") {
      setQuestionAssets((prev) => [...prev, media]);
      return;
    }

    setAnswerMedia((prev) => [...prev, media]);
  };

  const handleAddFolder = async () => {
    if (!newFolderName.trim()) return;
    setSubmitError(null);
    try {
      const created = await createFolder({
        name: newFolderName.trim(),
      }).unwrap();
      setFolder(created.data.folder);
      setNewFolderName("");
    } catch (error: any) {
      setSubmitError(error?.data?.message || "Failed to create folder");
    }
  };

  const handleAddOption = () => {
    if (!optionText.trim()) return;
    setOptions((prev) => [...prev, { optionText: optionText.trim() }]);
    setOptionText("");
  };

  const resetForm = () => {
    setQuestionText("");
    setAnswerText("");
    setScore(0);
    setKeepBuzzer(true);
    setOptionText("");
    setOptions([]);
    setQuestionMedia([]);
    setQuestionAssets([]);
    setAnswerMedia([]);
    setNewFolderName("");
    setSubmitError(null);
  };

  const handleCreate = async () => {
    setSubmitError(null);

    if (!hasQuestion) {
      setSubmitError("Question is required (text or media).");
      return;
    }

    if (!hasAnswer) {
      setSubmitError("Answer is required (text or media).");
      return;
    }

    const payload: CreateQuestionPayload = {
      questionText: questionText.trim(),
      score: Number.isFinite(Number(score)) ? Number(score) : 0,
      folder,
      keepBuzzer,
      options: options.map((opt) => ({ optionText: opt.optionText })),
      questionContent: {
        text: questionText.trim() || undefined,
        media: questionMedia,
      },
      questionAssets,
      answerContent: {
        text: answerText.trim() || undefined,
        media: answerMedia,
      },
    };

    const firstQuestionMedia = questionMedia[0];
    if (
      firstQuestionMedia?.type === "image" ||
      firstQuestionMedia?.type === "gif"
    ) {
      payload.questionImage = firstQuestionMedia.url;
    }
    if (firstQuestionMedia?.type === "video") {
      payload.quetionVideo = firstQuestionMedia.url;
    }

    if (options.length > 0) {
      payload.correctAnswer = "a";
    }

    try {
      await createQuestion(payload).unwrap();
      resetForm();
      onCreated();
      onClose();
    } catch (error: any) {
      setSubmitError(error?.data?.message || "Failed to create question");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Create New Question</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <TextField
            label="Question (required)"
            multiline
            minRows={2}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />

          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileIcon />}
              disabled={isUploadingMedia}
            >
              Upload Question Media
              <input
                hidden
                type="file"
                accept="image/*,video/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await handleUpload(file, "question");
                  e.currentTarget.value = "";
                }}
              />
            </Button>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
              {questionMedia.map(renderMediaPreview)}
            </Box>
          </Box>

          <TextField
            label="Question Assets (optional text)"
            multiline
            minRows={2}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (!value) return;
              setQuestionAssets((prev) => [
                ...prev,
                { type: "text", text: value },
              ]);
              e.target.value = "";
            }}
          />

          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileIcon />}
              disabled={isUploadingMedia}
            >
              Upload Asset Media
              <input
                hidden
                type="file"
                accept="image/*,video/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await handleUpload(file, "assets");
                  e.currentTarget.value = "";
                }}
              />
            </Button>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
              {questionAssets.map(renderMediaPreview)}
            </Box>
          </Box>

          <TextField
            label="Answer (required)"
            multiline
            minRows={2}
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
          />

          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileIcon />}
              disabled={isUploadingMedia}
            >
              Upload Answer Media
              <input
                hidden
                type="file"
                accept="image/*,video/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await handleUpload(file, "answer");
                  e.currentTarget.value = "";
                }}
              />
            </Button>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
              {answerMedia.map(renderMediaPreview)}
            </Box>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={keepBuzzer}
                onChange={(e) => setKeepBuzzer(e.target.checked)}
              />
            }
            label="Keep Buzzer"
          />

          <TextField
            label="Score"
            type="number"
            value={score}
            onChange={(e) => setScore(Number(e.target.value || 0))}
          />

          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              fullWidth
              label="Add Option (optional)"
              value={optionText}
              onChange={(e) => setOptionText(e.target.value)}
            />
            <Button variant="outlined" onClick={handleAddOption}>
              Add
            </Button>
          </Box>

          {!!options.length && (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {options.map((opt, idx) => (
                <Chip key={`${opt.optionText}-${idx}`} label={opt.optionText} />
              ))}
            </Box>
          )}

          <TextField
            select
            label="Folder"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          >
            {folders.map((folderName) => (
              <MenuItem key={folderName} value={folderName}>
                {folderName}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              fullWidth
              label="Create New Folder"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <Button
              variant="outlined"
              onClick={handleAddFolder}
              disabled={isCreatingFolder}
            >
              Create
            </Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={isCreating || isUploadingMedia}
        >
          {isCreating ? "Creating..." : "Create Question"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const QuestionLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const folders = useMemo(() => {
    const apiFolders = foldersResponse?.data?.folders || [];
    return ["all", ...apiFolders.filter((f) => f.toLowerCase() !== "all")];
  }, [foldersResponse]);

  const questionBank = questionBankResponse?.data?.questions || [];
  const currentSessionQuestionIds = sessionResponse?.data?.questions || [];

  useEffect(() => {
    setSelectedQuestionIds(currentSessionQuestionIds);
  }, [sessionResponse?.data?.questions]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const toggleQuestion = (questionId: string) => {
    setSelectedQuestionIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  };

  const handleSaveQuestions = async () => {
    setSaveError(null);
    try {
      await updateSessionQuestions({ questions: selectedQuestionIds }).unwrap();
      navigate(`/admin/${sessionId}/dashboard`);
    } catch (error: any) {
      setSaveError(error?.data?.message || "Failed to save session questions");
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        minHeight: "100vh",
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
          <Button onClick={() => navigate(`/admin/${sessionId}/dashboard`)}>
            Back to Dashboard
          </Button>
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
              mb: 1,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              {questionBank.length} result{questionBank.length === 1 ? "" : "s"}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Selected: {selectedQuestionIds.length}
            </Typography>
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
                {questionBank.map((question) => {
                  const isSelected = selectedQuestionIds.includes(question._id);

                  return (
                    <Paper
                      key={question._id}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderColor: isSelected ? "primary.main" : "divider",
                        boxShadow: isSelected
                          ? "0 6px 20px rgba(25, 118, 210, 0.14)"
                          : "none",
                        transition: "all 150ms ease",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 2,
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={600}>
                            {question.questionText ||
                              question.questionContent?.text ||
                              "Untitled question"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Folder: {question.folder || "General"} | Score:{" "}
                            {question.score ?? 0} | Options:{" "}
                            {question.options?.length || 0}
                          </Typography>
                          {!!question.questionContent?.media?.length && (
                            <Box
                              sx={{
                                display: "flex",
                                gap: 1,
                                mt: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              {question.questionContent.media.map(
                                renderMediaPreview,
                              )}
                            </Box>
                          )}
                        </Box>

                        <Button
                          variant={isSelected ? "contained" : "outlined"}
                          onClick={() => toggleQuestion(question._id)}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </Button>
                      </Box>
                    </Paper>
                  );
                })}
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

      <CreateQuestionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        folders={folders.filter((name) => name !== "all")}
        defaultFolder={selectedFolder === "all" ? "General" : selectedFolder}
        onCreated={() => {
          refetchQuestions();
          refetchFolders();
        }}
      />
    </Box>
  );
};

export default QuestionLibraryPage;
