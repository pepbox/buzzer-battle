import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
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
} from "@mui/material";
// import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import GlobalButton from "../../../components/ui/button";
// import { RootState } from "../../../app/store";
import normalBg from "../../../assets/background/normal_bg.webp";

const LoginPage: React.FC = () => {
  // const navigate = useNavigate();
  // const dispatch = useAppDispatch();
  const [teamName, setTeamName] = useState<string>("");
  const [selectedTeamNumber, setSelectedTeamNumber] = useState<number | "1">(
    "1"
  );
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // TODO: Uncomment when RTK query is available
  // const { sessionId } = useAppSelector((state: RootState) => state.game);
  // const {
  //   data: teams,
  //   isError,
  //   isLoading,
  // } = useGetAllTeamsQuery(sessionId, {
  //   skip: !sessionId,
  // });

  // Dummy team data for now
  const dummyTeams = [
    { id: 1, name: "Team 1" },
    { id: 2, name: "Team 2" },
  ];
  const isLoading = false;
  const isError = false;

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

  const handleStart = () => {
    const teamNameValidation = validateTeamName(teamName);

    if (
      !teamName.trim()
      // || selectedTeamNumber === "1"
    ) {
      setSnackbarMessage("Please enter team name and select team number");
      setShowSnackbar(true);
      return;
    }

    if (teamNameValidation) {
      setSnackbarMessage(teamNameValidation);
      setShowSnackbar(true);
      return;
    }

    // TODO: Dispatch team data to store when available
    // dispatch(
    //   setTeam({
    //     name: teamName.trim(),
    //     number: selectedTeamNumber as number,
    //   })
    // );

    console.log("Team Data:", {
      name: teamName.trim(),
      number: selectedTeamNumber,
    });

    // TODO: Navigate to next screen
    // navigate(`/game/${sessionId}/next-screen`);
    console.log("Navigating to next screen...");
  };

  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  const getTeamNameError = () => {
    if (!teamName) return "";
    return validateTeamName(teamName);
  };
  const theme = useTheme();

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
              disabled={isLoading}
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
              {isLoading ? (
                <MenuItem disabled>Loading teams...</MenuItem>
              ) : isError ? (
                <MenuItem disabled>Error loading teams</MenuItem>
              ) : dummyTeams && dummyTeams.length > 0 ? (
                dummyTeams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No teams available</MenuItem>
              )}

              {/* TODO: Uncomment when RTK query is available */}
              {/* {teams && teams.length > 0 ? (
                teams.map((team: any, index: number) => (
                  <MenuItem key={team.id || index} value={team.number || index + 1}>
                    Team {team.number || index + 1}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No teams available</MenuItem>
              )} */}
            </Select>
          </FormControl>

          {/* Start Button */}
          <GlobalButton
            fullWidth
            onClick={handleStart}
            disabled={
              !teamName.trim() ||
              // selectedTeamNumber === "" ||
              !!getTeamNameError()
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
            Start
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
