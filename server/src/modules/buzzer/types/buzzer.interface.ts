import { GamePhase } from "./buzzer.enums";

export interface BuzzerPress {
    session: string;
    questionId: string;
    teamId: string;
    timestamp: bigint; // nanosecond precision
    position: number; // 1st, 2nd, 3rd etc.
}

export interface GameState {
    session: string;
    currentQuestion: any;
    questionStartTime: number;
    buzzerWinner: string | null;
    buzzerQueue: BuzzerPress[];
    answeredBy: string | null;
    answerCorrect: boolean | null;
    phase: GamePhase;
    //   timeRemaining: number;
}
