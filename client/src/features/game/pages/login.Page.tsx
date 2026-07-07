import React, { useState, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
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
  useFetchJoinedTeamNumbersQuery,
  useFetchTotalTeamsInSessionQuery,
} from "../services/teamApi";
import { setTeam } from "../services/teamSlice";
import Loader from "../../../components/ui/Loader";
import ErrorLayout from "../../../components/ui/Error";
import { useFetchSessionByIdQuery } from "../../session/services/session.api";

const LoginPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();

  // Get authentication state
  const { isAuthenticated, team } = useAppSelector(
    (state: RootState) => state.team,
  );

  // All hooks must be called before any conditional returns
  const {
    data: totalTeams,
    isLoading,
    error,
  } = useFetchTotalTeamsInSessionQuery(
    { sessionId: sessionId || "" },
    { skip: !sessionId },
  );

  const { data: sessionData } = useFetchSessionByIdQuery(
    sessionId || "",
    { skip: !sessionId },
  );
  const session = sessionData?.data;

  const { data: joinedTeamsData } = useFetchJoinedTeamNumbersQuery(
    { sessionId: sessionId || "" },
    {
      skip: !sessionId || isAuthenticated,
      pollingInterval: 8000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const [playerName, setPlayerName] = useState<string>("");
  const [playerRole, setPlayerRole] = useState<"BUZZER_PERSON" | "TEAM_MEMBER">("BUZZER_PERSON");
  const [selectedTeamNumber, setSelectedTeamNumber] = useState<number>(1);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // RTK Query mutation for creating team
  const [createTeam, { isLoading: isCreating, error: createError }] =
    useCreateTeamMutation();

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
          ? (createError.data as any).message || "Failed to join team"
          : "Failed to join team. Please try again.";
      setSnackbarMessage(errorMessage);
      setShowSnackbar(true);
    }
  }, [createError]);

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

  const totalTeamsNumber = totalTeams?.data?.totalTeams || 0;
  const teamMode = totalTeams?.data?.teamMode || "NUMBER";
  const colorTeams = totalTeams?.data?.colorTeams || [];
  const joinedTeamsDetails = joinedTeamsData?.data?.joinedTeamsDetails || [];
  
  let availableTeams = [];
  if (teamMode === "COLOR") {
    availableTeams = colorTeams.map((colorId) => ({
      id: colorId,
      name: `Team ${COLOR_OPTIONS.find((c) => c.id === colorId)?.label || colorId}`,
    }));
  } else {
    availableTeams = Array.from({ length: totalTeamsNumber }, (_, i) => ({
      id: i + 1,
      name: `Team ${i + 1}`,
    }));
  }

  useEffect(() => {
    if (!availableTeams.length) {
      return;
    }

    const selectedTeamStillAvailable = availableTeams.some(
      (team) => team.id === selectedTeamNumber,
    );

    if (!selectedTeamStillAvailable) {
      setSelectedTeamNumber(availableTeams[0].id);
    }
  }, [availableTeams, selectedTeamNumber]);

  // Check if the currently selected team already has a buzzer person
  const selectedTeamHasBuzzer = joinedTeamsDetails.some(
    (t) => Number(t.teamNumber) === Number(selectedTeamNumber) && t.hasBuzzerPerson
  );

  // Automatically switch role to TEAM_MEMBER if BUZZER_PERSON is already taken
  useEffect(() => {
    if (selectedTeamHasBuzzer && playerRole === "BUZZER_PERSON") {
      setPlayerRole("TEAM_MEMBER");
    }
  }, [selectedTeamHasBuzzer, selectedTeamNumber, playerRole]);

  // Conditional returns AFTER all hooks
  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return <ErrorLayout />;
  }

  const MAX_WORD_LENGTH = 15; // Maximum length per word
  const MAX_WORDS = 4; // Maximum number of words
  const MAX_TOTAL_LENGTH = 50; // Maximum total length

  // Validation function for player name
  const validatePlayerName = (name: string): string => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return "Player name is required";
    }

    // Check if contains only letters and spaces
    if (!/^[a-zA-Z\s]*$/.test(name)) {
      return "Player name can only contain letters and spaces";
    }

    // Split into words and check constraints
    const words = trimmedName.split(/\s+/);

    if (words.length > MAX_WORDS) {
      return `Player name can have maximum ${MAX_WORDS} words`;
    }

    // Check individual word length
    for (const word of words) {
      if (word.length > MAX_WORD_LENGTH) {
        return `Each word can be maximum ${MAX_WORD_LENGTH} characters`;
      }
    }

    if (trimmedName.length > MAX_TOTAL_LENGTH) {
      return `Player name must be ${MAX_TOTAL_LENGTH} characters or less`;
    }

    return "";
  };

  const handlePlayerNameChange = (value: string) => {
    // Allow only letters and spaces, and respect character limit
    if (/^[a-zA-Z\s]*$/.test(value) && value.length <= MAX_TOTAL_LENGTH) {
      setPlayerName(value);
    }
  };

  const handleStart = async () => {
    const playerNameValidation = validatePlayerName(playerName);

    if (!sessionId) {
      setSnackbarMessage("Invalid session. Please use a valid game link.");
      setShowSnackbar(true);
      return;
    }

    if (!playerName.trim()) {
      setSnackbarMessage("Please enter your name");
      setShowSnackbar(true);
      return;
    }

    if (playerNameValidation) {
      setSnackbarMessage(playerNameValidation);
      setShowSnackbar(true);
      return;
    }

    try {
      // Join/Create team via API
      const result = await createTeam({
        playerName: playerName.trim(),
        playerRole: playerRole,
        teamNumber: selectedTeamNumber,
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
          playerRole: result.data.team.playerRole,
          playerName: result.data.team.playerName,
        }),
      );

      // Navigate to buzzer page (initial waiting screen)
      navigate(`/game/${sessionId}/buzzer`);
    } catch (error) {
      // Error is already handled by useEffect
      console.error("Failed to join team:", error);
    }
  };

  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  const getPlayerNameError = () => {
    if (!playerName) return "";
    return validatePlayerName(playerName);
  };

  if (isAuthenticated && team) {
    return <Navigate to={`/game/${sessionId}/leaderboard`} />;
  }

  return (
    <Box
      sx={{
        flex: 1,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #2196F3 0%, #1976D2 100%)",
        backgroundImage: `url(${normalBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: 2,
        overflowY: "auto",
        position: "relative",
      }}
    >
      {/* Session Branding (Top Right) */}
      {(session?.companyLogo || session?.companyName) && (
        <Box 
          sx={{ 
            position: "absolute",
            top: 16,
            right: 16,
            display: "flex", 
            alignItems: "center", 
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            padding: "8px 12px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            gap: 1,
            zIndex: 10
          }}
        >
          {session?.companyName && (
            <Typography variant="body2" sx={{ fontWeight: "bold", color: "black", fontSize: "14px" }}>
              {session.companyName}
            </Typography>
          )}
          {session?.companyLogo && (
            <Box component="img" src={session.companyLogo} alt="Company Logo" sx={{ height: "32px", objectFit: "contain", borderRadius: "4px" }} />
          )}
        </Box>
      )}

      {/* Main Content */}
      <Box
        sx={{
          backgroundColor: "primary.light",
          borderRadius: "20px",
          padding: "16px",
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
          {/* Player Name Input */}
          <TextField
            placeholder="Enter Player Name"
            variant="outlined"
            value={playerName}
            onChange={(e) => handlePlayerNameChange(e.target.value)}
            error={!!getPlayerNameError()}
            helperText={getPlayerNameError() || ""}
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

          {/* Role Dropdown */}
          <FormControl variant="outlined" fullWidth>
            <Select
              value={playerRole}
              onChange={(e) => setPlayerRole(e.target.value as any)}
              displayEmpty
              sx={{
                borderRadius: 1,
                backgroundColor: "white",
                "& .MuiInputBase-input": {
                  color: theme.palette.primary.main,
                },
              }}
            >
              <MenuItem value="BUZZER_PERSON" disabled={selectedTeamHasBuzzer}>
                {selectedTeamHasBuzzer ? "Buzzer Person (Already taken)" : "Buzzer Person"}
              </MenuItem>
              <MenuItem value="TEAM_MEMBER">Team Member</MenuItem>
            </Select>
          </FormControl>

          {/* Team Dropdown Selection */}
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
                  sx: {
                    maxHeight: 220,
                    overflowY: "auto",
                  },
                },
                MenuListProps: {
                  sx: {
                    maxHeight: 220,
                    overflowY: "auto",
                  },
                },
              }}
            >
              {availableTeams && availableTeams.length > 0 ? (
                availableTeams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No teams configured</MenuItem>
              )}
            </Select>
          </FormControl>

          {/* Start Button */}
          <GlobalButton
            fullWidth
            onClick={handleStart}
            disabled={
              !sessionId ||
              !playerName.trim() ||
              !!getPlayerNameError() ||
              availableTeams.length === 0 ||
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
