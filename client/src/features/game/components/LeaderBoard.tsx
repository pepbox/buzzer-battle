import React from "react";
import { Box, Typography } from "@mui/material";
// import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import starImage from "../../../assets/questions/star.webp";
import doubleCoinImage from "../../../assets/questions/double_coin.webp";
import podiumImage from "../../../assets/leaderboard/podium.webp";

export interface LeaderBoardTeam {
  id: string;
  name: string;
  score: number;
  scoreChange: number; // positive for increase, negative for decrease
  rank: number;
}

interface LeaderBoardProps {
  teams: LeaderBoardTeam[];
  onBack?: () => void;
}

const LeaderBoard: React.FC<LeaderBoardProps> = ({ teams }) => {
  // Sort teams by rank and get top 3 for podium
  const sortedTeams = [...teams].sort((a, b) => a.rank - b.rank);
  const topThree = sortedTeams.slice(0, 3);
  const remainingTeams = sortedTeams.slice(3);

  const getPodiumPosition = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "64%", // percentage based on podium height
        };
      case 2:
        return {
          right: "27%",
          bottom: "43%", // percentage based on podium height
        };
      case 3:
        return {
          left: "24%",
          bottom: "40%", // percentage based on podium height
        };
      default:
        return {};
    }
  };

  const getScoreChangeColor = (change: number) => {
    if (change > 0) return "#10B981"; // Green for positive
    if (change < 0) return "#EF4444"; // Red for negative
    return "#64748B"; // Gray for no change
  };

  const getScoreChangeIcon = (change: number) => {
    if (change > 0) return "▲";
    if (change < 0) return "▼";
    return "";
  };

  return (
    <Box
      sx={{
        width: "100vw",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        // justifyContent: "space-between",
        pt: "16px",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          padding: "4px 20px",
          justifyContent: "flex-center",
        }}
      >
        {/* <IconButton
          onClick={onBack}
          sx={{
            color: "black",
          }}
        >
          <ArrowBackIcon />
        </IconButton> */}
        <Typography
          variant="h6"
          sx={{
            color: "black",
            fontWeight: 700,
            fontSize: "12px",
            textAlign: "center",
            alignContent: "center",
            display: "flex",
            justifyContent: "center",
            flex: 1,
          }}
        >
          Leaderboard
        </Typography>
      </Box>

      {/* Podium Section */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Podium Image Container */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            maxWidth: "480",
            aspectRatio: "375/205", // Maintain aspect ratio
          }}
        >
          <Box
            component="img"
            src={podiumImage}
            alt="Podium"
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />

          {/* Team positions on podium */}
          {topThree.map((team) => (
            <Box
              key={team.id}
              sx={{
                position: "absolute",
                ...getPodiumPosition(team.rank),
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 10,
              }}
            >
              {/* Team Name */}
              <Typography
                variant="body2"
                sx={{
                  color: "#A613BF",
                  fontWeight: 700,
                  fontSize: "clamp(6px, 2vw, 8px)", // Responsive font size
                  textAlign: "center",
                  marginBottom: "clamp(2px, 1vw, 4px)", // Responsive margin
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "60px",
                }}
              >
                {team.name}
              </Typography>

              {/* Score Badge */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "white",
                  borderRadius: "clamp(8px, 4vw, 16px)", // Responsive border radius
                  padding: "clamp(2px, 1vw, 4px) clamp(4px, 2vw, 8px)", // Responsive padding
                  gap: "clamp(1px, 0.5vw, 2px)", // Responsive gap
                }}
              >
                <Box
                  component="img"
                  src={doubleCoinImage}
                  alt="Score"
                  sx={{
                    width: "clamp(12px, 4vw, 16px)", // Responsive width
                    height: "clamp(12px, 4vw, 16px)", // Responsive height
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: "#991CAF",
                    fontWeight: "bold",
                    fontSize: "clamp(10px, 3vw, 12px)", // Responsive font size
                  }}
                >
                  {team.score}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Bottom Rankings List */}
      <Box
        sx={{
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          padding: "20px",
          maxHeight: "40%",
          overflowY: "auto",
        }}
      >
        {remainingTeams.map((team) => (
          <Box
            key={team.id}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#D5ECFF",
              borderRadius: "16px",
              padding: "12px 16px",
              marginBottom: "8px",
            }}
          >
            {/* Left side - Star and rank */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  bgcolor: "white",
                  borderRadius: "20px",
                  padding: "1px 8px",
                }}
              >
                <Box
                  component="img"
                  src={starImage}
                  alt="Star"
                  sx={{
                    width: "14px",
                    height: "14px",
                  }}
                />
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 700,
                    fontSize: "16px",
                    color: "#991CAF",
                  }}
                >
                  {team.rank}
                </Typography>
              </Box>

              <Typography
                variant="body1"
                sx={{
                  fontWeight: 700,
                  fontSize: "12px",
                  color: "#1E293B",
                }}
              >
                {team.name}
              </Typography>
            </Box>

            {/* Right side - Score change and total */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {/* Score Change */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: getScoreChangeColor(team.scoreChange),
                    fontWeight: 600,
                    fontSize: "14px",
                  }}
                >
                  {getScoreChangeIcon(team.scoreChange)} {team.scoreChange}
                </Typography>
              </Box>

              {/* Total Score */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "4px 8px",
                  gap: 0.5,
                }}
              >
                <Box
                  component="img"
                  src={doubleCoinImage}
                  alt="Score"
                  sx={{
                    width: "16px",
                    height: "16px",
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: "#991CAF",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  {team.score}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default LeaderBoard;
