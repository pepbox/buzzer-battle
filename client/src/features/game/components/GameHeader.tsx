import React from 'react';
import { Box, Typography } from '@mui/material';
import { useAppSelector } from '../../../app/hooks';
import { RootState } from '../../../app/store';
import { useFetchOverallLeaderboardQuery } from '../services/teamApi';
import doubleCoin from "../../../assets/questions/double_coin.webp";
import starImage from "../../../assets/questions/star.webp";

const GameHeader: React.FC = () => {
  const team = useAppSelector((state: RootState) => state.team.team);
  const { data: leaderboardData, isLoading } = useFetchOverallLeaderboardQuery(
    undefined,
    { skip: !team?._id }
  );

  // Calculate generic rank from the leaderboard response dynamically
  let rank = "-";
  if (!isLoading && leaderboardData?.data?.leaderboard && team?._id) {
    const index = leaderboardData.data.leaderboard.findIndex((t: any) => t._id === team._id);
    if (index !== -1) {
      rank = `#${index + 1}`;
    }
  }

  // Hide the header entirely if there is no team (e.g. during Login or outside of team sessions)
  if (!team) return null;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        backgroundColor: "#B7DFFF", // Native participant header color theme
        color: "white",
        width: "100%",
        maxWidth: "480px",
        margin: "0 auto",
        flexShrink: 0,
        zIndex: 1000,
        boxShadow: "0px 2px 20px rgba(0,0,0,0.05)"
      }}
    >
      {/* Left: Team Info */}
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Typography 
          variant="body2" 
          sx={{ 
            color: "black", 
            fontWeight: "bold", 
            textTransform: "uppercase",
            fontSize: "14px",
            letterSpacing: "0.5px",
          }}
        >
          TEAM: {team.teamName}
        </Typography>
      </Box>

      {/* Right: Score & Rank */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {/* Total Points */}
        <Box 
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            backgroundColor: "#FFFFFF", 
            boxShadow: "2px 4px 1px 0px #00000033", 
            borderRadius: "20px", 
            padding: "2px 10px 2px 2px", 
            gap: 1 
          }}
        >
          <Box component="img" src={doubleCoin} alt="" sx={{ width: "24px", height: "24px" }} />
          <Typography variant="body2" sx={{ color: "#991CAF", fontWeight: "bold", fontSize: "15px" }}>
            {team.teamScore}
          </Typography>
        </Box>
        
        {/* Rank bubble */}
        <Box 
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            backgroundColor: "#FFFFFF", 
            boxShadow: "2px 4px 1px 0px #00000033", 
            borderRadius: "20px", 
            padding: "2px 10px 2px 4px", 
            gap: 0.5 
          }}
        >
          <Box component="img" src={starImage} alt="" sx={{ width: "16px", height: "16px", mr: "2px" }} />
          <Typography variant="body2" sx={{ color: "purple", fontWeight: "bold", fontSize: "14px" }}>
            {rank}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default GameHeader;
