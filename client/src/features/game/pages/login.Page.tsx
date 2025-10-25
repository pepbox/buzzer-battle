import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Snackbar,
  TextField,
  Typography,
  FormControl,
  Select,
  MenuItem,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { RootState } from "../../../app/store";
import GlobalButton from "../../../components/ui/button";
import normalBg from "../../../assets/background/normal_bg.webp";
import {
  useCreateTeamMutation,
  useFetchTotalTeamsInSessionQuery,
} from "../services/teamApi";
import { setTeam } from "../services/teamSlice";
import Loader from "../../../components/ui/Loader";
import ErrorLayout from "../../../components/ui/Error";

const LoginPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();

  // Get authentication state
  const { isAuthenticated, team } = useAppSelector(
    (state: RootState) => state.team
  );
  const { gameState } = useAppSelector((state: RootState) => state.gameState);

  // All hooks must be called before any conditional returns
  const {
    data: totalTeams,
    isLoading,
    error,
  } = useFetchTotalTeamsInSessionQuery(
    { sessionId: sessionId || "" },
    { skip: !sessionId }
  );

  const [teamName, setTeamName] = useState<string>("");
  const [selectedTeamNumber, setSelectedTeamNumber] = useState<number | "1">(
    "1"
  );
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // RTK Query mutation for creating team
  const [createTeam, { isLoading: isCreating, error: createError }] =
    useCreateTeamMutation();

  // Redirect authenticated users to appropriate game screen
  useEffect(() => {
    if (isAuthenticated && team && gameState) {
      console.log("✅ Already authenticated, redirecting to game...");

      // Redirect based on current game state
      const status = gameState.gameStatus;
      const answeringTeamId =
        typeof gameState.currentAnsweringTeam === "string"
          ? gameState.currentAnsweringTeam
          : gameState.currentAnsweringTeam?._id;

      if (status === "buzzer_round") {
        navigate(`/game/${sessionId}/buzzer`, { replace: true });
      } else if (status === "answering" && answeringTeamId === team._id) {
        navigate(`/game/${sessionId}/question`, { replace: true });
      } else {
        navigate(`/game/${sessionId}/leaderboard`, { replace: true });
      }
    }
  }, [isAuthenticated, team, gameState, navigate, sessionId]);

  // Check if sessionId is present
  useEffect(() => {
    if (!sessionId) {
      setSnackbarMessage("Invalid session. Please use a valid game link.");
      setShowSnackbar(true);
    }
  }, [sessionId]);

  // Show error from API if any
  useEffect(() => {
    if (createError) {
      const errorMessage =
        "data" in createError && createError.data
          ? (createError.data as any).message || "Failed to create team"
          : "Failed to create team. Please try again.";
      setSnackbarMessage(errorMessage);
      setShowSnackbar(true);
    }
  }, [createError]);

  // Conditional returns AFTER all hooks
  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return <ErrorLayout />;
  }

  // Dummy team data for now (team numbers)
  const totalTeamsNumber = totalTeams?.data?.totalTeams || 0;
  const dummyTeams = Array.from({ length: totalTeamsNumber }, (_, i) => ({
    id: i + 1,
    name: `Team ${i + 1}`,
  }));

  const MAX_WORD_LENGTH = 15; // Maximum length per word
  const MAX_WORDS = 4; // Maximum number of words
  const MAX_TOTAL_LENGTH = 50; // Maximum total length

  // Validation function for team name
  const validateTeamName = (name: string): string => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return "Team name is required";
    }

    // Check if contains only letters and spaces
    if (!/^[a-zA-Z\s]*$/.test(name)) {
      return "Team name can only contain letters and spaces";
    }

    // Split into words and check constraints
    const words = trimmedName.split(/\s+/);

    if (words.length > MAX_WORDS) {
      return `Team name can have maximum ${MAX_WORDS} words`;
    }

    // Check individual word length
    for (const word of words) {
      if (word.length > MAX_WORD_LENGTH) {
        return `Each word can be maximum ${MAX_WORD_LENGTH} characters`;
      }
    }

    if (trimmedName.length > MAX_TOTAL_LENGTH) {
      return `Team name must be ${MAX_TOTAL_LENGTH} characters or less`;
    }

    return "";
  };

  const handleTeamNameChange = (value: string) => {
    // Allow only letters and spaces, and respect character limit
    if (/^[a-zA-Z\s]*$/.test(value) && value.length <= MAX_TOTAL_LENGTH) {
      setTeamName(value);
    }
  };

  const handleStart = async () => {
    const teamNameValidation = validateTeamName(teamName);

    if (!sessionId) {
      setSnackbarMessage("Invalid session. Please use a valid game link.");
      setShowSnackbar(true);
      return;
    }

    if (!teamName.trim()) {
      setSnackbarMessage("Please enter team name");
      setShowSnackbar(true);
      return;
    }

    if (teamNameValidation) {
      setSnackbarMessage(teamNameValidation);
      setShowSnackbar(true);
      return;
    }

    try {
      // Create team via API
      const result = await createTeam({
        teamName: teamName.trim(),
        teamNumber: selectedTeamNumber as number,
        sessionId: sessionId,
      }).unwrap();

      // Store team data in Redux
      dispatch(
        setTeam({
          _id: result.data.team._id,
          teamName: result.data.team.teamName,
          teamNumber: result.data.team.teamNumber,
          teamScore: result.data.team.teamScore,
          joinedAt: result.data.team.joinedAt,
          sessionId: result.data.team.sessionId,
        })
      );

      // Navigate to buzzer page (initial waiting screen)
      navigate(`/game/${sessionId}/buzzer`);
    } catch (error) {
      // Error is already handled by useEffect
      console.error("Failed to create team:", error);
    }
  };

  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  const getTeamNameError = () => {
    if (!teamName) return "";
    return validateTeamName(teamName);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(180deg, #2196F3 0%, #1976D2 100%)",
        backgroundImage: `url(${normalBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 2,
        overflow: "hidden",
      }}
    >
      {/* Main Content */}
      <Box
        sx={{
          backgroundColor: "primary.light",
          borderRadius: "20px",
          padding: "12px",
          width: "90%",
          maxWidth: "400px",
          boxShadow: "6.42px 6.42px 1.83px 0px #00000033",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            textAlign: "center",
            color: theme.palette.primary.dark,
            marginBottom: 3,
            fontWeight: "bold",
          }}
        >
          Welcome to the
          <br />
          Buzzer Battle!
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
          }}
        >
          {/* Team Name Input */}
          <TextField
            placeholder="Enter Team Name"
            variant="outlined"
            value={teamName}
            onChange={(e) => handleTeamNameChange(e.target.value)}
            error={!!getTeamNameError()}
            helperText={getTeamNameError() || ""}
            sx={{
              "& .MuiInputBase-input": {
                color: theme.palette.primary.main,
              },
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
                backgroundColor: "white",
              },
            }}
          />

          {/* Team Number Selection */}
          <FormControl variant="outlined" fullWidth>
            <Select
              value={selectedTeamNumber}
              onChange={(e) => setSelectedTeamNumber(e.target.value as number)}
              inputProps={{ "aria-label": "Without label" }}
              displayEmpty
              sx={{
                borderRadius: 1,
                backgroundColor: "white",
                "& .MuiInputBase-input": {
                  color: theme.palette.primary.main,
                },
              }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 200,
                  },
                },
              }}
            >
              {dummyTeams && dummyTeams.length > 0 ? (
                dummyTeams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No teams available</MenuItem>
              )}
            </Select>
          </FormControl>

          {/* Start Button */}
          <GlobalButton
            fullWidth
            onClick={handleStart}
            disabled={
              !sessionId ||
              !teamName.trim() ||
              !!getTeamNameError() ||
              isCreating
            }
            sx={{
              padding: "12px",
              background: theme.palette.primary.main,
              "&:hover": {
                background: "linear-gradient(90deg, #1976D2 0%, #1565C0 100%)",
              },
              "&:disabled": {
                background: "#ccc",
                color: "#666",
              },
            }}
          >
            {isCreating ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={20} sx={{ color: "white" }} />
                <span>Joining...</span>
              </Box>
            ) : (
              "Start"
            )}
          </GlobalButton>
        </Box>
      </Box>

      {/* Snackbar for errors */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="warning"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginPage;
