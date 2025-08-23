import React, { useEffect, useState } from "react";
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
import PlayerTable from "./PlayerTable";
import ForceStartModal from "./ForceStartModal";
import { useUpdateSessionMutation, useLazyCheckPlayersReadinessQuery } from "../services/admin.Api";

const Dashboard: React.FC<DashboardProps> = ({
  headerData,
  players,
  onChangeName,
  onChangeScore,
  onViewResponses,
  playerWithResponses = null,
}) => {
  const [UpdateSession] = useUpdateSessionMutation();
  const [checkPlayersReadiness] = useLazyCheckPlayersReadinessQuery();
  const [gameStatus, setGameStatus] = useState<string>("pending");
  const [transaction, setTransaction] = useState<boolean>(false);

  // Dialog state for transactions
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<boolean>(false);

  // Force start modal state
  const [forceStartModalOpen, setForceStartModalOpen] = useState(false);
  const [pendingPlayers, setPendingPlayers] = useState<any[]>([]);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [isCheckingReadiness, setIsCheckingReadiness] = useState(false);

  useEffect(() => {
    setGameStatus(headerData?.gameStatus);
  }, [headerData?.gameStatus]);

  const onGameStatusChange = async () => {
    try {
      setIsCheckingReadiness(true);
      
      // First check if all players are ready
      const readinessResult = await checkPlayersReadiness({}).unwrap();
      
      if (readinessResult.allReady) {
        // All players are ready, start game immediately
        startGame();
      } else {
        // Some players aren't ready, show force start modal
        setPendingPlayers(readinessResult.pendingPlayers || []);
        setTotalPlayers(readinessResult.totalPlayers || 0);
        setForceStartModalOpen(true);
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
        setGameStatus("playing");
        console.log("Session updated successfully");
      })
      .catch((error) => {
        console.error("Failed to update session:", error);
      });
  };

  const handleForceStartWait = () => {
    setForceStartModalOpen(false);
  };

  const handleForceStartConfirm = () => {
    setForceStartModalOpen(false);
    startGame();
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
        <PlayerTable
          players={players}
          gameStatus={gameStatus}
          transaction={transaction}
          onChangeName={onChangeName}
          onChangeScore={onChangeScore}
          onViewResponses={onViewResponses}
          playerWithResponses={playerWithResponses}
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

      {/* Force Start Modal */}
      <ForceStartModal
        open={forceStartModalOpen}
        onClose={handleForceStartWait}
        onWait={handleForceStartWait}
        onForceStart={handleForceStartConfirm}
        pendingPlayers={pendingPlayers}
        totalPlayers={totalPlayers}
      />
    </Box>
  );
};

export default Dashboard;
