import { Schema, model } from 'mongoose';
import { ISession } from '../types/interfaces';
import { SessionStatus } from '../types/enums';

const sessionSchema = new Schema<ISession>({
    questionTimeLimit: { type: Number, default: 20 }, // seconds
    answerTimeLimit: { type: Number, default: 20 }, // seconds
    questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    status: {
        type: String,
        enum: Object.values(SessionStatus),
        default: SessionStatus.WAITING
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Indexes for performance
sessionSchema.index({ sessionCode: 1 });
sessionSchema.index({ status: 1 });

export const Session = model<ISession>('Session', sessionSchema);
export { ISession };

