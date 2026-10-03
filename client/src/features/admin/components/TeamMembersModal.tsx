import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
  Stack,
  Divider,
  useMediaQuery,
  useTheme,
  Paper,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  List,
  Button,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Close as CloseIcon,
  TouchApp as TouchIcon,
  Person as PersonIcon,
  PersonRemove as PersonRemoveIcon,
} from "@mui/icons-material";
import { TeamMember } from "../types/interfaces";
import { useKickoutMemberMutation } from "../services/admin.Api";

interface TeamMembersModalProps {
  open: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  teamNumber: number;
  members: TeamMember[];
}

const TeamMembersModal: React.FC<TeamMembersModalProps> = ({
  open,
  onClose,
  teamId,
  teamName,
  teamNumber,
  members = [],
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [kickoutMember, { isLoading: isKicking }] = useKickoutMemberMutation();

  const [confirmKickDialog, setConfirmKickDialog] = useState<{
    open: boolean;
    playerName: string;
  }>({
    open: false,
    playerName: "",
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const buzzerPerson = members.find((m) => m.role === "BUZZER_PERSON");
  const teamMembersList = members.filter((m) => m.role === "TEAM_MEMBER");

  const handleOpenKickConfirm = (playerName: string) => {
    setConfirmKickDialog({
      open: true,
      playerName,
    });
  };

  const handleCloseKickConfirm = () => {
    setConfirmKickDialog({
      open: false,
      playerName: "",
    });
  };

  const handleExecuteKick = async () => {
    const playerName = confirmKickDialog.playerName;
    if (!playerName || !teamId) return;

    try {
      await kickoutMember({
        teamId,
        playerName,
      }).unwrap();

      setSnackbar({
        open: true,
        message: `Player "${playerName}" has been kicked out.`,
        severity: "success",
      });
      handleCloseKickConfirm();

      // If this was the only member, close the modal
      if (members.length <= 1) {
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err?.data?.message || "Failed to kick out player.",
        severity: "error",
      });
      handleCloseKickConfirm();
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : "16px",
            overflow: "hidden",
          },
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: theme.palette.primary.main,
            color: "white",
            py: 2,
          }}
        >
          <Box>
            <Typography variant="h6" component="div" sx={{ color: "white", fontWeight: "bold" }}>
              Team #{teamNumber} - {teamName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, color: "white" }}>
              {members.length} Total Player{members.length === 1 ? "" : "s"} Joined
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, backgroundColor: "#f9f9f9" }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Buzzer Person Section */}
            <Paper elevation={1} sx={{ p: 2, borderRadius: "12px" }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontWeight: "bold", mb: 1, textTransform: "uppercase" }}
              >
                👑 Team Captain / Buzzer Person
              </Typography>
              {buzzerPerson ? (
                <List disablePadding>
                  <ListItem
                    disableGutters
                    secondaryAction={
                      <Tooltip title={`Kick out ${buzzerPerson.name}`}>
                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => handleOpenKickConfirm(buzzerPerson.name)}
                          disabled={isKicking}
                          sx={{
                            backgroundColor: "rgba(239, 68, 68, 0.08)",
                            "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.2)" },
                          }}
                        >
                          <PersonRemoveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                        <TouchIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight="bold">
                          {buzzerPerson.name}
                        </Typography>
                      }
                      secondary={`Joined at: ${new Date(buzzerPerson.joinedAt).toLocaleTimeString()}`}
                    />
                  </ListItem>
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", py: 1 }}>
                  No Team Captain / Buzzer Person has joined yet.
                </Typography>
              )}
            </Paper>

            {/* Team Members Section */}
            <Paper elevation={1} sx={{ p: 2, borderRadius: "12px" }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontWeight: "bold", mb: 1, textTransform: "uppercase" }}
              >
                👥 Team Members ({teamMembersList.length})
              </Typography>
              {teamMembersList.length > 0 ? (
                <List disablePadding>
                  {teamMembersList.map((member, index) => (
                    <React.Fragment key={member.name}>
                      <ListItem
                        disableGutters
                        secondaryAction={
                          <Tooltip title={`Kick out ${member.name}`}>
                            <IconButton
                              edge="end"
                              color="error"
                              onClick={() => handleOpenKickConfirm(member.name)}
                              disabled={isKicking}
                              sx={{
                                backgroundColor: "rgba(239, 68, 68, 0.08)",
                                "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.2)" },
                              }}
                            >
                              <PersonRemoveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: theme.palette.primary.light }}>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body1" fontWeight="medium">
                              {member.name}
                            </Typography>
                          }
                          secondary={`Joined at: ${new Date(member.joinedAt).toLocaleTimeString()}`}
                        />
                      </ListItem>
                      {index < teamMembersList.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", py: 1 }}>
                  No Team Members have joined yet.
                </Typography>
              )}
            </Paper>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmKickDialog.open}
        onClose={handleCloseKickConfirm}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px", p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: "bold", color: theme.palette.error.main }}>
          Kick Out Player?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to kick out <strong>{confirmKickDialog.playerName}</strong> from <strong>Team #{teamNumber} ({teamName})</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            The player will be immediately logged out and disconnected from the game session.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseKickConfirm} disabled={isKicking} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleExecuteKick}
            variant="contained"
            color="error"
            disabled={isKicking}
            startIcon={isKicking ? <CircularProgress size={16} color="inherit" /> : <PersonRemoveIcon />}
          >
            {isKicking ? "Kicking..." : "Kick Out"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default TeamMembersModal;
