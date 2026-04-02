import React from 'react';
import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import VideogameAssetIcon from '@mui/icons-material/VideogameAsset';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';

interface GameFooterProps {
  activeTab: 'game' | 'leaderboard';
  onTabChange: (tab: 'game' | 'leaderboard') => void;
}

const GameFooter: React.FC<GameFooterProps> = ({ activeTab, onTabChange }) => {
  return (
    <Paper 
      sx={{ 
        maxWidth: "480px",
        width: "100%",
        margin: "0 auto",
        flexShrink: 0,
        paddingBottom: "env(safe-area-inset-bottom)"
      }} 
      elevation={5}
    >
      <BottomNavigation
        showLabels
        value={activeTab}
        onChange={(_event, newValue) => {
          onTabChange(newValue);
        }}
        sx={{
          backgroundColor: '#ffffff',
          height: '64px',
          borderTop: '1px solid #e0e0e0',
          '& .Mui-selected': { 
            color: '#2196F3',
            fontSize: '14px',
            fontWeight: 'bold'
          },
          '& .MuiBottomNavigationAction-label': {
            marginTop: '4px'
          }
        }}
      >
        <BottomNavigationAction 
          label="Game" 
          value="game" 
          icon={<VideogameAssetIcon fontSize="medium" />} 
        />
        <BottomNavigationAction 
          label="Leaderboard" 
          value="leaderboard" 
          icon={<LeaderboardIcon fontSize="medium" />} 
        />
      </BottomNavigation>
    </Paper>
  );
};

export default GameFooter;
