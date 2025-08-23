import React, { useState } from "react";
import Dashboard from "../components/Dashboard";
import {
  useFetchDashboardDataQuery,
  useLazyGetPlayerWithResponsesQuery,
  useUpdatePlayerMutation,
} from "../services/admin.Api";
import ErrorLayout from "../../../components/ui/Error";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

const DashboardPage: React.FC = () => {
  const { data, isError } = useFetchDashboardDataQuery({});
  const [UpdatePlayer] = useUpdatePlayerMutation();
  const [getPlayerWithResponses, { isLoading: loadingResponses }] =
    useLazyGetPlayerWithResponsesQuery();

  const [playerWithResponses, setPlayerWithResponses] = useState<{
    player: {
      id: string;
      name: string;
      profilePhoto: string;
      score: number;
      team: number;
    };
    responses: any[];
  } | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handlers = {
    onChangeName: (playerId: string, name: string) => {
      UpdatePlayer({ playerId, name })
        .unwrap()
        .then(() => {
          setSnackbar({
            open: true,
            message: "Player name updated successfully",
            severity: "success",
          });
        })
        .catch((error) => {
          setSnackbar({
            open: true,
            message: "Failed to update player name",
            severity: "error",
          });
          console.error("Failed to update player name:", error);
        });
      console.log("Change name for player:", playerId);
    },

    onChangeScore: (playerId: string, newScore: number) => {
      UpdatePlayer({ playerId, score: newScore })
        .unwrap()
        .then(() => {
          setSnackbar({
            open: true,
            message: "Player score updated successfully",
            severity: "success",
          });
        })
        .catch((error) => {
          setSnackbar({
            open: true,
            message: "Failed to update player score",
            severity: "error",
          });
          console.error("Failed to update player score:", error);
        });
      console.log("Change score for player:", playerId, "New score:", newScore);
    },

    onViewResponses: (playerId: string) => {
      getPlayerWithResponses(playerId)
        .unwrap()
        .then((response) => {
          setPlayerWithResponses({
            player: {
              id: response.player.id,
              name: response.player.name,
              profilePhoto: response.player.profilePhoto,
              score: response.player.score,
              team: response.player.team,
            },
            responses: response.responses,
          });
        })
        .catch((error) => {
          setSnackbar({
            open: true,
            message: "Failed to fetch player responses",
            severity: "error",
          });
          console.error("Failed to fetch player responses:", error);
        });
    },
  };

  if (isError) {
    return <ErrorLayout />;
  }
  return (
    <>
      <Dashboard
        headerData={data?.headerData}
        players={data?.players}
        onChangeName={handlers?.onChangeName}
        onChangeScore={handlers?.onChangeScore}
        onViewResponses={handlers?.onViewResponses}
        playerWithResponses={playerWithResponses}
        loadingResponses={loadingResponses}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DashboardPage;
