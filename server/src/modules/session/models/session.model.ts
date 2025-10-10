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
        default: SessionStatus.NOT_STARTED
    },
    sessionName: { type: String, required: true },
    numberOfTeams: { type: Number, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});


export const Session = model<ISession>('Session', sessionSchema);
export { ISession };

