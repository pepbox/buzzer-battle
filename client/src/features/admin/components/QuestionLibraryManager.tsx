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
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Typography,
  InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListIcon from "@mui/icons-material/FilterList";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchIcon from "@mui/icons-material/Search";
import ViewListIcon from "@mui/icons-material/ViewList";
import {
  QuestionBankItem,
  useCreateQuestionFolderMutation,
  useDeleteQuestionFolderMutation,
  useDeleteQuestionMutation,
  useFetchQuestionBankQuery,
  useFetchQuestionFoldersQuery,
  useRenameQuestionFolderMutation,
  useUpdateSessionQuestionsMutation,
} from "../services/admin.Api";
import { useFetchSessionQuery } from "../../session/services/session.api";
import QuestionCard from "./QuestionCard";
import QuestionEditorDialog from "./QuestionEditorDialog";
import QuestionPreviewModal from "./QuestionPreviewModal";

type SortOrder = "newest" | "oldest";

interface FolderTreeNode {
  label: string;
  path: string;
  depth: number;
  children: FolderTreeNode[];
}

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
  const [createSubfolderDialog, setCreateSubfolderDialog] = useState<{
    open: boolean;
    parentPath: string | null;
    name: string;
  }>({
    open: false,
    parentPath: null,
    name: "",
  });
  const [folderMenuAnchorEl, setFolderMenuAnchorEl] =
    useState<null | HTMLElement>(null);
  const [folderMenuTarget, setFolderMenuTarget] = useState<string | null>(null);
  const [folderActionDialog, setFolderActionDialog] = useState<{
    open: boolean;
    mode: "rename" | "delete" | null;
    folderPath: string;
    value: string;
  }>({
    open: false,
    mode: null,
    folderPath: "",
    value: "",
  });
  const [folderActionLoading, setFolderActionLoading] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<
    Record<string, boolean>
  >({});

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
  const [createQuestionFolder, { isLoading: isCreatingFolder }] =
    useCreateQuestionFolderMutation();
  const [renameQuestionFolder] = useRenameQuestionFolderMutation();
  const [deleteQuestionFolder] = useDeleteQuestionFolderMutation();

  const folders = useMemo(() => {
    const apiFolders = foldersResponse?.data?.folders || [];
    return [
      "all",
      ...apiFolders.filter((folder) => folder.toLowerCase() !== "all"),
    ];
  }, [foldersResponse]);

  const questionBank = questionBankResponse?.data?.questions || [];
  const totalQuestions =
    questionBankResponse?.data?.pagination?.total ?? questionBank.length;
  const visibleQuestionsCount = questionBank.length;
  const currentSessionQuestionIds = sessionResponse?.data?.questions || [];
  const folderPaths = folders.filter((folder) => folder !== "all");
  const selectedQuestionsCount = selectedQuestionIds.length;

  const getFolderLeaf = (folderPath: string) => {
    const segments = folderPath.split("/").filter(Boolean);
    return segments[segments.length - 1] || folderPath;
  };

  const getParentPath = (folderPath: string) => {
    const segments = folderPath.split("/").filter(Boolean);
    return segments.slice(0, -1).join("/");
  };

  const buildFolderPath = (parentPath: string, name: string) =>
    parentPath ? `${parentPath}/${name}` : name;

  const folderTree = useMemo<FolderTreeNode[]>(() => {
    const nodeMap = new Map<string, FolderTreeNode>();
    const rootNodes: FolderTreeNode[] = [];

    folderPaths.forEach((path) => {
      const segments = path.split("/").filter(Boolean);
      const label = segments[segments.length - 1] || path;
      const parentPath = segments.slice(0, -1).join("/");
      const node: FolderTreeNode = {
        label,
        path,
        depth: Math.max(0, segments.length - 1),
        children: [],
      };

      nodeMap.set(path, node);

      if (!parentPath) {
        rootNodes.push(node);
        return;
      }

      const parentNode = nodeMap.get(parentPath);
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    const sortNodes = (nodes: FolderTreeNode[]) => {
      nodes.sort((a, b) => a.label.localeCompare(b.label));
      nodes.forEach((node) => sortNodes(node.children));
    };

    sortNodes(rootNodes);
    return rootNodes;
  }, [folderPaths]);

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

  useEffect(() => {
    setCollapsedFolders((current) => {
      let hasChanges = false;
      const next = { ...current };
      folderTree.forEach((node) => {
        if (!(node.path in next)) {
          next[node.path] = false;
          hasChanges = true;
        }
      });
      return hasChanges ? next : current;
    });
  }, [folderTree]);

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

  const handleCreateSubfolder = async () => {
    const trimmedName = createSubfolderDialog.name.trim();
    if (!trimmedName) return;

    setActionError(null);
    try {
      const response = await createQuestionFolder({
        name: trimmedName,
        parentPath: createSubfolderDialog.parentPath || undefined,
      }).unwrap();
      await refetchFolders();
      setSelectedFolder(response.data.folder);
      setCreateSubfolderDialog({
        open: false,
        parentPath: null,
        name: "",
      });
    } catch (error: any) {
      setActionError(error?.data?.message || "Failed to create subfolder");
    }
  };

  const closeFolderMenu = () => {
    setFolderMenuAnchorEl(null);
    setFolderMenuTarget(null);
  };

  const handleOpenFolderMenu = (
    event: React.MouseEvent<HTMLElement>,
    folderPath: string,
  ) => {
    event.stopPropagation();
    setFolderMenuAnchorEl(event.currentTarget);
    setFolderMenuTarget(folderPath);
  };

  const handleOpenRenameFolder = () => {
    if (!folderMenuTarget) return;
    setFolderActionDialog({
      open: true,
      mode: "rename",
      folderPath: folderMenuTarget,
      value: getFolderLeaf(folderMenuTarget),
    });
    closeFolderMenu();
  };

  const handleOpenDeleteFolder = () => {
    if (!folderMenuTarget) return;
    setFolderActionDialog({
      open: true,
      mode: "delete",
      folderPath: folderMenuTarget,
      value: "",
    });
    closeFolderMenu();
  };

  const closeFolderActionDialog = () => {
    if (folderActionLoading) return;
    setFolderActionDialog({
      open: false,
      mode: null,
      folderPath: "",
      value: "",
    });
  };

  const handleFolderActionSave = async () => {
    if (!folderActionDialog.folderPath || !folderActionDialog.mode) return;

    const originalPath = folderActionDialog.folderPath;
    const trimmedValue = folderActionDialog.value.trim();
    const parentPath = getParentPath(originalPath);

    if (folderActionDialog.mode === "rename" && !trimmedValue) {
      return;
    }

    if (
      folderActionDialog.mode === "rename" &&
      buildFolderPath(parentPath, trimmedValue) === originalPath
    ) {
      closeFolderActionDialog();
      return;
    }

    setFolderActionLoading(true);
    setActionError(null);

    try {
      let nextBaseFolder = parentPath || "General";

      if (folderActionDialog.mode === "rename") {
        const response = await renameQuestionFolder({
          folderPath: originalPath,
          name: trimmedValue,
        }).unwrap();
        nextBaseFolder = response.data.folder;
      } else {
        const response = await deleteQuestionFolder({
          folderPath: originalPath,
        }).unwrap();
        nextBaseFolder = response.data.fallbackFolder;
      }

      const nextSelectedFolder =
        selectedFolder === originalPath
          ? folderActionDialog.mode === "delete"
            ? "all"
            : nextBaseFolder
          : selectedFolder.startsWith(`${originalPath}/`)
            ? folderActionDialog.mode === "delete"
              ? "all"
              : `${nextBaseFolder}${selectedFolder.slice(originalPath.length)}`
            : selectedFolder;

      setSelectedFolder(nextSelectedFolder);
      await refetchFolders();
      await refetchQuestions();
      closeFolderActionDialog();
    } catch (error: any) {
      setActionError(error?.data?.message || "Failed to update folder");
    } finally {
      setFolderActionLoading(false);
    }
  };

  const renderFolderNode = (node: FolderTreeNode) => (
    <React.Fragment key={node.path}>
      <ListItem disablePadding>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            pl: node.depth * 2,
            gap: 0.5,
          }}
        >
          {node.children.length > 0 ? (
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                setCollapsedFolders((current) => ({
                  ...current,
                  [node.path]: !current[node.path],
                }));
              }}
              sx={{ color: "text.secondary", p: 0.25 }}
            >
              {collapsedFolders[node.path] ? (
                <ChevronRightIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </IconButton>
          ) : (
            <Box sx={{ width: 26, flexShrink: 0 }} />
          )}
          <FolderOutlinedIcon sx={{ fontSize: 20, color: "text.secondary" }} />
          <ListItemButton
            selected={selectedFolder === node.path}
            onClick={() => setSelectedFolder(node.path)}
            sx={{
              borderRadius: 2,
              py: 1,
              px: 1.25,
              minWidth: 0,
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "rgba(0, 0, 0, 0.06)",
              },
            }}
          >
            <ListItemText
              primary={node.label}
              secondary={node.depth > 0 ? node.path : undefined}
              primaryTypographyProps={{ noWrap: true }}
              secondaryTypographyProps={{
                noWrap: true,
                sx: { fontSize: 11, color: "text.secondary" },
              }}
            />
          </ListItemButton>
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              setCreateSubfolderDialog({
                open: true,
                parentPath: node.path,
                name: "",
              });
            }}
            title={`Create subfolder inside ${node.label}`}
            sx={{ color: "text.secondary" }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(event) => handleOpenFolderMenu(event, node.path)}
            title={`Folder actions for ${node.label}`}
            sx={{ color: "text.secondary", mr: 0.5 }}
          >
            <MoreHorizIcon fontSize="small" />
          </IconButton>
        </Box>
      </ListItem>
      {!collapsedFolders[node.path] &&
        node.children.map((child) => renderFolderNode(child))}
    </React.Fragment>
  );

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 3 },
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        background: "#f5f7fb",
      }}
    >
      <Paper
        sx={{
          p: { xs: 1.5, md: 1 },
          borderRadius: 1.5,
          border: "1px solid rgba(15, 23, 42, 0.08)",
          boxShadow: "0 6px 24px rgba(15, 23, 42, 0.04)",
          backgroundColor: "#ffffff",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr auto 1fr" },
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box sx={{ justifySelf: { xs: "flex-start", md: "start" } }}>
            {showBackButton && onBack && (
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={onBack}
                variant="text"
                sx={{
                  px: 0,
                  fontWeight: 500,
                  color: "text.primary",
                  textTransform: "none",
                  fontSize: 16,
                  ml: 2,
                  boxShadow: "none",
                  "&:hover": {
                    boxShadow: "none",
                    backgroundColor: "transparent",
                  },
                }}
              >
                Back to dashboard
              </Button>
            )}
          </Box>

          <Typography
            variant="h5"
            sx={{
              justifySelf: "center",
              fontWeight: 500,
              color: "text.primary",
              textAlign: "center",
            }}
          >
            Question Library
          </Typography>

          <Box sx={{ justifySelf: "end" }} />
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
          overflow: "visible",
          borderRadius: 1,
          border: "1px solid rgba(15, 23, 42, 0.08)",
          boxShadow: "0 6px 24px rgba(15, 23, 42, 0.04)",
          backgroundColor: "#ffffff",
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <Box
          sx={{
            width: { xs: "100%", md: 330 },
            borderRight: { xs: "none", md: "1px solid" },
            borderBottom: { xs: "1px solid", md: "none" },
            borderColor: "divider",
            p: 2,
            alignSelf: { md: "flex-start" },
            position: { md: "sticky" },
            top: { md: 12 },
            backgroundColor: "#ffffff",
            zIndex: 1,
          }}
        >
          {/* <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 500 }}>
            Question Library
          </Typography> */}

          <Button
            fullWidth
            variant="contained"
            startIcon={<CreateNewFolderIcon />}
            onClick={() =>
              setCreateSubfolderDialog({
                open: true,
                parentPath: null,
                name: "",
              })
            }
            sx={{
              mb: 2,
              bgcolor: "rgba(0, 0, 0, 0.12)",
              color: "text.primary",
              boxShadow: "none",
              maxHeight: "48px",
              textTransform: "none",
              "&:hover": {
                bgcolor: "rgba(0, 0, 0, 0.16)",
                boxShadow: "none",
                transform: "translateY(0px)",
              },
            }}
          >
            Add new Library
          </Button>

          <List
            dense
            sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
          >
            {isFoldersLoading ? (
              <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <>
                <ListItem disablePadding sx={{ display: "block" }}>
                  <ListItemButton
                    selected={selectedFolder === "all"}
                    onClick={() => setSelectedFolder("all")}
                    sx={{
                      borderRadius: 2,
                      py: 1,
                    }}
                  >
                    <FolderOutlinedIcon
                      sx={{ fontSize: 20, mr: 1, color: "text.secondary" }}
                    />
                    <ListItemText
                      primary="All"
                      primaryTypographyProps={{ noWrap: true, fontWeight: 500 }}
                    />
                  </ListItemButton>
                </ListItem>
                {folderTree.map((node) => renderFolderNode(node))}
              </>
            )}
          </List>
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            p: { xs: 2, md: 2.5 },
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            backgroundColor: "#ffffff",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: { xs: "stretch", md: "center" },
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flexWrap: "wrap",
                flex: 1,
              }}
            >
              <TextField
                size="small"
                placeholder="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                sx={{
                  width: { xs: "100%", sm: 320 },
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1,
                    Height: "48px",
                    bgcolor: "#f1f1f1",
                    "& fieldset": {
                      borderColor: "#f1f1f1",
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                }}
              />
              <IconButton
                onClick={(e) => setSortAnchorEl(e.currentTarget)}
                sx={{
                  borderRadius: 2,
                  border: "1px solid rgba(15, 23, 42, 0.12)",
                }}
              >
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
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateModalOpen(true)}
              sx={{
                textTransform: "none",
                borderRadius: 1,
                maxHeight: "48px",
                boxShadow: "none",
                px: 3,
                minWidth: 220,
                "&:hover": {
                  boxShadow: "none",
                  transform: "translateY(0px)",
                },
              }}
            >
              Create new question
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Showing {visibleQuestionsCount} out of {totalQuestions} questions
          </Typography>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <FormControlLabel
              sx={{ mr: 0 }}
              control={
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  onChange={handleToggleVisibleQuestions}
                  sx={{
                    "& .MuiSvgIcon-root": {
                      borderRadius: "4px",
                    },
                  }}
                />
              }
              label="Select all"
            />
            <Typography
              variant="body2"
              color="text.primary"
              sx={{ ml: "auto" }}
            >
              Selected: {selectedQuestionsCount}
            </Typography>
          </Box>
          <Divider />

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
              <List
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  p: 0,
                }}
              >
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
          p: 2,
          borderRadius: 0,
          border: "1px solid rgba(15, 23, 42, 0.08)",
          boxShadow: "0 6px 24px rgba(15, 23, 42, 0.04)",
          backgroundColor: "#ffffff",
          position: "sticky",
          bottom: 0,
          zIndex: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          {showCurrentListButton && onOpenCurrentList && (
            <Button
              variant="outlined"
              startIcon={<ViewListIcon />}
              onClick={onOpenCurrentList}
              sx={{
                textTransform: "none",
                borderRadius: 1,
                maxHeight: "48px",
                minWidth: 220,
                boxShadow: "none",
                "&:hover": {
                  boxShadow: "none",
                  transform: "translateY(0px)",
                },
              }}
            >
              View selected questions
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleSaveQuestions}
            disabled={isSavingQuestions}
            sx={{
              textTransform: "none",
              borderRadius: 1,
              maxHeight: "48px",
              minWidth: 240,
              boxShadow: "none",
              "&:hover": {
                boxShadow: "none",
                transform: "translateY(0px)",
              },
            }}
          >
            {isSavingQuestions ? "Saving..." : "Save selected questions"}
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

      <Dialog
        open={createSubfolderDialog.open}
        onClose={() =>
          setCreateSubfolderDialog({ open: false, parentPath: null, name: "" })
        }
      >
        <DialogTitle>Create Subfolder</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Parent: {createSubfolderDialog.parentPath || "Root"}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Subfolder Name"
            value={createSubfolderDialog.name}
            onChange={(event) =>
              setCreateSubfolderDialog((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setCreateSubfolderDialog({
                open: false,
                parentPath: null,
                name: "",
              })
            }
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateSubfolder}
            disabled={isCreatingFolder}
          >
            {isCreatingFolder ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={folderMenuAnchorEl}
        open={Boolean(folderMenuAnchorEl)}
        onClose={closeFolderMenu}
      >
        <MenuItem onClick={handleOpenRenameFolder}>Rename folder</MenuItem>
        <MenuItem onClick={handleOpenDeleteFolder}>Delete folder</MenuItem>
      </Menu>

      <Dialog
        open={folderActionDialog.open}
        onClose={closeFolderActionDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {folderActionDialog.mode === "rename"
            ? "Rename Folder"
            : "Delete Folder"}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }} color="text.secondary">
            {folderActionDialog.mode === "rename"
              ? `Rename ${folderActionDialog.folderPath}`
              : `Delete ${folderActionDialog.folderPath}. Questions in this folder will move to ${
                  getParentPath(folderActionDialog.folderPath) || "General"
                }.`}
          </Typography>
          {folderActionDialog.mode === "rename" && (
            <TextField
              autoFocus
              fullWidth
              label="Folder name"
              value={folderActionDialog.value}
              onChange={(event) =>
                setFolderActionDialog((current) => ({
                  ...current,
                  value: event.target.value,
                }))
              }
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeFolderActionDialog}
            disabled={folderActionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={folderActionDialog.mode === "delete" ? "error" : "primary"}
            onClick={handleFolderActionSave}
            disabled={
              folderActionLoading ||
              (folderActionDialog.mode === "rename" &&
                !folderActionDialog.value.trim())
            }
          >
            {folderActionLoading
              ? folderActionDialog.mode === "rename"
                ? "Renaming..."
                : "Deleting..."
              : folderActionDialog.mode === "rename"
                ? "Rename"
                : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuestionLibraryManager;
