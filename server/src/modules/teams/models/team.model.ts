import { Schema, model } from 'mongoose';
import { ITeam } from '../types/interface';

const TeamSchema = new Schema<ITeam>({
    teamNumber: { type: Number, required: true },
    teamName: { type: String, required: true },
    joinedAt: { type: Date, required: true, default: Date.now },
    teamScore: { type: Number, required: true, default: 0 },
    totalBuzzerReactionTimeMs: { type: Number, required: true, default: 0 },
    totalBuzzerPressCount: { type: Number, required: true, default: 0 },
    session: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
});

export const Team = model<ITeam>('Team', TeamSchema);
