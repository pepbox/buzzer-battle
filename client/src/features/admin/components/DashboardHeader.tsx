import React from "react";
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { DashboardHeaderProps } from "../types/interfaces";
import { useAdminAuth } from "../services/useAdminAuth";
import LogoutIcon from "@mui/icons-material/Logout";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import {
  useAdminLogoutMutation,
  useUpdateSessionMutation,
} from "../services/admin.Api";
import GlobalButton from "../../../components/ui/button";
import { useAppDispatch, useAppSelector } from "../../../app/rootReducer";
import { RootState } from "../../../app/store";
import { clearAdmin } from "../services/adminSlice";

// Dashboard Header Component
const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  data,
  onGameStatusChange,
  onTransactionsChange,
  transaction = false, // Default value for transaction
  isCheckingReadiness = false, // Default value for checking readiness
}) => {
  const [AdminLogout] = useAdminLogoutMutation();
  const [UpdateSession] = useUpdateSessionMutation();
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const { sessionId } = useAppSelector((state: RootState) => state.game);
  const dispatch = useAppDispatch();

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
  const handleSesssionEnd = () => {
    UpdateSession({ status: "ended" })
      .unwrap()
      .then(() => {
        navigate(`/admin/${sessionId}/login`);
        dispatch(clearAdmin());
      })
      .catch((error) => {
        console.error("Failed to end session:", error);
      });
  };

  const handleViewLeaderboard = () => {
    navigate(`/admin/${sessionId}/leaderboard`);
  };

  return (
    <>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        px={4}
        py={2}
      >
        <Typography variant="h6" fontWeight="bold">
          Admin Dashboard
        </Typography>

        <Box display="flex" gap={2} alignItems="center">
          <Button
            variant="outlined"
            color="primary"
            startIcon={<LeaderboardIcon />}
            onClick={handleViewLeaderboard}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 500,
            }}
          >
            <Box
              sx={{
                display: { xs: "none", sm: "inline" },
              }}
            >
              Leaderboard
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
      <Paper
        sx={{
          p: 3,
          px: 4,
          mb: 2,
          backgroundColor: "rgba(252, 166, 30, 0.10)",
          dropShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h3"
            fontWeight="bold"
            color="black"
            textAlign={"center"}
          >
            Admin Name - {admin?.name || data?.adminName || "Admin"}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <GlobalButton
            fullWidth={false}
            sx={{
              display: data?.gameStatus === "playing" ? "none" : "block",
            }}
            disabled={isCheckingReadiness}
            onClick={() => {
              if (onGameStatusChange) onGameStatusChange();
            }}
          >
            {isCheckingReadiness ? "Checking Players..." : "Start Game"}
          </GlobalButton>

          <GlobalButton
            fullWidth={false}
            onClick={() => {
              handleSesssionEnd();
            }}
          >
            End Session
          </GlobalButton>
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
          />
        </Box>
      </Paper>
    </>
  );
};

export default DashboardHeader;
