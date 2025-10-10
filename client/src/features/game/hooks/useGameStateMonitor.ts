import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetchGameStateQuery } from '../services/gameStateApi';
import { useAppSelector } from '../../../app/hooks';
import { RootState } from '../../../app/store';

interface UseGameStateMonitorOptions {
  enabled?: boolean;
  pollingInterval?: number;
}

/**
 * Hook to monitor game state and handle automatic redirects
 * based on the current game status
 */
export const useGameStateMonitor = (options: UseGameStateMonitorOptions = {}) => {
  const { enabled = true, pollingInterval = 5000 } = options;
  const navigate = useNavigate();
  
  // Fetch game state with polling
  const { data, isLoading, error, refetch } = useFetchGameStateQuery(undefined, {
    skip: !enabled,
    pollingInterval: enabled ? pollingInterval : 0,
  });

  // Get current team and game state from Redux
  const { team, isAuthenticated } = useAppSelector((state: RootState) => state.team);
  const gameState = useAppSelector((state: RootState) => state.gameState.gameState);

  useEffect(() => {
    if (!enabled || !isAuthenticated || !gameState) return;

    const currentStatus = gameState.gameStatus;
    const currentAnsweringTeam = gameState.currentAnsweringTeam;
    const currentTeamId = team?._id;

    console.log('Game State Monitor:', {
      status: currentStatus,
      currentAnsweringTeam,
      currentTeamId,
    });

    // Handle redirects based on game status
    switch (currentStatus) {
      case 'paused':
        // Game is paused - show waiting screen or leaderboard
        console.log('Game is paused - staying on current page or showing leaderboard');
        // You can add navigation here if needed
        // navigate('/game/leaderboard');
        break;

      case 'buzzer_round':
        // Buzzer round is active - redirect to buzzer page
        console.log('Buzzer round active - navigating to buzzer page');
        navigate('/game/buzzer');
        break;

      case 'answering':
        // Check if current team is the answering team
        const answeringTeamId = typeof currentAnsweringTeam === 'string' 
          ? currentAnsweringTeam 
          : currentAnsweringTeam?._id;

        if (answeringTeamId === currentTeamId) {
          // Current team should answer the question
          console.log('Current team is answering - navigating to question page');
          navigate('/game/question');
        } else {
          // Other teams should view the leaderboard
          console.log('Another team is answering - navigating to leaderboard');
          navigate('/game/leaderboard');
        }
        break;

      default:
        console.log('Unknown game status:', currentStatus);
    }
  }, [gameState, team, isAuthenticated, enabled, navigate]);

  return {
    gameState: data?.data?.gameState,
    isLoading,
    error,
    refetch,
  };
};
