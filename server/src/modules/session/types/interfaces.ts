import { Document } from "mongoose";
import { SessionStatus } from "./enums";

export interface ISession extends Document {
    _id: string;
    questionTimeLimit: number; // in seconds
    answerTimeLimit: number; // in seconds
    questions: string[]; // question IDs
    status: SessionStatus;
    createdAt: Date;
    updatedAt: Date;
}
