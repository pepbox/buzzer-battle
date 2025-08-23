import { Schema, model } from 'mongoose';
import { IGuess } from '../types/interfaces';

const guessSchema = new Schema<IGuess>({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    },
    personId: {
        type: Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    },
    guessedPersonId: {
        type: Schema.Types.ObjectId,
        ref: 'Player',
    },
    attempts: {
        type: Number,
        default: 0
    },
    selfie: {
        type: Schema.Types.ObjectId,
        ref: "File",
    },
}, {
    timestamps: true
});

export const Guess = model<IGuess>('Guess', guessSchema);
export type { IGuess };