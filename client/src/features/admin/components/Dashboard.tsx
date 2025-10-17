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
import {
  useUpdateSessionMutation,
  useLazyCheckPlayersReadinessQuery,
} from "../services/admin.Api";

const Dashboard: React.FC<DashboardProps> = ({
  headerData,
  teams,
  onUpdateTeam,
  onViewResponses,
}) => {
  const [UpdateSession] = useUpdateSessionMutation();
  const [checkPlayersReadiness] = useLazyCheckPlayersReadinessQuery();
  const [transaction, setTransaction] = useState<boolean>(false);

  // Dialog state for transactions
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<boolean>(false);

  const [isCheckingReadiness, setIsCheckingReadiness] = useState(false);

  const onGameStatusChange = async () => {
    try {
      setIsCheckingReadiness(true);

      // First check if all players are ready
      const readinessResult = await checkPlayersReadiness({}).unwrap();

      if (readinessResult.allReady) {
        // All players are ready, start game immediately
        startGame();
      }
    } catch (error) {
      console.error("Failed to check players readiness:", error);
      // If check fails, proceed with normal game start
      startGame();
    } finally {
      setIsCheckingReadiness(false);
    }
  };

  const startGame = () => {
    console.log("Starting game...");
    UpdateSession({ status: "playing" })
      .unwrap()
      .then(() => {
        console.log("Session updated successfully");
      })
      .catch((error) => {
        console.error("Failed to update session:", error);
      });
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
        isCheckingReadiness={isCheckingReadiness}
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
