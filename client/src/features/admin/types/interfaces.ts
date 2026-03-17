// Admin Login Types
export interface AdminLoginCredentials {
  pin: string;
}

export interface AdminUser {
  id: string;
  name: string;
}

// Team-based Dashboard Types
export interface Team {
  _id: string;
  teamNumber: number;
  teamName: string;
  teamScore: number;
  joinedAt: string;
  rank: number;
  status: "idle" | "answering" | "active";
  responsesCount: number;
}

export interface TeamTableProps {
  teams: Team[];
  transactionMode: boolean;
  onUpdateTeam: (
    teamId: string,
    data: { teamName?: string; teamScore?: number },
  ) => void;
  onViewResponses: (teamId: string) => void;
}

export interface TeamResponse {
  questionId: string;
  questionText: string;
  questionImage?: string;
  questionVideo?: string;
  options: Array<{
    optionId: string;
    optionText: string;
  }>;
  teamResponse: string;
  teamResponseText: string;
  correctAnswer: string;
  correctAnswerText: string;
  isCorrect: boolean;
  pointsEarned: number;
  timeElapsed?: number;
  answeredAt: string;
}

// Keep old Player types for backward compatibility (if needed)
export interface PlayerTableProps {
  players: Player[];
  gameStatus: string;
  transaction?: boolean;
  onChangeName?: (playerId: string, name: string) => void;
  onChangeScore?: (playerId: string, newScore: number) => void;
  onViewResponses?: (playerId: string) => void;
  playerWithResponses?: {
    player: {
      id: string;
      name: string;
      profilePhoto?: string;
      score: number;
    };
    responses: {
      questionId: string;
      keyAspect: string;
      questionText: string;
      response: string;
    }[];
  } | null;
  loadingResponses?: boolean;
}

// Type definitions
export interface HeaderData {
  gameStatus: string;
  adminName?: string;
  sessionName?: string;
  teamsRegistered?: number;
  totalTeams?: number;
  currentQuestion?: number;
  totalQuestions?: number;
}

export interface Player {
  id: string;
  name: string;
  questionsAnswered: string;
  currentStatus?: string;
  rank?: number;
  peopleYouKnow?: string;
  peopleWhoKnowYou?: string;
  totalScore?: number;
  team?: string | number;
}

export interface DashboardHeaderProps {
  data: HeaderData;
  gameStatus?: boolean;
  onGameStatusChange?: () => void;
  onTransactionsChange?: (status: boolean) => void;
  transaction?: boolean;
  hasQuestions?: boolean;
}

export interface DashboardProps {
  headerData: HeaderData;
  teams: Team[];
  onUpdateTeam: (
    teamId: string,
    data: { teamName?: string; teamScore?: number },
  ) => void;
  onViewResponses: (teamId: string) => void;
}

// Leaderboard Types
export interface PlayerRanking {
  id: string;
  name: string;
  profilePhoto: string | null;
  score: number;
  rank: number;
}

export interface SelfieData {
  id: string;
  guesserName: string;
  guessedPersonName: string;
  selfieId: string | null;
  createdAt: Date;
}

export interface LeaderboardData {
  playerRankings: PlayerRanking[];
  selfies: SelfieData[];
}

export interface LeaderboardProps {
  data: LeaderboardData | null;
  isLoading: boolean;
}

// export interface DashboardPageProps {
//   data: {
//     headerData: HeaderData;
//     players: Player[];
//   };
//   handlers?: {
//     onGameStatusChange?: (status: boolean) => void;
//     onTransactionsChange?: (status: boolean) => void;
//     onChangeName?: (playerId: string) => void;
//     onViewResponses?: (playerId: string) => void;
//   };
// }
