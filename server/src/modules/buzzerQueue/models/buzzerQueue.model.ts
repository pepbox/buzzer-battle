import { Schema, model } from 'mongoose';
import { IBuzzerQueue } from '../types/buzzerQueue.interface';

const buzzerQueueSchema = new Schema<IBuzzerQueue>({
    gameStateId: {
        type: Schema.Types.ObjectId,
        ref: 'GameState',
        required: true
    },
    sessionId: {
        type: Schema.Types.ObjectId,
        ref: 'Session',
        required: true
    },
    ttl: {
        type: Date,
        required: true,
        index: { expires: '0s' }
    },
    teamId: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    timestamp: {
        type: Schema.Types.BigInt,
        required: true
    },
    questionId: {
        type: Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    }
}, {
    timestamps: true
});

// Create indexes for better query performance
// buzzerQueueSchema.index({ gameStateId: 1, timestamp: 1 });
// buzzerQueueSchema.index({ sessionId: 1, questionId: 1 });

export const BuzzerQueue = model<IBuzzerQueue>('BuzzerQueue', buzzerQueueSchema);
