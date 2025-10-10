import mongoose, { Document } from "mongoose";

export interface ITeam extends Document {
    _id: mongoose.Types.ObjectId;
    teamNumber: number;
    teamName: string;
    teamScore: number;
    joinedAt: Date;
    session: mongoose.Types.ObjectId;
}
