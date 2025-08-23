import { Schema, model } from 'mongoose';
import { IQuestionResponse } from '../types/interfaces';


const questionResponseSchema = new Schema<IQuestionResponse>(
    {
        question: {
            type: Schema.Types.ObjectId,
            ref: 'Question',
            required: true,
        },
        player: {
            type: Schema.Types.ObjectId,
            ref: 'Player',
            required: true,
        },
        response: {
            type: String,
            required: true,
            trim: true,
        },
    }, {
    timestamps: true
}
);

export const QuestionResponse = model<IQuestionResponse>('QuestionResponse', questionResponseSchema);