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
} from "@mui/material";
import DashboardHeader from "./DashboardHeader";
import TeamTable from "./TeamTable";
import { useNextQuestion } from "../services/adminRemoteApi";

const Dashboard: React.FC<DashboardProps> = ({
  headerData,
  teams,
  onUpdateTeam,
  onViewResponses,
}) => {
  const [transaction, setTransaction] = useState<boolean>(false);

  // Dialog state for transactions
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<boolean>(false);

  const { nextQuestion } = useNextQuestion();

  const onGameStatusChange = async () => {
    try {
      await nextQuestion().unwrap();
    } catch (error: any) {
      console.error("Error fetching next question:", error);
    }
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
    </Box>
  );
};

export default Dashboard;
