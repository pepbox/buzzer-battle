
// Admin Login Types
export interface AdminLoginCredentials {
    pin: string;
}

export interface AdminUser {
    id: string;
    name: string;
}

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
    isCheckingReadiness?: boolean;
}


export interface DashboardProps {
    headerData: HeaderData;
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
    players: Player[];
    onGameStatusChange?: (status: boolean) => void;
    onChangeName?: (playerId: string, name: string) => void;
    onChangeScore?: (playerId: string, newScore: number) => void;
    onViewResponses?: (playerId: string) => void;
    loadingResponses?: boolean;
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