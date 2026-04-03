import { Document, Types } from "mongoose";

export interface IBuzzerQueue extends Document {
    gameStateId: Types.ObjectId;
    sessionId: Types.ObjectId;
    ttl: Date;
    teamId: Types.ObjectId;
    timestamp: bigint;
    reactionTimeMs: number;
    questionId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
