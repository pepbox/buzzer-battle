import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import SmartMedia from "../../../components/ui/SmartMedia";
import {
  CreateQuestionPayload,
  QuestionBankItem,
  useCreateQuestionFolderMutation,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useUploadQuestionMediaMutation,
} from "../services/admin.Api";
import MediaUploadField from "./MediaUploadField";
import { QuestionMediaItem } from "../types/interfaces";
import { buildLinkedMediaItem } from "../utils/questionPayload";

type EditableMediaItem = QuestionMediaItem & {
  clientId: string;
};

export interface QuestionEditorDialogProps {
  open: boolean;
  onClose: () => void;
  folders: string[];
  defaultFolder: string;
  onSaved: () => void;
  mode: "create" | "edit";
  initialQuestion?: QuestionBankItem | null;
}

const toClientId = () =>
  `media-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const deriveMediaType = (file: File): QuestionMediaItem["type"] => {
  if (file.type.startsWith("image/")) {
    return file.type === "image/gif" ? "gif" : "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  return "file";
};

const toEditableMediaItems = (
  mediaItems: QuestionMediaItem[] = [],
): EditableMediaItem[] =>
  mediaItems.map((media) => ({
    ...media,
    clientId: media.clientId || toClientId(),
    uploadStatus: "uploaded",
  }));

const sanitizeMediaItems = (
  mediaItems: EditableMediaItem[],
): QuestionMediaItem[] =>
  mediaItems
    .filter((media) => media.uploadStatus !== "uploading")
    .map(({ clientId, previewUrl, uploadStatus, ...media }) => media);

const revokePreviewUrl = (media?: QuestionMediaItem | null) => {
  if (media?.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(media.previewUrl);
  }
};

const cleanupMediaItems = (mediaItems: EditableMediaItem[]) => {
  mediaItems.forEach((media) => revokePreviewUrl(media));
};

const previewMediaSource = (media: QuestionMediaItem) =>
  media.url || media.previewUrl || "";

const formatFolderLabel = (folderPath: string) => {
  const segments = folderPath.split("/").filter(Boolean);
  const depth = Math.max(0, segments.length - 1);
  const label = segments[segments.length - 1] || folderPath;
  return `${"  ".repeat(depth)}${label}`;
};

const QuestionEditorDialog: React.FC<QuestionEditorDialogProps> = ({
  open,
  onClose,
  folders,
  defaultFolder,
  onSaved,
  mode,
  initialQuestion,
}) => {
  const [createQuestion, { isLoading: isCreating }] =
    useCreateQuestionMutation();
  const [updateQuestion, { isLoading: isUpdating }] =
    useUpdateQuestionMutation();
  const [createFolder, { isLoading: isCreatingFolder }] =
    useCreateQuestionFolderMutation();
  const [uploadMedia] = useUploadQuestionMediaMutation();

  const removedUploadIdsRef = useRef<Set<string>>(new Set());
  const previousMediaRef = useRef<{
    assets: EditableMediaItem[];
    answer: EditableMediaItem[];
  }>({
    assets: [],
    answer: [],
  });

  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [score, setScore] = useState<number>(0);
  const [keepBuzzer, setKeepBuzzer] = useState(true);
  const [hideFromUsers, setHideFromUsers] = useState(false);
  const [folder, setFolder] = useState(defaultFolder || "General");
  const [newFolderName, setNewFolderName] = useState("");
  const [questionLinkInput, setQuestionLinkInput] = useState("");
  const [answerLinkInput, setAnswerLinkInput] = useState("");
  const [optionText, setOptionText] = useState("");
  const [options, setOptions] = useState<
    Array<{ optionText: string; optionId?: string }>
  >([]);
  const [questionAssets, setQuestionAssets] = useState<EditableMediaItem[]>([]);
  const [answerMedia, setAnswerMedia] = useState<EditableMediaItem[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<QuestionMediaItem | null>(
    null,
  );

  const isUploadingMedia = useMemo(
    () =>
      [questionAssets, answerMedia].some((collection) =>
        collection.some((media) => media.uploadStatus === "uploading"),
      ),
    [answerMedia, questionAssets],
  );

  useEffect(() => {
    if (!open) return;

    removedUploadIdsRef.current.clear();

    if (mode === "edit" && initialQuestion) {
      setQuestionText(
        initialQuestion.questionContent?.text ||
          initialQuestion.questionText ||
          "",
      );
      setAnswerText(initialQuestion.answerContent?.text || "");
      setScore(initialQuestion.score ?? 0);
      setKeepBuzzer(initialQuestion.keepBuzzer ?? true);
      setHideFromUsers(initialQuestion.hideFromUsers ?? false);
      setFolder(initialQuestion.folder || defaultFolder || "General");
      setOptions(
        (initialQuestion.options || []).map((opt) => ({
          optionText: opt.optionText,
          optionId: opt.optionId,
        })),
      );
      setCorrectAnswer(
        initialQuestion.correctAnswer ||
          initialQuestion.options?.[0]?.optionId ||
          "",
      );
      setQuestionAssets(
        toEditableMediaItems(
          initialQuestion.questionContent?.media?.length
            ? initialQuestion.questionContent.media
            : initialQuestion.questionAssets,
        ),
      );
      setAnswerMedia(
        toEditableMediaItems(initialQuestion.answerContent?.media),
      );
      setSubmitError(null);
      setNewFolderName("");
      setQuestionLinkInput("");
      setAnswerLinkInput("");
      setOptionText("");
      return;
    }

    setQuestionText("");
    setAnswerText("");
    setScore(0);
    setKeepBuzzer(true);
    setHideFromUsers(false);
    setFolder(defaultFolder || "General");
    setQuestionLinkInput("");
    setAnswerLinkInput("");
    setOptionText("");
    setOptions([]);
    setCorrectAnswer("");
    setQuestionAssets([]);
    setAnswerMedia([]);
    setNewFolderName("");
    setSubmitError(null);
    setPreviewMedia(null);
  }, [defaultFolder, initialQuestion, mode, open]);

  useEffect(() => {
    const previousMedia = previousMediaRef.current;
    const currentItems = new Set(
      [...questionAssets, ...answerMedia].map((media) => media.clientId),
    );

    [...previousMedia.assets, ...previousMedia.answer]
      .filter((media) => !currentItems.has(media.clientId))
      .forEach((media) => revokePreviewUrl(media));

    previousMediaRef.current = {
      assets: questionAssets,
      answer: answerMedia,
    };
  }, [answerMedia, questionAssets]);

  useEffect(
    () => () => {
      cleanupMediaItems(previousMediaRef.current.assets);
      cleanupMediaItems(previousMediaRef.current.answer);
    },
    [],
  );

  const hasQuestion = questionText.trim() || questionAssets.length > 0;
  const hasAnswer = answerText.trim() || answerMedia.length > 0;

  const updateCollection = (
    target: "question" | "answer",
    updater: (items: EditableMediaItem[]) => EditableMediaItem[],
  ) => {
    if (target === "question") {
      setQuestionAssets((items) => updater(items));
      return;
    }

    setAnswerMedia((items) => updater(items));
  };

  const handleUpload = async (file: File, target: "question" | "answer") => {
    const clientId = toClientId();
    const previewUrl =
      file.type.startsWith("image/") ||
      file.type.startsWith("video/") ||
      file.type.startsWith("audio/")
        ? URL.createObjectURL(file)
        : undefined;

    const placeholder: EditableMediaItem = {
      clientId,
      type: deriveMediaType(file),
      name: file.name,
      mimeType: file.type,
      previewUrl,
      uploadStatus: "uploading",
    };

    updateCollection(target, (items) => [...items, placeholder]);
    setSubmitError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await uploadMedia(formData).unwrap();
      const uploadedMedia = response.data.media;

      updateCollection(target, (items) => {
        if (removedUploadIdsRef.current.has(clientId)) {
          revokePreviewUrl(placeholder);
          return items.filter((item) => item.clientId !== clientId);
        }

        return items.map((item) =>
          item.clientId === clientId
            ? {
                ...uploadedMedia,
                clientId,
                uploadStatus: "uploaded",
              }
            : item,
        );
      });
    } catch (error: any) {
      updateCollection(target, (items) =>
        items.filter((item) => item.clientId !== clientId),
      );
      revokePreviewUrl(placeholder);
      setSubmitError(error?.data?.message || "Failed to upload media");
    }
  };

  const handleRemoveMedia = (
    target: "question" | "answer",
    clientId: string,
  ) => {
    updateCollection(target, (items) => {
      const mediaToRemove = items.find((item) => item.clientId === clientId);
      if (mediaToRemove?.uploadStatus === "uploading") {
        removedUploadIdsRef.current.add(clientId);
      }
      revokePreviewUrl(mediaToRemove);
      return items.filter((item) => item.clientId !== clientId);
    });
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

  const handleAddLink = (target: "question" | "answer") => {
    const rawValue =
      target === "question" ? questionLinkInput : answerLinkInput;
    const trimmedUrl = rawValue.trim();

    if (!trimmedUrl) return;

    let normalizedUrl = trimmedUrl;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      setSubmitError("Enter a valid asset URL.");
      return;
    }

    const linkedMedia: EditableMediaItem = {
      ...buildLinkedMediaItem(normalizedUrl),
      clientId: toClientId(),
      uploadStatus: "uploaded",
    };

    updateCollection(target, (items) => [...items, linkedMedia]);
    setSubmitError(null);

    if (target === "question") {
      setQuestionLinkInput("");
      return;
    }

    setAnswerLinkInput("");
  };

  const handleAddOption = () => {
    if (!optionText.trim()) return;

    const nextOptionId = String.fromCharCode(97 + options.length);
    setOptions((items) => [
      ...items,
      {
        optionText: optionText.trim(),
        optionId: nextOptionId,
      },
    ]);
    setCorrectAnswer((current) => current || nextOptionId);
    setOptionText("");
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

    if (isUploadingMedia) {
      setSubmitError("Please wait for all uploads to finish.");
      return;
    }

    const cleanQuestionAssets = sanitizeMediaItems(questionAssets);
    const cleanAnswerMedia = sanitizeMediaItems(answerMedia);

    const payload: CreateQuestionPayload = {
      questionText: questionText.trim(),
      score: Number.isFinite(Number(score)) ? Number(score) : 0,
      folder,
      keepBuzzer,
      hideFromUsers,
      questionContent: {
        text: questionText.trim() || undefined,
        media: cleanQuestionAssets,
      },
      questionAssets: cleanQuestionAssets,
      answerContent: {
        text: answerText.trim() || undefined,
        media: cleanAnswerMedia,
      },
    };

    const firstQuestionMedia = cleanQuestionAssets[0];
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
      payload.options = options.map((opt, index) => ({
        optionId: opt.optionId || String.fromCharCode(97 + index),
        optionText: opt.optionText,
      }));
      payload.correctAnswer =
        correctAnswer ||
        payload.options[0]?.optionId ||
        String.fromCharCode(97);
    }

    try {
      if (mode === "edit" && initialQuestion?._id) {
        await updateQuestion({
          questionId: initialQuestion._id,
          payload,
        }).unwrap();
      } else {
        await createQuestion(payload).unwrap();
      }

      onSaved();
      onClose();
    } catch (error: any) {
      setSubmitError(
        error?.data?.message ||
          (mode === "edit"
            ? "Failed to update question"
            : "Failed to create question"),
      );
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          {mode === "edit" ? "Edit Question" : "Create New Question"}
        </DialogTitle>
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

            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                gap: 1,
                maxWidth: "100%",
                width: "100%",
              }}
            >
              <MediaUploadField
                label="Upload Question Media"
                mediaItems={questionAssets}
                onUpload={(file) => handleUpload(file, "question")}
                onRemove={(clientId) => handleRemoveMedia("question", clientId)}
                onPreview={setPreviewMedia}
                isUploading={isUploadingMedia}
                accept="image/*,video/*,audio/*"
              />
              <Box sx={{ gap: 1, display: "flex", flexDirection: "row" }}>
                <TextField
                  // fullWidth
                  style={{ width: "100%" }}
                  label="Question Asset Link (optional)"
                  placeholder="https://..."
                  value={questionLinkInput}
                  onChange={(e) => setQuestionLinkInput(e.target.value)}
                />
                <Button
                  sx={{ height: "fit-content", width: "200px" }}
                  variant="outlined"
                  onClick={() => handleAddLink("question")}
                >
                  Add Link
                </Button>
              </Box>
            </Box>

            <TextField
              label="Answer"
              multiline
              minRows={2}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
            />
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                gap: 1,
                maxWidth: "100%",
                width: "100%",
              }}
            >
              <MediaUploadField
                label="Upload Answer Media"
                mediaItems={answerMedia}
                onUpload={(file) => handleUpload(file, "answer")}
                onRemove={(clientId) => handleRemoveMedia("answer", clientId)}
                onPreview={setPreviewMedia}
                isUploading={isUploadingMedia}
              />

              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  label="Answer Asset Link (optional)"
                  placeholder="https://..."
                  value={answerLinkInput}
                  onChange={(e) => setAnswerLinkInput(e.target.value)}
                />
                <Button
                  sx={{ height: "fit-content", width: "200px" }}
                  variant="outlined"
                  onClick={() => handleAddLink("answer")}
                >
                  Add Link
                </Button>
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

            <FormControlLabel
              control={
                <Switch
                  checked={hideFromUsers}
                  onChange={(e) => setHideFromUsers(e.target.checked)}
                />
              }
              label="Hide Question From User Screens"
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
                  <Chip
                    key={`${opt.optionText}-${idx}`}
                    label={`${opt.optionId || String.fromCharCode(97 + idx)}. ${opt.optionText}`}
                    color={
                      correctAnswer === opt.optionId ? "primary" : "default"
                    }
                    onClick={() => setCorrectAnswer(opt.optionId || "")}
                  />
                ))}
              </Box>
            )}

            {!!options.length && (
              <Typography variant="caption" color="text.secondary">
                Tap an option chip to mark it as the correct answer.
              </Typography>
            )}

            <TextField
              select
              label="Folder"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
            >
              {folders.map((folderName) => (
                <MenuItem key={folderName} value={folderName}>
                  {formatFolderLabel(folderName)}
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
            disabled={isCreating || isUpdating || isUploadingMedia}
          >
            {isCreating || isUpdating
              ? mode === "edit"
                ? "Saving..."
                : "Creating..."
              : mode === "edit"
                ? "Save Changes"
                : "Create Question"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(previewMedia)}
        onClose={() => setPreviewMedia(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Media Preview</DialogTitle>
        <DialogContent>
          {previewMedia && (
            <Box sx={{ mt: 1 }}>
              {(previewMedia.type === "image" ||
                previewMedia.type === "gif") && (
                <Box
                  component="img"
                  src={previewMediaSource(previewMedia)}
                  alt={previewMedia.name || "Preview"}
                  sx={{
                    width: "100%",
                    maxHeight: "70vh",
                    objectFit: "contain",
                    borderRadius: 2,
                  }}
                />
              )}

              {previewMedia.type === "video" && (
                <Box
                  component="video"
                  src={previewMediaSource(previewMedia)}
                  controls
                  sx={{ width: "100%", borderRadius: 2 }}
                />
              )}

              {previewMedia.type === "audio" && (
                <Box
                  component="audio"
                  src={previewMediaSource(previewMedia)}
                  controls
                  sx={{ width: "100%" }}
                />
              )}

              {previewMedia.type === "file" && (
                <SmartMedia
                  media={previewMedia}
                  alt={previewMedia.name || "Preview"}
                  sx={{
                    width: "100%",
                    maxHeight: "70vh",
                    objectFit: "contain",
                    borderRadius: 2,
                  }}
                  audioSx={{ width: "100%" }}
                  iframeSx={{ minHeight: 520 }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewMedia(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QuestionEditorDialog;
