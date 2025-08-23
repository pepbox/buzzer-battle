import mongoose from "mongoose";

export interface ITeam extends Document {
    teamNumber: number;
    teamName: string;
    teamScore: number;
    joinedAt: Date;
    session: mongoose.Types.ObjectId;
}
