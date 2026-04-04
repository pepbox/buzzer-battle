import React, { useState } from "react";
import { DashboardProps } from "../types/interfaces";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import DashboardHeader from "./DashboardHeader";
import TeamTable from "./TeamTable";
import { useNextQuestion } from "../services/adminRemoteApi";

const Dashboard: React.FC<DashboardProps> = ({
  headerData,
  teams,
  onUpdateTeam,
  onViewResponses,
  selectedQuestionIds = [],
  questionLookup = new Map(),
  folders = [],
  onSaveQuestions,
  onEditQuestion,
  onAddQuestionsToModal,
}) => {
  const [transaction, setTransaction] = useState<boolean>(false);
  const hasQuestions = (headerData.totalQuestions || 0) > 0;

  // Dialog state for transactions
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const { nextQuestion } = useNextQuestion();

  const onGameStatusChange = async () => {
    if (!hasQuestions) {
      setErrorMessage("No questions are configured for this session.");
      return;
    }

    try {
      await nextQuestion().unwrap();
    } catch (error: any) {
      console.error("Error fetching next question:", error);
      setErrorMessage(
        error?.data?.message || "Failed to start game. Please try again.",
      );
    }
  };

  const handleCloseError = () => {
    setErrorMessage("");
  };

  const onTransactionsChange = (status: boolean) => {
    setPendingTransaction(status);
    setConfirmDialogOpen(true);
  };

  const handleDialogClose = () => {
    setConfirmDialogOpen(false);
  };

  const handleDialogConfirm = () => {
    setTransaction(pendingTransaction);
    setConfirmDialogOpen(false);
  };

  return (
    <Box sx={{ py: 3 }}>
      <DashboardHeader
        data={headerData}
        onGameStatusChange={onGameStatusChange}
        transaction={transaction}
        onTransactionsChange={onTransactionsChange}
        hasQuestions={hasQuestions}
        selectedQuestionIds={selectedQuestionIds}
        questionLookup={questionLookup}
        folders={folders}
        onSaveQuestions={onSaveQuestions}
        onEditQuestion={onEditQuestion}
        onAddQuestionsToModal={onAddQuestionsToModal}
      />
      <Box sx={{ px: 4 }}>
        <TeamTable
          teams={teams}
          transactionMode={transaction}
          onUpdateTeam={onUpdateTeam}
          onViewResponses={onViewResponses}
        />
      </Box>

      {/* Transaction Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Confirm Transaction Change</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {pendingTransaction ? "enable" : "disable"}{" "}
            transactions?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDialogConfirm}
            color="secondary"
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(errorMessage)}
        autoHideDuration={4000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseError}
          severity="error"
          sx={{ width: "100%" }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;
