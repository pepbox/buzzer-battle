import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  Chip,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WarningIcon from "@mui/icons-material/Warning";

interface PendingPlayer {
  id: string;
  name: string;
  team: number;
  questionsAnswered: string;
}

interface ForceStartModalProps {
  open: boolean;
  onClose: () => void;
  onWait: () => void;
  onForceStart: () => void;
  pendingPlayers: PendingPlayer[];
  totalPlayers: number;
}

const ForceStartModal: React.FC<ForceStartModalProps> = ({
  open,
  onClose,
  onWait,
  onForceStart,
  pendingPlayers,
  totalPlayers,
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            Some Players Haven't Completed Questions
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {pendingPlayers.length} out of {totalPlayers} players haven't completed all questions yet:
        </Typography>
        
        <List sx={{ maxHeight: 300, overflow: "auto" }}>
          {pendingPlayers.map((player) => (
            <ListItem
              key={player.id}
              sx={{
                border: "1px solid #e0e0e0",
                borderRadius: 1,
                mb: 1,
                backgroundColor: "#f9f9f9",
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {player.name}
                    </Typography>
                    <Chip
                      label={`Team ${player.team}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    Questions Answered: {player.questionsAnswered}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>

        <Box sx={{ mt: 2, p: 2, backgroundColor: "#fff3cd", borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Wait:</strong> Give players more time to complete their questions.
            <br />
            <strong>Force Start:</strong> Start the game immediately, even if some players haven't finished.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          onClick={onWait} 
          variant="outlined" 
          color="primary"
          size="large"
        >
          Wait for Players
        </Button>
        <Button
          onClick={onForceStart}
          variant="contained"
          color="warning"
          size="large"
        >
          Force Start Game
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ForceStartModal;
