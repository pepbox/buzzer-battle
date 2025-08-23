import React from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayerLeaderboard from "./PlayerLeaderboard";
import SelfiesGallery from "./SelfiesGallery";
import { LeaderboardProps } from "../types/interfaces";
import { useAppSelector } from "../../../app/rootReducer";
import { RootState } from "../../../app/store";
import Loader from "../../../components/ui/Loader";

const Leaderboard: React.FC<LeaderboardProps> = ({ data, isLoading }) => {
  const navigate = useNavigate();
  const { sessionId } = useAppSelector((state: RootState) => state.game);

  const handleBackToDashboard = () => {
    navigate(`/admin/${sessionId}/dashboard`);
  };

  if (isLoading) {
    return <Loader />;
  }

  if (!data) {
    return (
      <Box sx={{ p: 4, textAlign: "center", my:"auto"}}>
        <Typography variant="h6" color="error">
          Failed to load leaderboard data
        </Typography>
        <Button
          variant="contained"
          onClick={handleBackToDashboard}
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          backgroundColor: "rgba(252, 166, 30, 0.10)",
          borderRadius: 0,
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToDashboard}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 500,
            }}
          >
            Back to Dashboard
          </Button>
        </Box>
        
        <Typography
          variant="h3"
          fontWeight="bold"
          color="black"
          textAlign="center"
        >
          🏆 Game Leaderboard 🏆
        </Typography>
      </Paper>

      <Box sx={{ px: 4, pb: 4 }}>
        {/* Side by side layout */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "1fr 2fr",
              lg: "1fr 2.5fr",
            },
            gap: {
              xs: 3,
              md: 4,
              lg: 5,
            },
            alignItems: "start",
          }}
        >
          {/* Player Leaderboard Section - Left */}
          <Box>
            <PlayerLeaderboard playerRankings={data.playerRankings} />
          </Box>

          {/* Selfies Gallery Section - Right */}
          <Box>
            <SelfiesGallery selfies={data.selfies} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Leaderboard;
