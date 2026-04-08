import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Typography,
  Box,
  InputAdornment,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Stack,
  Divider,
  TableSortLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { Team, TeamTableProps } from '../types/interfaces';

interface EditTeamData {
  teamName?: string;
  teamScore?: number;
}

interface EditModalState {
  open: boolean;
  team: Team | null;
  field: 'name' | 'score' | null;
  value: string;
}

type SortField = 'rank' | 'teamNumber' | 'teamName' | 'teamScore' | 'responsesCount';
type SortOrder = 'asc' | 'desc';

const TeamTable: React.FC<TeamTableProps> = ({
  teams,
  transactionMode,
  onUpdateTeam,
  onViewResponses,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [editModal, setEditModal] = useState<EditModalState>({
    open: false,
    team: null,
    field: null,
    value: '',
  });

  const shouldHideRank = teams.length > 0 && teams.every((team) => team.teamScore === 0);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter and sort teams
  const filteredAndSortedTeams = useMemo(() => {
    let filtered = teams.filter((team) => {
      const query = searchQuery.toLowerCase();
      return (
        team.teamName.toLowerCase().includes(query) ||
        team.teamNumber.toString().includes(query)
      );
    });

    filtered.sort((a, b) => {
      let aValue: number | string = a[sortField];
      let bValue: number | string = b[sortField];

      // Handle undefined values
      if (aValue === undefined) aValue = sortOrder === 'asc' ? Infinity : -Infinity;
      if (bValue === undefined) bValue = sortOrder === 'asc' ? Infinity : -Infinity;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return filtered;
  }, [teams, searchQuery, sortField, sortOrder]);

  // Open edit modal
  const handleEditClick = (team: Team, field: 'name' | 'score') => {
    setEditModal({
      open: true,
      team,
      field,
      value: field === 'name' ? team.teamName : team.teamScore.toString(),
    });
  };

  // Close edit modal
  const handleCloseModal = () => {
    setEditModal({
      open: false,
      team: null,
      field: null,
      value: '',
    });
  };

  // Handle edit save
  const handleSaveEdit = () => {
    if (!editModal.team || !editModal.field) return;

    const updateData: EditTeamData = {};

    if (editModal.field === 'name') {
      updateData.teamName = editModal.value.trim();
    } else if (editModal.field === 'score') {
      const score = parseFloat(editModal.value);
      if (isNaN(score)) return;
      updateData.teamScore = score;
    }

    onUpdateTeam(editModal.team._id, updateData);
    handleCloseModal();
  };

  // Get status chip color
  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get rank display with trophy
  const getRankDisplay = (rank: number) => {
    if (shouldHideRank) return '-';
    if (rank === 1) return <TrophyIcon sx={{ color: '#FFD700', fontSize: 24 }} />;
    if (rank === 2) return <TrophyIcon sx={{ color: '#C0C0C0', fontSize: 24 }} />;
    if (rank === 3) return <TrophyIcon sx={{ color: '#CD7F32', fontSize: 24 }} />;
    return rank;
  };

  // Mobile Card View
  if (isMobile) {
    return (
      <Box sx={{ width: '100%' }}>
        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Search teams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {/* Team Cards */}
        <Stack spacing={2}>
          {filteredAndSortedTeams.map((team) => (
            <Card key={team._id} elevation={3}>
              <CardContent>
                <Stack spacing={2}>
                  {/* Header with Rank and Team Number */}
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="h6" component="div">
                        {getRankDisplay(team.rank)}
                      </Typography>
                      {!shouldHideRank && typeof team.rank === 'number' && team.rank > 3 && (
                        <Typography variant="h6" color="text.secondary">
                          #{team.rank}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={`Team #${team.teamNumber}`}
                      color="primary"
                      size="small"
                    />
                  </Box>

                  <Divider />

                  {/* Team Name */}
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body1" fontWeight="bold">
                      {team.teamName}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(team, 'name')}
                      disabled={!transactionMode}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Score */}
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h5" color="primary">
                      {team.teamScore} pts
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(team, 'score')}
                      disabled={!transactionMode}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Status and Responses */}
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Chip
                      label={team.status}
                      color={getStatusColor(team.status)}
                      size="small"
                    />
                    <Typography variant="body2" color="text.secondary">
                      {team.responsesCount} responses
                    </Typography>
                  </Box>

                  {/* View Responses Button */}
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => onViewResponses(team._id)}
                  >
                    View Responses
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {/* No Teams Found */}
        {filteredAndSortedTeams.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="text.secondary">
              No teams found
            </Typography>
          </Box>
        )}

        {/* Edit Modal */}
        <Dialog open={editModal.open} onClose={handleCloseModal} fullWidth maxWidth="sm">
          <DialogTitle>
            Edit {editModal.field === 'name' ? 'Team Name' : 'Team Score'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label={editModal.field === 'name' ? 'Team Name' : 'Team Score'}
              type={editModal.field === 'score' ? 'number' : 'text'}
              value={editModal.value}
              onChange={(e) => setEditModal({ ...editModal, value: e.target.value })}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleSaveEdit} variant="contained" color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Desktop Table View
  return (
    <Box sx={{ width: '100%' }}>
      {/* Search Bar */}
      <TextField
        fullWidth
        placeholder="Search teams..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {/* Table */}
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                <TableSortLabel
                  active={sortField === 'rank'}
                  direction={sortField === 'rank' ? sortOrder : 'asc'}
                  onClick={() => handleSort('rank')}
                  sx={{
                    color: 'white !important',
                    '&.Mui-active': { color: 'white !important' },
                    '& .MuiTableSortLabel-icon': { color: 'white !important' },
                  }}
                >
                  Rank
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                <TableSortLabel
                  active={sortField === 'teamNumber'}
                  direction={sortField === 'teamNumber' ? sortOrder : 'asc'}
                  onClick={() => handleSort('teamNumber')}
                  sx={{
                    color: 'white !important',
                    '&.Mui-active': { color: 'white !important' },
                    '& .MuiTableSortLabel-icon': { color: 'white !important' },
                  }}
                >
                  Team #
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                <TableSortLabel
                  active={sortField === 'teamName'}
                  direction={sortField === 'teamName' ? sortOrder : 'asc'}
                  onClick={() => handleSort('teamName')}
                  sx={{
                    color: 'white !important',
                    '&.Mui-active': { color: 'white !important' },
                    '& .MuiTableSortLabel-icon': { color: 'white !important' },
                  }}
                >
                  Team Name
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                <TableSortLabel
                  active={sortField === 'teamScore'}
                  direction={sortField === 'teamScore' ? sortOrder : 'asc'}
                  onClick={() => handleSort('teamScore')}
                  sx={{
                    color: 'white !important',
                    '&.Mui-active': { color: 'white !important' },
                    '& .MuiTableSortLabel-icon': { color: 'white !important' },
                  }}
                >
                  Score
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                <TableSortLabel
                  active={sortField === 'responsesCount'}
                  direction={sortField === 'responsesCount' ? sortOrder : 'asc'}
                  onClick={() => handleSort('responsesCount')}
                  sx={{
                    color: 'white !important',
                    '&.Mui-active': { color: 'white !important' },
                    '& .MuiTableSortLabel-icon': { color: 'white !important' },
                  }}
                >
                  Responses
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedTeams.map((team) => (
              <TableRow
                key={team._id}
                sx={{
                  '&:hover': { backgroundColor: theme.palette.action.hover },
                }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getRankDisplay(team.rank)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={team.teamNumber} color="primary" size="small" />
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography>{team.teamName}</Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(team, 'name')}
                      disabled={!transactionMode}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography fontWeight="bold" color="primary">
                      {team.teamScore}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(team, 'score')}
                      disabled={!transactionMode}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={team.status} color={getStatusColor(team.status)} size="small" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{team.responsesCount}</Typography>
                </TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => onViewResponses(team._id)}
                    title="View Responses"
                  >
                    <VisibilityIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* No Teams Found */}
      {filteredAndSortedTeams.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            No teams found
          </Typography>
        </Box>
      )}

      {/* Edit Modal */}
      <Dialog open={editModal.open} onClose={handleCloseModal} fullWidth maxWidth="sm">
        <DialogTitle>
          Edit {editModal.field === 'name' ? 'Team Name' : 'Team Score'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={editModal.field === 'name' ? 'Team Name' : 'Team Score'}
            type={editModal.field === 'score' ? 'number' : 'text'}
            value={editModal.value}
            onChange={(e) => setEditModal({ ...editModal, value: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamTable;
