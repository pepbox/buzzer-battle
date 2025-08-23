import React from "react";
import Leaderboard from "../components/Leaderboard";
import { useFetchLeaderboardDataQuery } from "../services/admin.Api";
import ErrorLayout from "../../../components/ui/Error";

const LeaderboardPage: React.FC = () => {
  const { data, isLoading, isError } = useFetchLeaderboardDataQuery({});

  if (isError) {
    return <ErrorLayout />;
  }

  return (
    <Leaderboard 
      data={data || null} 
      isLoading={isLoading} 
    />
  );
};

export default LeaderboardPage;
