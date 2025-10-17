import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  List,
  Card,
  CardContent,
  Stack,
  Chip,
  Divider,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Cancel as CrossIcon,
  AccessTime as ClockIcon,
} from '@mui/icons-material';
import { TeamResponse } from '../types/interfaces';

interface TeamResponsesModalProps {
  open: boolean;
  onClose: () => void;
  teamName: string;
  teamNumber: number;
  teamScore: number;
  responses: TeamResponse[];
  loading?: boolean;
}

const TeamResponsesModal: React.FC<TeamResponsesModalProps> = ({
  open,
  onClose,
  teamName,
  teamNumber,
  teamScore,
  responses,
  loading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Format time elapsed
  const formatTime = (seconds?: number): string => {
    if (seconds === undefined) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: isMobile ? '100%' : '80vh',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.palette.primary.main,
          color: 'white',
          py: 2,
        }}
      >
        <Box>
          <Typography variant="h6" component="div">
            Team #{teamNumber} - {teamName}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }} color='white'>
            Total Score: {teamScore} pts • {responses.length} Responses
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ p: isMobile ? 2 : 3, backgroundColor: theme.palette.background.default }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={8}>
            <CircularProgress />
          </Box>
        ) : responses.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="text.secondary">
              No responses yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This team hasn't answered any questions
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 2 }}>
            {responses.map((response, index) => (
              <Box key={response.questionId} sx={{ mb: 2 }}>
                <Card elevation={3}>
                  <CardContent>
                    <Stack spacing={2}>
                      {/* Question Header */}
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Question #{index + 1}
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {response.questionText}
                          </Typography>
                        </Box>
                        <Chip
                          icon={response.isCorrect ? <CheckIcon /> : <CrossIcon />}
                          label={response.isCorrect ? 'Correct' : 'Incorrect'}
                          color={response.isCorrect ? 'success' : 'error'}
                          size="small"
                          sx={{ ml: 2 }}
                        />
                      </Box>

                      {/* Media (if available) */}
                      {response.questionImage && (
                        <Box
                          component="img"
                          src={response.questionImage}
                          alt="Question"
                          sx={{
                            maxWidth: '100%',
                            maxHeight: 200,
                            objectFit: 'contain',
                            borderRadius: 1,
                          }}
                        />
                      )}

                      <Divider />

                      {/* Options (if available) */}
                      {response.options && response.options.length > 0 && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Options:
                          </Typography>
                          <Stack spacing={1}>
                            {response.options.map((option) => (
                              <Paper
                                key={option.optionId}
                                elevation={0}
                                sx={{
                                  p: 1.5,
                                  backgroundColor:
                                    option.optionId === response.correctAnswer
                                      ? theme.palette.success.light + '20'
                                      : option.optionId === response.teamResponse
                                      ? theme.palette.error.light + '20'
                                      : theme.palette.background.paper,
                                  border: 1,
                                  borderColor:
                                    option.optionId === response.correctAnswer
                                      ? theme.palette.success.main
                                      : option.optionId === response.teamResponse
                                      ? theme.palette.error.main
                                      : theme.palette.divider,
                                }}
                              >
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                  <Typography variant="body2">{option.optionText}</Typography>
                                  {option.optionId === response.correctAnswer && (
                                    <CheckIcon color="success" fontSize="small" />
                                  )}
                                  {option.optionId === response.teamResponse &&
                                    option.optionId !== response.correctAnswer && (
                                      <CrossIcon color="error" fontSize="small" />
                                    )}
                                </Box>
                              </Paper>
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {/* Team Response (text-based) */}
                      {!response.options || response.options.length === 0 ? (
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Team's Answer:
                          </Typography>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.5,
                              backgroundColor: response.isCorrect
                                ? theme.palette.success.light + '20'
                                : theme.palette.error.light + '20',
                              border: 1,
                              borderColor: response.isCorrect
                                ? theme.palette.success.main
                                : theme.palette.error.main,
                            }}
                          >
                            <Typography variant="body2">{response.teamResponseText}</Typography>
                          </Paper>

                          {!response.isCorrect && (
                            <Box mt={1}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Correct Answer:
                              </Typography>
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 1.5,
                                  backgroundColor: theme.palette.success.light + '20',
                                  border: 1,
                                  borderColor: theme.palette.success.main,
                                }}
                              >
                                <Typography variant="body2">{response.correctAnswerText}</Typography>
                              </Paper>
                            </Box>
                          )}
                        </Box>
                      ) : null}

                      <Divider />

                      {/* Response Details */}
                      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={response.pointsEarned >= 0 ? 'success.main' : 'error.main'}
                          >
                            {response.pointsEarned >= 0 ? '+' : ''}
                            {response.pointsEarned} pts
                          </Typography>
                        </Box>

                        {response.timeElapsed !== undefined && (
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <ClockIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {formatTime(response.timeElapsed)}
                            </Typography>
                          </Box>
                        )}

                        <Typography variant="caption" color="text.secondary">
                          {formatDate(response.answeredAt)}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TeamResponsesModal;
