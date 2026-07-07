import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
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
} from "@mui/material";
import {
  Close as CloseIcon,
  TouchApp as TouchIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { TeamMember } from "../types/interfaces";

interface TeamMembersModalProps {
  open: boolean;
  onClose: () => void;
  teamName: string;
  teamNumber: number;
  members: TeamMember[];
}

const TeamMembersModal: React.FC<TeamMembersModalProps> = ({
  open,
  onClose,
  teamName,
  teamNumber,
  members = [],
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const buzzerPerson = members.find((m) => m.role === "BUZZER_PERSON");
  const teamMembersList = members.filter((m) => m.role === "TEAM_MEMBER");

  return (
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
              🚨 Buzzer Person
            </Typography>
            {buzzerPerson ? (
              <List disablePadding>
                <ListItem disableGutters>
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
                No Buzzer Person has joined yet.
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
                    <ListItem disableGutters>
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
  );
};

export default TeamMembersModal;
