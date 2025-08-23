import { Edit as EditIcon, Clear as ClearIcon } from "@mui/icons-material";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  Stack,
  Divider,
  TableSortLabel,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import React, { useState } from "react";
import { PlayerTableProps } from "../types/interfaces";
import PlayerResponsesModal from "./PlayerResponsesModal";

type Column = {
  key: string;
  label: string;
  sortable?: boolean;
  visible: (gameStatus: string) => boolean;
  render: (
    player: any,
    onChangeName?: (id: string, name: string) => void,
    onViewResponses?: (id: string) => void,
    transaction?: boolean,
    openNameModal?: (playerId: string, currentName: string) => void,
    onChangeScore?: (id: string, newScore: number) => void,
    openScoreModal?: (playerId: string, currentScore: number) => void
  ) => React.ReactNode;
};

const PlayerTable: React.FC<PlayerTableProps> = ({
  players,
  gameStatus,
  transaction,
  onChangeName,
  onChangeScore,
  onViewResponses,
  playerWithResponses = null,
  loadingResponses = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [responsesModalOpen, setResponsesModalOpen] = useState(false);
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedTeam, setSelectedTeam] = useState<string>(""); // Team filter state
  const [searchQuery, setSearchQuery] = useState<string>(""); // Search query state

  // Score change modal state
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [selectedPlayerIdForScore, setSelectedPlayerIdForScore] =
    useState<string>("");
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [scoreAdjustment, setScoreAdjustment] = useState<string>("");
  const [operation, setOperation] = useState<"add" | "subtract">("add");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const openModal = (playerId: string, currentName: string) => {
    setSelectedPlayerId(playerId);
    setNewName(currentName);
    setModalOpen(true);
  };

  const openScoreModal = (playerId: string, playerCurrentScore: number) => {
    setSelectedPlayerIdForScore(playerId);
    setCurrentScore(playerCurrentScore);
    setScoreAdjustment("");
    setOperation("add");
    setScoreModalOpen(true);
  };

  const handleChangeName = () => {
    if (onChangeName && selectedPlayerId && newName.trim()) {
      onChangeName(selectedPlayerId, newName.trim());
      setModalOpen(false);
      setSelectedPlayerId("");
      setNewName("");
    }
  };

  const handleChangeScore = () => {
    const adjustment = parseInt(scoreAdjustment);
    if (
      onChangeScore &&
      selectedPlayerIdForScore &&
      !isNaN(adjustment) &&
      adjustment > 0
    ) {
      const finalAdjustment =
        operation === "subtract" ? -adjustment : adjustment;
      const newScore = Math.max(0, currentScore + finalAdjustment);
      onChangeScore(selectedPlayerIdForScore, newScore);
      setScoreModalOpen(false);
      setSelectedPlayerIdForScore("");
      setCurrentScore(0);
      setScoreAdjustment("");
      setOperation("add");
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedPlayerId("");
    setNewName("");
  };

  const handleCloseScoreModal = () => {
    setScoreModalOpen(false);
    setSelectedPlayerIdForScore("");
    setCurrentScore(0);
    setScoreAdjustment("");
    setOperation("add");
  };

  const handleViewResponses = (playerId: string) => {
    if (onViewResponses) {
      onViewResponses(playerId);
      setResponsesModalOpen(true);
    }
  };

  const handleCloseResponsesModal = () => {
    setResponsesModalOpen(false);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleTeamFilter = (team: string) => {
    setSelectedTeam(team);
  };

  const clearTeamFilter = () => {
    setSelectedTeam("");
  };

  // Get unique teams for filter dropdown
  const uniqueTeams = React.useMemo(() => {
    if (!players) return [];
    const teams = [...new Set(players.map((player) => player.team))].filter(
      Boolean
    );
    return teams.sort((a, b) => {
      const aNum = parseInt(String(a || "").replace(/\D/g, "")) || 0;
      const bNum = parseInt(String(b || "").replace(/\D/g, "")) || 0;
      return aNum - bNum;
    });
  }, [players]);

  // Filter players by selected team and search query
  const filteredPlayers = React.useMemo(() => {
    let filtered = players || [];

    // Filter by team if selected
    if (selectedTeam) {
      filtered = filtered.filter((player) => player.team === selectedTeam);
    }

    // Filter by search query if provided
    if (searchQuery.trim()) {
      filtered = filtered.filter((player) =>
        player.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
    }

    return filtered;
  }, [players, selectedTeam, searchQuery]);

  // Calculate team rank for filtered players
  const playersWithTeamRank = React.useMemo(() => {
    if (!filteredPlayers) return filteredPlayers;

    if (selectedTeam) {
      // Sort by totalScore descending to calculate team rank
      const sortedByScore = [...filteredPlayers].sort(
        (a, b) => (b.totalScore || 0) - (a.totalScore || 0)
      );
      return sortedByScore.map((player, index) => ({
        ...player,
        teamRank: index + 1,
      }));
    }

    return filteredPlayers;
  }, [filteredPlayers, selectedTeam]);

  const sortedPlayers = React.useMemo(() => {
    if (!sortField || !playersWithTeamRank) return playersWithTeamRank;

    return [...playersWithTeamRank].sort((a, b) => {
      let aValue = (a as any)[sortField];
      let bValue = (b as any)[sortField];

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      // Handle string values
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue
          .toLowerCase()
          .localeCompare(bValue.toLowerCase());
        return sortDirection === "asc" ? comparison : -comparison;
      }

      // Handle mixed or undefined values
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      // Convert to string for comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      const comparison = aStr.localeCompare(bStr);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [playersWithTeamRank, sortField, sortDirection]);

  const columns: Column[] = [
    {
      key: "name",
      label: "Player Name",
      sortable: true,
      visible: () => true,
      render: (player) => player.name,
    },
    {
      key: "changeName",
      label: "Change name",
      sortable: false,
      visible: (gameStatus) => gameStatus !== "playing",
      render: (player, _onChangeName, _, transaction, openNameModal) => (
        <Tooltip title={!transaction ? "Enable transactions first" : ""}>
          <span>
            <IconButton
              size="small"
              disabled={!transaction}
              onClick={() => openNameModal?.(player.id, player.name)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ),
    },
    {
      key: "questionsAnswered",
      label: "Questions Answered",
      sortable: true,
      visible: (gameStatus) => gameStatus !== "playing",
      render: (player) => player.questionsAnswered,
    },
    {
      key: "rank",
      label: selectedTeam ? "Team Rank" : "Rank",
      sortable: true,
      visible: (gameStatus) => gameStatus === "playing",
      render: (player) =>
        selectedTeam ? (player as any).teamRank || player.rank : player.rank,
    },
    {
      key: "team",
      label: "Team",
      sortable: true,
      visible: () => true,
      render: (player) => player.team,
    },
    {
      key: "peopleYouKnow",
      label: "People you know",
      sortable: true,
      visible: (gameStatus) => gameStatus === "playing",
      render: (player) => player.peopleYouKnow,
    },
    {
      key: "peopleWhoKnowYou",
      label: "People who know you",
      sortable: true,
      visible: (gameStatus) => gameStatus === "playing",
      render: (player) => player.peopleWhoKnowYou,
    },
    {
      key: "totalScore",
      label: "Total Score",
      sortable: true,
      visible: (gameStatus) => gameStatus === "playing",
      render: (player) => (
        <Typography fontWeight="medium">{player.totalScore}</Typography>
      ),
    },
    {
      key: "changeScore",
      label: "Change Score",
      sortable: false,
      visible: (gameStatus) => gameStatus === "playing",
      render: (
        player,
        _onChangeName,
        _,
        transaction,
        _openNameModal,
        _onChangeScore,
        openScoreModal
      ) => (
        <Tooltip title={!transaction ? "Enable transactions first" : ""}>
          <span>
            <IconButton
              size="small"
              disabled={!transaction}
              onClick={() =>
                openScoreModal?.(player.id, player.totalScore || 0)
              }
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ),
    },
    {
      key: "currentStatus",
      label: "Current Status",
      sortable: true,
      visible: (gameStatus) => gameStatus !== "playing",
      render: (player) => (
        <Chip
          label={
            player.questionsAnswered.split("/")[0] ===
            player.questionsAnswered.split("/")[1]
              ? "waiting"
              : "pending"
          }
          size="small"
          color={
            player.questionsAnswered.split("/")[0] ===
            player.questionsAnswered.split("/")[1]
              ? "primary"
              : "warning"
          }
        />
      ),
    },
    {
      key: "viewResponses",
      label: "View Responses",
      sortable: false,
      visible: () => true,
      render: (player) => (
        <Button
          variant="outlined"
          size="small"
          sx={{
            padding: "2px 4px",
            color: "black",
            borderColor: "black",
            "&:hover": {
              backgroundColor: "#f5f5f5",
              borderColor: "black",
            },
          }}
          onClick={() => handleViewResponses(player.id)}
        >
          Show
        </Button>
      ),
    },
  ];

  const getRowColor = (index: number) =>
    index % 2 === 0 ? "#11111108" : "#11111100";
  const visibleColumns = columns.filter((col) => col.visible(gameStatus));

  return (
    <>
      {/* Search and Team Filter */}
      <Box
        mb={2}
        sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
      >
        <TextField
          size="small"
          placeholder="Search players by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
          InputProps={{
            startAdornment: (
              <Box sx={{ mr: 1, color: "text.secondary" }}>🔍</Box>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Filter by Team</InputLabel>
          <Select
            value={selectedTeam}
            onChange={(e) => handleTeamFilter(e.target.value)}
            label="Filter by Team"
          >
            <MenuItem value="">
              <em>All Teams</em>
            </MenuItem>
            {uniqueTeams.map((team) => (
              <MenuItem key={team} value={team}>
                Team {team}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {(selectedTeam || searchQuery) && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={() => {
              clearTeamFilter();
              setSearchQuery("");
            }}
            sx={{
              color: "text.secondary",
              borderColor: "text.secondary",
              padding: "6px 8px",
              "&:hover": {
                backgroundColor: "action.hover",
                borderColor: "text.primary",
                color: "text.primary",
              },
            }}
          >
            Clear Filters
          </Button>
        )}
        {/* Filter Status Info */}
        {(selectedTeam || searchQuery) && (
          <Box>
            <Typography variant="body2" color="text.secondary">
              {searchQuery && selectedTeam
                ? `Showing ${
                    filteredPlayers?.length || 0
                  } players matching "${searchQuery}" in Team ${selectedTeam}`
                : searchQuery
                ? `Showing ${
                    filteredPlayers?.length || 0
                  } players matching "${searchQuery}"`
                : `Showing ${
                    filteredPlayers?.length || 0
                  } players from Team ${selectedTeam}`}
            </Typography>
          </Box>
        )}
      </Box>

      {!isMobile && visibleColumns.some((col) => col.sortable) && (
        <Box mb={1}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontStyle: "italic",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            💡 Click on column headers to sort the table
          </Typography>
        </Box>
      )}
      {isMobile ? (
        <Stack spacing={2}>
          {sortedPlayers?.map((player, index) => (
            <Paper
              key={player.id}
              elevation={0}
              sx={{
                borderRadius: 2,
                backgroundColor: getRowColor(index),
                p: 2,
              }}
            >
              {visibleColumns.map((col, colIdx) => (
                <Box
                  key={col.key}
                  mb={colIdx < visibleColumns.length - 1 ? 1.5 : 0}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 500 }}
                  >
                    {col.label}
                  </Typography>
                  <Box mt={0.5}>
                    {col.render(
                      player,
                      onChangeName,
                      onViewResponses,
                      transaction,
                      openModal,
                      onChangeScore,
                      openScoreModal
                    )}
                  </Box>
                  {colIdx < visibleColumns.length - 1 && (
                    <Divider sx={{ my: 1 }} />
                  )}
                </Box>
              ))}
            </Paper>
          ))}
        </Stack>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ borderRadius: 2, overflow: "hidden" }}
        >
          <Table>
            <TableHead>
              <TableRow>
                {visibleColumns.map((col) => (
                  <TableCell key={col.key} sx={{ fontWeight: "bold" }}>
                    {col.sortable ? (
                      <TableSortLabel
                        active={sortField === col.key}
                        direction={
                          sortField === col.key ? sortDirection : "asc"
                        }
                        onClick={() => handleSort(col.key)}
                        sx={{
                          cursor: "pointer",
                          "&:hover": {
                            color: "primary.main",
                          },
                          "&.Mui-active": {
                            color: "primary.main",
                            fontWeight: "bold",
                          },
                          "& .MuiTableSortLabel-icon": {
                            opacity: sortField === col.key ? 1 : 0.5,
                          },
                          "&:hover .MuiTableSortLabel-icon": {
                            opacity: 1,
                          },
                        }}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : (
                      col.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPlayers?.map((player, index) => (
                <TableRow
                  key={player.id}
                  sx={{ backgroundColor: getRowColor(index) }}
                >
                  {visibleColumns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render(
                        player,
                        onChangeName,
                        onViewResponses,
                        transaction,
                        openModal,
                        onChangeScore,
                        openScoreModal
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Name Change Modal */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Player Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Player Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={handleChangeName} variant="contained">
            Change Name
          </Button>
        </DialogActions>
      </Dialog>

      {/* Score Change Modal */}
      <Dialog
        open={scoreModalOpen}
        onClose={handleCloseScoreModal}
        maxWidth="sm"
      >
        <DialogTitle>Edit Score</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              mb: 2,
              display: "flex",
              flexDirection: "row",
              gap: 1,
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Current Score:
            </Typography>
            <Typography variant="h6" fontWeight="bold">
              {currentScore} points
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Operation:
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant={operation === "add" ? "contained" : "outlined"}
                onClick={() => setOperation("add")}
                sx={{
                  flex: 1,
                  backgroundColor:
                    operation === "add" ? "#4caf50" : "transparent",
                  color: operation === "add" ? "white" : "#4caf50",
                  borderColor: "#4caf50",
                  "&:hover": {
                    backgroundColor:
                      operation === "add"
                        ? "#45a049"
                        : "rgba(76, 175, 80, 0.1)",
                  },
                  py: 1,
                }}
                startIcon={<span>+</span>}
              >
                Add Points
              </Button>
              <Button
                variant={operation === "subtract" ? "contained" : "outlined"}
                onClick={() => setOperation("subtract")}
                sx={{
                  flex: 1,
                  textWrap: "nowrap",
                  backgroundColor:
                    operation === "subtract" ? "#f44336" : "transparent",
                  color: operation === "subtract" ? "white" : "#f44336",
                  borderColor: "#f44336",
                  "&:hover": {
                    backgroundColor:
                      operation === "subtract"
                        ? "#e53935"
                        : "rgba(244, 67, 54, 0.1)",
                  },
                  py: 1,
                }}
                startIcon={<span>−</span>}
              >
                Subtract Points
              </Button>
            </Box>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Enter points to {operation}:
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              placeholder="Enter points"
              type="number"
              fullWidth
              variant="outlined"
              value={scoreAdjustment}
              onChange={(e) => setScoreAdjustment(e.target.value)}
              inputProps={{
                min: 0,
                step: 1,
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "rgba(0, 0, 0, 0.23)",
                  },
                  "&:hover fieldset": {
                    borderColor: "rgba(0, 0, 0, 0.87)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1976d2",
                  },
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleCloseScoreModal}
            sx={{
              color: "text.secondary",
              px: 3,
              py: 1,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleChangeScore}
            variant="contained"
            disabled={
              !scoreAdjustment ||
              isNaN(parseInt(scoreAdjustment)) ||
              parseInt(scoreAdjustment) <= 0
            }
            sx={{
              backgroundColor: operation === "add" ? "#4caf50" : "#f44336",
              px: 3,
              py: 1,
              "&:hover": {
                backgroundColor: "#45a049",
              },
              "&:disabled": {
                backgroundColor: "rgba(0, 0, 0, 0.12)",
                color: "rgba(0, 0, 0, 0.26)",
              },
            }}
          >
            {operation === "add" ? "Add Points" : "Subtract Points"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Player Responses Modal */}
      <PlayerResponsesModal
        open={responsesModalOpen}
        onClose={handleCloseResponsesModal}
        playerWithResponses={playerWithResponses}
        loading={loadingResponses}
      />
    </>
  );
};

export default PlayerTable;
