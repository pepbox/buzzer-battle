import { Document } from "mongoose";
import { SessionStatus } from "./enums";

export interface ISession extends Document {
    _id: string;
    sessionName: string;
    numberOfTeams: number | null;
    questions: string[];
    status: SessionStatus;
    questionTimeLimit: number;
    answerTimeLimit: number;
    createdAt: Date;
    updatedAt: Date;
}
