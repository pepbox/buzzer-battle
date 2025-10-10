import { Schema, model } from 'mongoose';
import { IQuestionResponse } from '../types/interfaces';


const questionResponseSchema = new Schema<IQuestionResponse>(
    {
        questionId: {
            type: Schema.Types.ObjectId,
            ref: 'Question',
            required: true,
        },
        team: {
            type: Schema.Types.ObjectId,
            ref: 'Team',
            required: true,
        },
        response: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Option'
        },
    }, {
    timestamps: true
}
);

export const QuestionResponse = model<IQuestionResponse>('QuestionResponse', questionResponseSchema);