import React, { useState, useRef, KeyboardEvent, useEffect } from "react";
import { Box, Typography, TextField, Container, Alert } from "@mui/material";
import { Navigate, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import GlobalButton from "../../../components/ui/button";
import { useAdminLoginMutation } from "../services/admin.Api";
import {
  selectIsAuthenticated,
  selectAdminLoading,
  selectAdminError,
  clearError,
  initializeAuth,
} from "../services/adminSlice";
import { RootState } from "../../../app/store";
import { useAppSelector } from "../../../app/hooks";

const AdminLogin: React.FC = () => {
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [localError, setLocalError] = useState<string>("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { sessionId } = useAppSelector((state: RootState) => state.game);

  // Redux state
  const isAuthenticated = useSelector((state: RootState) =>
    selectIsAuthenticated(state)
  );
  const isLoading = useSelector((state: RootState) =>
    selectAdminLoading(state)
  );
  const reduxError = useSelector((state: RootState) => selectAdminError(state));

  // API mutation
  const [adminLogin] = useAdminLoginMutation();

  const isPinComplete = pin.every((digit) => digit !== "");

  // Initialize auth state and redirect if already authenticated
  useEffect(() => {
    dispatch(initializeAuth());
    if (isAuthenticated) {
      navigate(`/admin/${sessionId}/dashboard`);
    }
  }, [dispatch, isAuthenticated, navigate]);

  // Auto-focus first input on component mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Clear Redux error when component unmounts or when starting new login
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Combined error from local state and Redux
  const displayError = localError || reduxError?.message;

  const handlePinChange = (index: number, value: string) => {
    // Only allow single digit
    if (value.length > 1) return;

    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLDivElement>) => {
    // Handle backspace to go to previous input
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle Enter key to submit if PIN is complete
    if (e.key === "Enter" && isPinComplete && !isLoading) {
      handleLogin();
    }
  };

  const handleLogin = async () => {
    const fullPin = pin.join("");

    if (fullPin.length !== 4) {
      setLocalError("Please enter a complete 4-digit PIN");
      return;
    }

    setLocalError("");
    dispatch(clearError());

    try {
      const result = await adminLogin({
        password: fullPin,
        sessionId: sessionId || "",
      }).unwrap();

      if (result.success) {
        // The Redux slice will handle the state updates via extraReducers
        // Navigate to admin dashboard
        navigate(`/admin/${sessionId}/dashboard`);
      } else {
        setLocalError(result.message || "Login failed");
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      const errorMessage =
        error?.data?.message || "Invalid PIN. Please try again.";
      setLocalError(errorMessage);

      // Clear PIN on error and focus first input
      setPin(["", "", "", ""]);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }
  };

  if (isAuthenticated) {
    return <Navigate to={`/admin/${sessionId}/dashboard`} replace />;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f5f5f5",
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 0 },
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            bgcolor: "white",
            borderRadius: { xs: 3, sm: 4 },
            p: { xs: 4, sm: 6 },
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
            maxWidth: { xs: "100%", sm: 400 },
            mx: "auto",
            width: "100%",
          }}
        >
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (isPinComplete && !isLoading) {
                handleLogin();
              }
            }}
            sx={{ width: "100%" }}
          >
            <Typography
              variant="h4"
              component="h1"
              sx={{
                mb: { xs: 3, sm: 4 },
                fontWeight: 600,
                color: "#333",
                fontSize: { xs: "1.75rem", sm: "2.125rem" },
              }}
            >
              Admin Login
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mb: 3,
                color: "#666",
                fontSize: { xs: "0.85rem", sm: "0.9rem" },
              }}
            >
              Enter 4-digit PIN
            </Typography>
            {displayError && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  borderRadius: 2,
                }}
              >
                {displayError}
              </Alert>
            )}{" "}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: { xs: 1.5, sm: 2 },
                mb: { xs: 3, sm: 4 },
                flexWrap: "nowrap",
              }}
            >
              {pin.map((digit, index) => (
                <TextField
                  key={index}
                  inputRef={(el) => (inputRefs.current[index] = el)}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  variant="outlined"
                  inputProps={{
                    maxLength: 1,
                    style: {
                      textAlign: "center",
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      padding: "16px 0",
                    },
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                  }}
                  sx={{
                    width: { xs: 50, sm: 60 },
                    height: { xs: 50, sm: 60 },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      "&.Mui-focused fieldset": {
                        borderColor: "#007bff",
                        borderWidth: 2,
                      },
                    },
                    "& .MuiOutlinedInput-input": {
                      padding: { xs: "14px 0", sm: "16px 0" },
                      fontSize: { xs: "1.25rem", sm: "1.5rem" },
                    },
                  }}
                />
              ))}
            </Box>
            <GlobalButton
              onClick={handleLogin}
              disabled={!isPinComplete || isLoading}
              sx={{
                py: { xs: 1.25, sm: 1.5 },
                fontSize: { xs: "0.9rem", sm: "1rem" },
                fontWeight: 600,
                borderRadius: 2,
                // bgcolor: isPinComplete ? "#8e9097" : "rgba(142, 142, 147, 0.5)",
                minHeight: { xs: "44px", sm: "48px" },
                // "&:hover": {
                //   bgcolor: isPinComplete
                //     ? "#7a7d84"
                //     : "rgba(142, 142, 147, 0.5)",
                // },
              }}
            >
              {isLoading ? "Logging in..." : "Login"}
            </GlobalButton>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default AdminLogin;
