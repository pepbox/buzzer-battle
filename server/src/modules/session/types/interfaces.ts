import mongoose, { Document } from "mongoose";
import { SessionStatus, GameMode } from "./enums";

export interface ISessionQuestionSetting {
    question: mongoose.Types.ObjectId;
    hideFromUsers?: boolean;
    keepBuzzer?: boolean;
}

export interface ISession extends Document {
    _id: mongoose.Types.ObjectId;
    sessionName: string;
    companyName?: string;
    companyLogo?: string;
    numberOfTeams: number | null;
    teamMode: 'NUMBER' | 'COLOR';
    colorTeams: number[];
    questions: string[];
    gameMode?: GameMode | null;
    questionSettings: ISessionQuestionSetting[];
    status: SessionStatus;
    questionTimeLimit: number;
    answerTimeLimit: number;
    createdAt: Date;
    updatedAt: Date;
}
