import {
  Avatar,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import React from "react";
import Loader from "../../../components/ui/Loader";

interface PlayerResponse {
  questionId: string;
  keyAspect: string;
  questionText: string;
  response: string;
}

interface Player {
  id: string;
  name: string;
  profilePhoto?: string;
  score: number;
}

interface PlayerResponsesModalProps {
  open: boolean;
  onClose: () => void;
  playerWithResponses: {
    player: Player;
    responses: PlayerResponse[];
  } | null;
  loading?: boolean;
}

const PlayerResponsesModal: React.FC<PlayerResponsesModalProps> = ({
  open,
  onClose,
  playerWithResponses,
  loading = false,
}) => {
  const getRowColor = (index: number) =>
    index % 2 === 0 ? "#11111108" : "#11111100";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 2,
          pb: 3,
          maxHeight: { xs: "98vh", md: "90vh" },
          width: {
            xs: "98vw", // phones
            sm: "95vw", // tablets
            md: "85vw", // small desktops
            lg: "75vw", // large desktops
            xl: "65vw", // very large screens
          },
          maxWidth: "none", // disables default maxWidth (like 'sm', 'md', etc.)
          m: { xs: 1, md: 4 },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 2,
          px: { xs: 3, sm: 3 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {playerWithResponses?.player.profilePhoto && (
            <Avatar
              src={playerWithResponses.player.profilePhoto}
              alt={playerWithResponses.player.name}
              sx={{ width: 100, height: 100 }}
            />
          )}
          <Box>
            <Typography
              variant="h6"
              component="div"
              sx={{ fontSize: { xs: 18, sm: 22 } }}
            >
              {playerWithResponses?.player.name || "Player Responses"}
            </Typography>
            {playerWithResponses?.player.score !== undefined && (
              <Typography variant="body2" color="text.secondary">
                Score: {playerWithResponses.player.score}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Loader />
          </Box>
        ) : playerWithResponses?.responses?.length ? (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 0,
              maxHeight: { xs: "70vh", sm: "90vh" },
              overflow: "auto",
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      backgroundColor: "#f5f5f5",
                      fontSize: { xs: 12, sm: 14 },
                    }}
                  >
                    Key Aspect
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      backgroundColor: "#f5f5f5",
                      fontSize: { xs: 12, sm: 14 },
                    }}
                  >
                    Question
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      backgroundColor: "#f5f5f5",
                      fontSize: { xs: 12, sm: 14 },
                    }}
                  >
                    Response
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {playerWithResponses.responses.map((response, index) => (
                  <TableRow
                    key={response.questionId}
                    sx={{ backgroundColor: getRowColor(index) }}
                  >
                    <TableCell
                      sx={{
                        fontWeight: "medium",
                        verticalAlign: "top",
                        fontSize: { xs: 12, sm: 14 },
                      }}
                    >
                      {response.keyAspect}
                    </TableCell>
                    <TableCell
                      sx={{
                        verticalAlign: "top",
                        fontSize: { xs: 12, sm: 14 },
                      }}
                    >
                      {response.questionText}
                    </TableCell>
                    <TableCell
                      sx={{
                        verticalAlign: "top",
                        fontSize: { xs: 12, sm: 14 },
                        wordBreak: "break-word",
                        maxWidth: { xs: 120, sm: 300 },
                      }}
                    >
                      {response.response}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography color="text.secondary">
              No responses found for this player.
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PlayerResponsesModal;
