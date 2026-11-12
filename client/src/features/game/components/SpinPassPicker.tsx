import React, { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { GameBackground } from "../../../components/ui/GameScreen";
import { websocketService } from "../../../services/websocket/websocketService";
import { Events } from "../../../services/websocket/enums/Events";

export interface PassTeamOption {
  _id: string;
  teamName: string;
  teamNumber?: number;
}

interface SpinPassPickerProps {
  teams: PassTeamOption[];
}

/**
 * Spin Wheel: shown to the captain of the team that just answered wrong.
 * They choose which team (that hasn't tried this question yet) answers next.
 */
const SpinPassPicker: React.FC<SpinPassPickerProps> = ({ teams }) => {
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (data: { message?: string }) => {
      setPendingTeamId(null);
      setError(data?.message || "Couldn't select that team. Please try again.");
    };
    websocketService.on(Events.SPIN_PASS_ERROR, handleError);
    return () => websocketService.off(Events.SPIN_PASS_ERROR, handleError);
  }, []);

  // If the pick didn't go through (no state change arrives), let them retry.
  useEffect(() => {
    if (!pendingTeamId) return;
    const timeout = setTimeout(() => setPendingTeamId(null), 8000);
    return () => clearTimeout(timeout);
  }, [pendingTeamId]);

  const handlePick = (teamId: string) => {
    setError(null);
    setPendingTeamId(teamId);
    websocketService.emit(Events.SPIN_PASS_SELECT, { teamId });
  };

  return (
    <GameBackground>
      <Box
        role="dialog"
        aria-labelledby="spin-pass-title"
        sx={{
          width: "100%",
          maxWidth: 420,
          color: "#FFFFFF",
          backgroundColor: "rgba(15, 23, 42, 0.78)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 215, 0, 0.35)",
          borderRadius: "20px",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
          px: 3,
          py: 3,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          maxHeight: "80dvh",
        }}
      >
        <Typography sx={{ fontSize: 36, lineHeight: 1, textAlign: "center" }} aria-hidden>
          👉
        </Typography>
        <Typography
          id="spin-pass-title"
          component="h2"
          sx={{
            color: "#FFD700",
            fontWeight: 800,
            fontSize: "1.3rem",
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          Choose the next team
        </Typography>
        <Typography
          sx={{ color: "rgba(255,255,255,0.85)", textAlign: "center", fontSize: "0.95rem" }}
        >
          You're the captain — pick which team gets a shot at this question.
        </Typography>

        {error && (
          <Typography
            role="alert"
            sx={{
              color: "#FCA5A5",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              borderRadius: "10px",
              px: 1.5,
              py: 1,
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            {error}
          </Typography>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", mt: 0.5 }}>
          {teams.length === 0 ? (
            <Typography sx={{ textAlign: "center", color: "rgba(255,255,255,0.75)" }}>
              Loading teams...
            </Typography>
          ) : (
            teams.map((team) => {
              const isPending = pendingTeamId === team._id;
              return (
                <Button
                  key={team._id}
                  variant="contained"
                  disabled={Boolean(pendingTeamId)}
                  onClick={() => handlePick(team._id)}
                  sx={{
                    justifyContent: "space-between",
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "1rem",
                    py: 1.25,
                    px: 2,
                    borderRadius: "12px",
                    bgcolor: "#FFD700",
                    color: "#1E293B",
                    "&:hover": { bgcolor: "#FACC15" },
                    "&.Mui-disabled": {
                      bgcolor: isPending ? "#FACC15" : "rgba(255,255,255,0.25)",
                      color: isPending ? "#1E293B" : "rgba(255,255,255,0.6)",
                    },
                  }}
                >
                  <span>
                    {team.teamNumber ? `Team ${team.teamNumber} · ` : ""}
                    {team.teamName}
                  </span>
                  {isPending && <CircularProgress size={18} sx={{ color: "#1E293B" }} />}
                </Button>
              );
            })
          )}
        </Box>
      </Box>
    </GameBackground>
  );
};

export default SpinPassPicker;
