import React, { useState } from "react";
import Dashboard from "../components/Dashboard";
import TeamResponsesModal from "../components/TeamResponsesModal";
import {
  useFetchTeamDashboardQuery,
  useLazyFetchTeamResponsesQuery,
  useUpdateTeamMutation,
} from "../services/admin.Api";
import ErrorLayout from "../../../components/ui/Error";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { TeamResponse, Team } from "../types/interfaces";

const DashboardPage: React.FC = () => {
  const { data, isError, isLoading } = useFetchTeamDashboardQuery();
  const [UpdateTeam] = useUpdateTeamMutation();
  const [getTeamResponses, { isLoading: loadingResponses }] =
    useLazyFetchTeamResponsesQuery();

  const [teamResponsesModal, setTeamResponsesModal] = useState<{
    open: boolean;
    team: Team | null;
    responses: TeamResponse[];
  }>({
    open: false,
    team: null,
    responses: [],
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleCloseModal = () => {
    setTeamResponsesModal({
      open: false,
      team: null,
      responses: [],
    });
  };

  const handlers = {
    onUpdateTeam: (teamId: string, updateData: { teamName?: string; teamScore?: number }) => {
      UpdateTeam({ teamId, data: updateData })
        .unwrap()
        .then(() => {
          setSnackbar({
            open: true,
            message: updateData.teamName
              ? "Team name updated successfully"
              : "Team score updated successfully",
            severity: "success",
          });
        })
        .catch((error) => {
          setSnackbar({
            open: true,
            message: updateData.teamName
              ? "Failed to update team name"
              : "Failed to update team score",
            severity: "error",
          });
          console.error("Failed to update team:", error);
        });
    },

    onViewResponses: (teamId: string) => {
      const team = data?.data?.teams.find((t) => t._id === teamId);
      if (!team) return;

      getTeamResponses(teamId)
        .unwrap()
        .then((response) => {
          setTeamResponsesModal({
            open: true,
            team: team,
            responses: response.responses,
          });
        })
        .catch((error) => {
          setSnackbar({
            open: true,
            message: "Failed to fetch team responses",
            severity: "error",
          });
          console.error("Failed to fetch team responses:", error);
        });
    },
  };

  if (isError) {
    return <ErrorLayout />;
  }

  if (isLoading || !data) {
    return <div>Loading...</div>;
  }
  
  // Construct header data
  const headerData = {
    gameStatus: data.data.gameState.gameStatus,
    sessionName: data.data.session.sessionName,
    teamsRegistered: data.data.statistics.totalTeamsRegistered,
    totalTeams: data.data.session.numberOfTeams,
    currentQuestion: data.data.statistics.currentQuestion,
    totalQuestions: data.data.statistics.totalQuestions,
  };

  return (
    <>
      <Dashboard
        headerData={headerData}
        teams={data.data.teams}
        onUpdateTeam={handlers.onUpdateTeam}
        onViewResponses={handlers.onViewResponses}
      />

      {/* Team Responses Modal */}
      <TeamResponsesModal
        open={teamResponsesModal.open}
        onClose={handleCloseModal}
        teamName={teamResponsesModal.team?.teamName || ""}
        teamNumber={teamResponsesModal.team?.teamNumber || 0}
        teamScore={teamResponsesModal.team?.teamScore || 0}
        responses={teamResponsesModal.responses}
        loading={loadingResponses}
      />

      {/* Snackbar for notifications */}
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
