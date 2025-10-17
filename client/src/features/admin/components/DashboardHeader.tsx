import React from "react";
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { DashboardHeaderProps } from "../types/interfaces";
import { useAdminAuth } from "../services/useAdminAuth";
import LogoutIcon from "@mui/icons-material/Logout";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import SettingsRemoteIcon from "@mui/icons-material/SettingsRemote";
import GroupIcon from "@mui/icons-material/Group";
import QuizIcon from "@mui/icons-material/Quiz";
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
  const { sessionId } = useAppSelector((state: RootState) => state.session);
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  console.log("DashboardHeader data:", data);

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

  const handleRemoteControl = () => {
    navigate(`/admin/${sessionId}/remote-control`);
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        px={isMobile ? 2 : 4}
        py={2}
      >
        <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
          Admin Dashboard
        </Typography>

        <Box display="flex" gap={1} alignItems="center">
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<SettingsRemoteIcon />}
            onClick={handleRemoteControl}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 500,
              minWidth: isMobile ? "auto" : "fit-content",
            }}
          >
            <Box
              sx={{
                display: { xs: "none", sm: "inline" },
              }}
            >
              Remote Control
            </Box>
          </Button>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<LeaderboardIcon />}
            onClick={handleViewLeaderboard}
            sx={{
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 500,
              minWidth: isMobile ? "auto" : "fit-content",
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
              minWidth: isMobile ? "auto" : "fit-content",
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

      {/* Main Header Section */}
      <Paper
        sx={{
          p: isMobile ? 2 : 3,
          px: isMobile ? 2 : 4,
          mb: 2,
          backgroundColor: "rgba(252, 166, 30, 0.10)",
          dropShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Admin Name */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant={isMobile ? "h5" : "h3"}
            fontWeight="bold"
            color="black"
            textAlign={"center"}
          >
            {admin?.name || data?.adminName || "Admin"}
          </Typography>
        </Box>

        {/* Session Information */}
        {(data?.sessionName ||
          data?.teamsRegistered !== undefined ||
          data?.currentQuestion !== undefined) && (
          <>
            <Box sx={{ mb: 3 }}>
              <Box
                display="flex"
                flexDirection={isMobile ? "column" : "row"}
                gap={isMobile ? 2 : 4}
                justifyContent="space-around"
              >
                {data?.sessionName && (
                  <Box textAlign="center" flex={1}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Session Name
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {data.sessionName}
                    </Typography>
                  </Box>
                )}

                {data?.teamsRegistered !== undefined && (
                  <Box textAlign="center" flex={1}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Teams Registered
                    </Typography>
                    <Box
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      gap={1}
                    >
                      <GroupIcon color="primary" />
                      <Typography variant="h6" fontWeight="bold">
                        {data.teamsRegistered}
                        {data.totalTeams ? ` / ${data.totalTeams}` : ""}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {data?.currentQuestion !== undefined && (
                  <Box textAlign="center" flex={1}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Current Question
                    </Typography>
                    <Box
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      gap={1}
                    >
                      <QuizIcon color="primary" />
                      <Typography variant="h6" fontWeight="bold">
                        {data.currentQuestion}
                        {data.totalQuestions ? ` / ${data.totalQuestions}` : ""}
                      </Typography>
                    </Box>
                  </Box>
                )}
                {/* Game Status Chip */}
                <Box textAlign="center" flex={1}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Status
                  </Typography>
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    gap={1}
                  >
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color={
                        data?.gameStatus === "playing"
                          ? "success"
                          : data?.gameStatus === "paused"
                          ? "warning"
                          : "default"
                      }
                    >
                      {(() => {
                        const raw = data?.gameStatus || "idle";
                        const spaced = raw
                          .replace(/[_-]/g, " ")
                          .replace(/([a-z])([A-Z])/g, "$1 $2");
                        return spaced
                          .split(" ")
                          .filter(Boolean)
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ");
                      })()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
          </>
        )}

        {/* Action Buttons */}
        <Box
          sx={{
            display: "flex",
            gap: isMobile ? 1 : 2,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: isMobile ? "center" : "flex-start",
          }}
        >
          <GlobalButton
            fullWidth={isMobile}
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
            fullWidth={isMobile}
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
            sx={{
              ml: isMobile ? 0 : 1,
              mt: isMobile ? 1 : 0,
            }}
          />
        </Box>
      </Paper>
    </>
  );
};

export default DashboardHeader;
