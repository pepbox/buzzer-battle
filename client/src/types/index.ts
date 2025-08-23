import { SerializedError } from "@reduxjs/toolkit";

export interface IPlayer {
  id: string;
  name: string;
  profilePhoto: string;
  sessionId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IQuestion {
  id: string;
  questionText: string;
  keyAspect: string;
  questionImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnswer {
  questionId: string;
  playerId: string;
  answer: string;
}

export interface GameState {
  sessionId?: string | null;
  isGameStarted: boolean;
  currentPlayer: IPlayer | null;
  totalSteps: number;
  currentStep: number;
  isLoading: boolean;
  error: SerializedError | null;
}