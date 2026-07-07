import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { DashboardHeaderProps } from "../types/interfaces";
import { useAdminAuth } from "../services/useAdminAuth";
import LogoutIcon from "@mui/icons-material/Logout";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import SettingsRemoteIcon from "@mui/icons-material/SettingsRemote";
import GroupIcon from "@mui/icons-material/Group";
import QuizIcon from "@mui/icons-material/Quiz";
import EditIcon from "@mui/icons-material/Edit";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ListIcon from "@mui/icons-material/List";
import BrandingWatermarkIcon from "@mui/icons-material/BrandingWatermark";
import {
  useAdminLogoutMutation,
  useUpdateNumberOfTeamsMutation,
} from "../services/admin.Api";
import GlobalButton from "../../../components/ui/button";
import { useAppDispatch, useAppSelector } from "../../../app/rootReducer";
import { RootState } from "../../../app/store";
import { clearAdmin } from "../services/adminSlice";
import CurrentQuestionsModal from "./CurrentQuestionsModal";
import SessionBrandingModal from "./SessionBrandingModal";

// Dashboard Header Component
const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  data,
  onGameStatusChange,
  onTransactionsChange,
  transaction = false,
  hasQuestions = true,
  selectedQuestionIds = [],
  questionLookup = new Map(),
  onSaveQuestions,
  onEditQuestion,
}) => {
  const [AdminLogout] = useAdminLogoutMutation();
  const [UpdateNumberOfTeams] = useUpdateNumberOfTeamsMutation();
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const { sessionId } = useAppSelector((state: RootState) => state.session);
  const CurretQuestionIndex = useAppSelector(
    (state: RootState) => state.gameState.gameState?.currentQuestionIndex,
  );
  const isGameNotStarted =
    (CurretQuestionIndex ?? -1) === -1 || (data?.currentQuestion ?? 0) === 0;
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Color options constant
  const COLOR_OPTIONS = [
    { id: 1, label: "Red" },
    { id: 2, label: "Green" },
    { id: 3, label: "Blue" },
    { id: 4, label: "Yellow" },
    { id: 5, label: "Orange" },
    { id: 6, label: "White" },
    { id: 7, label: "Pink" },
    { id: 8, label: "Purple" },
    { id: 9, label: "Maroon" },
    { id: 10, label: "Light Blue" },
    { id: 11, label: "Silver" },
    { id: 12, label: "Brown" },
    { id: 13, label: "Indigo" },
    { id: 14, label: "Olive Green" }
  ];

  // State for edit teams modal
  const [editTeamsModal, setEditTeamsModal] = useState<{
    open: boolean;
    value: string;
    mode: "NUMBER" | "COLOR";
    colors: number[];
  }>({
    open: false,
    value: "",
    mode: "NUMBER",
    colors: [],
  });

  // State for current questions modal
  const [currentQuestionsModalOpen, setCurrentQuestionsModalOpen] =
    useState(false);

  // State for session branding modal
  const [brandingModalOpen, setBrandingModalOpen] = useState(false);
  const sessionData = useAppSelector((state: RootState) => state.session.session);

  const handleLogout = () => {
    AdminLogout({})
      .unwrap()
      .then(() => {
        navigate(`/admin/${sessionId}/login`);
        dispatch(clearAdmin());
      })
      .catch((error) => {
        console.error("Logout failed:", error);
      });
  };

  const handleRemoteControl = () => {
    window.open(`/admin/${sessionId}/remote-control`, "_blank");
  };

  const handlePresenterView = () => {
    // Open presenter view in new window for dual-screen setup
    const presenterUrl = `/admin/${sessionId}/presenter`;
    window.open(presenterUrl, "_blank");
  };

  // Handle edit teams modal
  const handleEditTeamsClick = () => {
    setEditTeamsModal({
      open: true,
      value: data?.totalTeams?.toString() || "",
      mode: data?.teamMode || "NUMBER",
      colors: data?.colorTeams || [],
    });
  };

  const handleCloseTeamsModal = () => {
    setEditTeamsModal({
      open: false,
      value: "",
      mode: "NUMBER",
      colors: [],
    });
  };

  const handleSaveNumberOfTeams = () => {
    const numberOfTeams = parseInt(editTeamsModal.value);
    const mode = editTeamsModal.mode;
    const colors = editTeamsModal.colors;

    if (mode === "NUMBER" && (isNaN(numberOfTeams) || numberOfTeams < 1)) {
      return;
    }
    
    if (mode === "COLOR" && colors.length === 0) {
      return;
    }

    UpdateNumberOfTeams({ 
      numberOfTeams: mode === "COLOR" ? colors.length : numberOfTeams, 
      teamMode: mode, 
      colorTeams: colors 
    } as any)
      .unwrap()
      .then(() => {
        handleCloseTeamsModal();
      })
      .catch((error: any) => {
        console.error("Failed to update number of teams:", error);
      });
  };

  const handleOpenQuestionLibrary = () => {
    window.open(`/admin/${sessionId}/questions`, "_blank");
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        px={isMobile ? 2 : 4}
        py={2}
      >
        <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
          Admin Dashboard
        </Typography>

        <Box display="flex" gap={1} alignItems="center">
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ListIcon />}
            onClick={() => setCurrentQuestionsModalOpen(true)}
            disabled={(selectedQuestionIds?.length || 0) === 0}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 500,
              minWidth: isMobile ? "auto" : "fit-content",
            }}
          >
            <Box
              sx={{
                display: { xs: "none", sm: "inline" },
              }}
            >
              Current Questions
            </Box>
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            startIcon={<SettingsRemoteIcon />}
            onClick={handleRemoteControl}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 500,
              minWidth: isMobile ? "auto" : "fit-content",
            }}
          >
            <Box
              sx={{
                display: { xs: "none", sm: "inline" },
              }}
            >
              Remote Control
            </Box>
          </Button>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<SlideshowIcon />}
            onClick={handlePresenterView}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 500,
              minWidth: isMobile ? "auto" : "fit-content",
            }}
          >
            <Box
              sx={{
                display: { xs: "none", sm: "inline" },
              }}
            >
              Presenter View
            </Box>
          </Button>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<BrandingWatermarkIcon />}
            onClick={() => setBrandingModalOpen(true)}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 500,
              minWidth: isMobile ? "auto" : "fit-content",
            }}
          >
            <Box
              sx={{
                display: { xs: "none", sm: "inline" },
              }}
            >
              Session Branding
            </Box>
          </Button>

          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              border: "1px solid #FF6363",
              fontWeight: 500,
              color: "#FF6363",
              minWidth: isMobile ? "auto" : "fit-content",
            }}
          >
            <Box
              sx={{
                display: { xs: "none", sm: "inline" },
              }}
            >
              Log Out
            </Box>
          </Button>
        </Box>
      </Box>

      {/* Main Header Section */}
      <Paper
        sx={{
          p: isMobile ? 2 : 3,
          px: isMobile ? 2 : 4,
          mb: 2,
          backgroundColor: "rgba(252, 166, 30, 0.10)",
          dropShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Admin Name */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant={isMobile ? "h5" : "h3"}
            fontWeight="bold"
            color="black"
            textAlign={"center"}
          >
            {admin?.name || data?.adminName || "Admin"}
          </Typography>
        </Box>

        {/* Session Information */}
        {(data?.sessionName ||
          data?.teamsRegistered !== undefined ||
          data?.currentQuestion !== undefined) && (
          <>
            <Box sx={{ mb: 3 }}>
              <Box
                display="flex"
                flexDirection={isMobile ? "column" : "row"}
                gap={isMobile ? 2 : 4}
                justifyContent="space-around"
              >
                {data?.sessionName && (
                  <Box textAlign="center" flex={1}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Session Name
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {data.sessionName}
                    </Typography>
                  </Box>
                )}

                {data?.teamsRegistered !== undefined && (
                  <Box textAlign="center" flex={1}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Teams Registered
                    </Typography>
                    <Box
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      gap={1}
                    >
                      <GroupIcon color="primary" />
                      <Typography variant="h6" fontWeight="bold">
                        {data.teamsRegistered}
                        {data.totalTeams ? ` / ${data.totalTeams}` : ""}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={handleEditTeamsClick}
                        color="primary"
                        sx={{ ml: 0.5 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                )}

                {data?.currentQuestion !== undefined && (
                  <Box textAlign="center" flex={1}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Current Question
                    </Typography>
                    <Box
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      gap={1}
                    >
                      <QuizIcon color="primary" />
                      <Typography variant="h6" fontWeight="bold">
                        {data.currentQuestion}
                        {data.totalQuestions ? ` / ${data.totalQuestions}` : ""}
                      </Typography>
                      <Tooltip title="Add Questions">
                        <IconButton
                          size="small"
                          onClick={handleOpenQuestionLibrary}
                          color="primary"
                          sx={{ ml: 0.5 }}
                        >
                          <AddCircleOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                )}
                {/* Game Status Chip */}
                <Box textAlign="center" flex={1}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Status
                  </Typography>
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    gap={1}
                  >
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color={
                        data?.gameStatus === "playing"
                          ? "success"
                          : data?.gameStatus === "paused"
                            ? "warning"
                            : "default"
                      }
                    >
                      {(() => {
                        const raw = data?.gameStatus || "idle";
                        const spaced = raw
                          .replace(/[_-]/g, " ")
                          .replace(/([a-z])([A-Z])/g, "$1 $2");
                        return spaced
                          .split(" ")
                          .filter(Boolean)
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ");
                      })()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
          </>
        )}

        {/* Action Buttons */}
        <Box
          sx={{
            display: "flex",
            gap: isMobile ? 1 : 2,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: isMobile ? "center" : "flex-start",
          }}
        >
          {isGameNotStarted && (
            <Box>
              <GlobalButton
                fullWidth={isMobile}
                disabled={!hasQuestions}
                onClick={() => {
                  if (onGameStatusChange) onGameStatusChange();
                }}
              >
                Start Game
              </GlobalButton>
              {!hasQuestions && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  Add questions to this session before starting the game.
                </Typography>
              )}
            </Box>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={transaction}
                onChange={(e) => onTransactionsChange?.(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                Enable Transactions
              </Typography>
            }
            sx={{
              ml: isMobile ? 0 : 1,
              mt: isMobile ? 1 : 0,
            }}
          />
        </Box>
      </Paper>

      {/* Edit Number of Teams Modal */}
      <Dialog
        open={editTeamsModal.open}
        onClose={handleCloseTeamsModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Number of Teams</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Team Mode
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Button
                variant={editTeamsModal.mode === "NUMBER" ? "contained" : "outlined"}
                onClick={() => setEditTeamsModal({ ...editTeamsModal, mode: "NUMBER" })}
              >
                Number Mode
              </Button>
              <Button
                variant={editTeamsModal.mode === "COLOR" ? "contained" : "outlined"}
                onClick={() => setEditTeamsModal({ ...editTeamsModal, mode: "COLOR" })}
              >
                Color Mode
              </Button>
            </Box>

            {editTeamsModal.mode === "NUMBER" ? (
              <TextField
                autoFocus
                fullWidth
                label="Number of Teams"
                type="number"
                value={editTeamsModal.value}
                onChange={(e) =>
                  setEditTeamsModal({ ...editTeamsModal, value: e.target.value })
                }
                inputProps={{ min: 1 }}
              />
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Select colors to create teams for
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {COLOR_OPTIONS.map((color) => {
                    const isSelected = editTeamsModal.colors.includes(color.id);
                    return (
                      <Button
                        key={color.id}
                        variant={isSelected ? "contained" : "outlined"}
                        color={isSelected ? "primary" : "inherit"}
                        size="small"
                        onClick={() => {
                          const newColors = isSelected
                            ? editTeamsModal.colors.filter((c) => c !== color.id)
                            : [...editTeamsModal.colors, color.id];
                          setEditTeamsModal({ ...editTeamsModal, colors: newColors });
                        }}
                      >
                        {color.label}
                      </Button>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTeamsModal}>Cancel</Button>
          <Button
            onClick={handleSaveNumberOfTeams}
            variant="contained"
            color="primary"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <CurrentQuestionsModal
        open={currentQuestionsModalOpen}
        onClose={() => setCurrentQuestionsModalOpen(false)}
        selectedQuestionIds={selectedQuestionIds}
        questionLookup={questionLookup}
        onSave={onSaveQuestions || (async () => {})}
        onEdit={onEditQuestion || (() => {})}
      />

      {/* Session Branding Modal */}
      <SessionBrandingModal
        open={brandingModalOpen}
        onClose={() => setBrandingModalOpen(false)}
        initialCompanyName={sessionData?.companyName || ""}
        initialCompanyLogo={sessionData?.companyLogo || ""}
      />
    </>
  );
};

export default DashboardHeader;
