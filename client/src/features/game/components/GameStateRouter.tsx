import { useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '../../../app/hooks';
import { RootState } from '../../../app/store';
import { useFetchGameStateQuery } from '../services/gameStateApi';

/**
 * GameStateRouter - Automatically navigates teams to the correct screen
 * based on the current game state (updated via WebSocket)
 */
const GameStateRouter = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  
  // Fetch game state (will be kept in sync via WebSocket)
  const { data: gameStateData } = useFetchGameStateQuery();
  
  // Get current team and game state from Redux
  const { team } = useAppSelector((state: RootState) => state.team);
  const { gameState } = useAppSelector((state: RootState) => state.gameState);
  
  // Use gameState from Redux (which is updated by WebSocket) or fallback to API data
  const currentGameState = gameState || gameStateData?.data?.gameState;

  useEffect(() => {
    if (!currentGameState || !team?._id) return;

    const currentStatus = currentGameState.gameStatus;
    const currentAnsweringTeam = currentGameState.currentAnsweringTeam;
    const currentTeamId = team._id;

    console.log('🎮 Game State Router:', {
      status: currentStatus,
      currentAnsweringTeam,
      currentTeamId,
    });

    // Handle navigation based on game status
    switch (currentStatus) {
      case 'paused':
        // Game is paused - stay on current page (Overlay will show pause screen)
        console.log('⏸️ Game is paused - staying on current page');
        // Optionally navigate to leaderboard if not already there
        // navigate(`/game/${sessionId}/leaderboard`);
        break;

      case 'buzzer_round':
        // Buzzer round is active - navigate to buzzer page
        console.log('🔔 Buzzer round active - navigating to buzzer page');
        navigate(`/game/${sessionId}/buzzer`);
        break;

      case 'answering':
        // Check if current team is the answering team
        const answeringTeamId = typeof currentAnsweringTeam === 'string' 
          ? currentAnsweringTeam 
          : currentAnsweringTeam?._id;

        if (answeringTeamId === currentTeamId) {
          // Current team should answer the question
          console.log('✍️ Your team is answering - navigating to question page');
          navigate(`/game/${sessionId}/question`);
        } else {
          // Other teams should view the leaderboard
          console.log('👀 Another team is answering - navigating to leaderboard');
          navigate(`/game/${sessionId}/leaderboard`);
        }
        break;

      default:
        console.log('❓ Unknown game status:', currentStatus);
        // Default to leaderboard for unknown states
        navigate(`/game/${sessionId}/leaderboard`);
    }
  }, [currentGameState, team, navigate, sessionId]);

  // Render child routes
  return <Outlet />;
};

export default GameStateRouter;
