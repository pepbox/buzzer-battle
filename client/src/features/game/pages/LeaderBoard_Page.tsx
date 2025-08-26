import React from "react";
import { useNavigate } from "react-router-dom";
import LeaderBoard, { LeaderBoardTeam } from "../compoenents/LeaderBoard";

const LeaderBoardPage: React.FC = () => {
  const navigate = useNavigate();

  // Dummy data - will be replaced with RTK Query later
  const dummyTeams: LeaderBoardTeam[] = [
    {
      id: "team1",
      name: "Mystery Masters",
      score: 1500,
      scoreChange: -2,
      rank: 1,
    },
    {
      id: "team2",
      name: "Winning Team",
      score: 1500,
      scoreChange: 0,
      rank: 2,
    },
    {
      id: "team3",
      name: "Competitive Squad",
      score: 1500,
      scoreChange: 0,
      rank: 3,
    },
    {
      id: "team4",
      name: "Mystery Masters",
      score: 1500,
      scoreChange: -2,
      rank: 4,
    },
    {
      id: "team5",
      name: "Mystery Masters",
      score: 1500,
      scoreChange: 11,
      rank: 5,
    },
    {
      id: "team6",
      name: "Enigma Experts",
      score: 1600,
      scoreChange: -1,
      rank: 6,
    },
    {
      id: "team7",
      name: "Enigma Experts",
      score: 1600,
      scoreChange: 12,
      rank: 7,
    },
    {
      id: "team8",
      name: "Enigma Experts",
      score: 1600,
      scoreChange: 1,
      rank: 8,
    },
    {
      id: "team9",
      name: "Enigma Experts",
      score: 1600,
      scoreChange: -2,
      rank: 9,
    },
    {
      id: "team10",
      name: "Enigma Experts",
      score: 1600,
      scoreChange: -2,
      rank: 10,
    },
  ];

  const handleBack = () => {
    // Go back to the previous page
    navigate(-1);
  };

  // TODO: Replace with actual RTK Query hooks when ready
  // const { data: leaderboardData, isLoading, error } = useGetLeaderboardQuery();
  // const { data: gameState } = useGetGameStateQuery();

  return (
    <LeaderBoard
      teams={dummyTeams}
      onBack={handleBack}
    />
  );
};

export default LeaderBoardPage;
