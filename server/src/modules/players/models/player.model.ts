import { Schema, model } from 'mongoose';
import { IPlayer } from '../types/interfaces';


const PlayerSchema = new Schema<IPlayer>({
    name: { type: String, required: true },
    profilePhoto: {
        type: Schema.Types.ObjectId,
        ref: "File",
        required: true,
    },
    session: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    score: { type: Number, default: 0 },
    team: { type: Schema.Types.ObjectId, ref: 'Team' },
}, {
    timestamps: true
});

export const Player = model<IPlayer>('Player', PlayerSchema);