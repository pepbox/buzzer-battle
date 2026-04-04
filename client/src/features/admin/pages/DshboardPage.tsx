import React, { useState, useMemo } from "react";
import Dashboard from "../components/Dashboard";
import TeamResponsesModal from "../components/TeamResponsesModal";
import {
  useFetchTeamDashboardQuery,
  useLazyFetchTeamResponsesQuery,
  useUpdateTeamMutation,
  useFetchQuestionBankQuery,
  useFetchQuestionFoldersQuery,
  useUpdateSessionQuestionsMutation,
} from "../services/admin.Api";
import { useFetchSessionQuery } from "../../session/services/session.api";
import ErrorLayout from "../../../components/ui/Error";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { TeamResponse, Team, QuestionBankItem } from "../types/interfaces";
import QuestionEditorDialog from "../components/QuestionEditorDialog";

const DashboardPage: React.FC = () => {
  const { data, isError, isLoading } = useFetchTeamDashboardQuery();
  const { data: sessionData } = useFetchSessionQuery();
  const { data: allQuestionsResponse } = useFetchQuestionBankQuery({
    sort: "newest",
    page: 1,
    limit: 500,
  });
  const { data: foldersResponse } = useFetchQuestionFoldersQuery();
  const [UpdateTeam] = useUpdateTeamMutation();
  const [updateSessionQuestions] = useUpdateSessionQuestionsMutation();
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
  const [editingQuestion, setEditingQuestion] =
    useState<QuestionBankItem | null>(null);

  // Build question lookup map
  const questionLookup = useMemo(() => {
    const map = new Map<string, QuestionBankItem>();
    (allQuestionsResponse?.data?.questions || []).forEach((question) => {
      map.set(question._id, question);
    });
    return map;
  }, [allQuestionsResponse]);

  // Get folders list
  const folders = useMemo(() => {
    const apiFolders = foldersResponse?.data?.folders || [];
    return ["all", ...apiFolders.filter((f) => f.toLowerCase() !== "all")];
  }, [foldersResponse]);

  // Get selected question IDs from session
  const selectedQuestionIds = useMemo(
    () => sessionData?.data?.questions || [],
    [sessionData],
  );

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
    onUpdateTeam: (
      teamId: string,
      updateData: { teamName?: string; teamScore?: number },
    ) => {
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

    onSaveQuestions: async (questionIds: string[]) => {
      try {
        await updateSessionQuestions({ questions: questionIds }).unwrap();
        setSnackbar({
          open: true,
          message: "Questions saved successfully",
          severity: "success",
        });
      } catch (error: any) {
        setSnackbar({
          open: true,
          message: error?.data?.message || "Failed to save questions",
          severity: "error",
        });
        throw error;
      }
    },

    onEditQuestion: (question: QuestionBankItem) => {
      setEditingQuestion(question);
    },

    onAddQuestionsToModal: () => {
      // This would trigger opening the question selector
      // Could navigate to question library or open a modal
      console.log("Add questions to modal");
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
        selectedQuestionIds={selectedQuestionIds}
        questionLookup={questionLookup}
        folders={folders}
        onSaveQuestions={handlers.onSaveQuestions}
        onEditQuestion={handlers.onEditQuestion}
        onAddQuestionsToModal={handlers.onAddQuestionsToModal}
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

      <QuestionEditorDialog
        open={Boolean(editingQuestion)}
        onClose={() => setEditingQuestion(null)}
        folders={folders.filter((folder) => folder !== "all")}
        defaultFolder={editingQuestion?.folder || "General"}
        mode="edit"
        initialQuestion={editingQuestion}
        onSaved={() => {
          setSnackbar({
            open: true,
            message: "Question updated successfully",
            severity: "success",
          });
        }}
      />
    </>
  );
};

export default DashboardPage;
