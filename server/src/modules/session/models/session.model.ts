import { Schema, model } from 'mongoose';
import { ISession } from '../types/interfaces';
import { SessionStatus } from '../types/enums';

const questionSettingSchema = new Schema({
    question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    hideFromUsers: { type: Boolean },
    keepBuzzer: { type: Boolean },
}, { _id: false });

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
    companyName: { type: String, default: "" },
    companyLogo: { type: String, default: "" },
    numberOfTeams: { type: Number, default: null },
    teamMode: { type: String, enum: ['NUMBER', 'COLOR'], default: 'NUMBER' },
    colorTeams: [{ type: Number }],
    gameMode: { type: String, enum: ['BUZZER_BATTLE', 'SPIN_WHEEL'], default: null },
    // Per-session overrides of library question flags. Seeded from the library
    // when a question is added to the session; editing here never touches the library.
    questionSettings: { type: [questionSettingSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});


export const Session = model<ISession>('Session', sessionSchema);
export { ISession };

