import React, { useState } from 'react';
import { Box } from '@mui/material';
import Overlay from '../../../components/ui/Overlay';
import GameStateRouter from './GameStateRouter';
import GameFooter from './GameFooter';
import LeaderBoardPage from '../pages/LeaderBoard_Page';

const GameLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'game' | 'leaderboard'>('game');

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <Overlay>
        {/* Leaderboard Overlay Layer */}
        {activeTab === 'leaderboard' && (
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: '64px', // Space for footer
              zIndex: 100, 
              backgroundColor: 'white',
              overflowY: 'auto',
              overflowX: 'hidden'
            }}
          >
            <LeaderBoardPage isOverlay={true} />
          </Box>
        )}

        {/* Game State Router Layer */}
        <Box 
          sx={{ 
            display: activeTab === 'game' ? 'block' : 'none',
            height: 'calc(100vh - 64px)', 
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
        >
          <GameStateRouter />
        </Box>
      </Overlay>

      <GameFooter activeTab={activeTab} onTabChange={setActiveTab} />
    </Box>
  );
};

export default GameLayout;
