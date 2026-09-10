import mongoose, { Document } from "mongoose";
import { SessionStatus } from "./enums";

export interface ISession extends Document {
    _id: mongoose.Types.ObjectId;
    sessionName: string;
    companyName?: string;
    companyLogo?: string;
    numberOfTeams: number | null;
    teamMode: 'NUMBER' | 'COLOR';
    colorTeams: number[];
    questions: string[];
    status: SessionStatus;
    questionTimeLimit: number;
    answerTimeLimit: number;
    createdAt: Date;
    updatedAt: Date;
}
