import { Schema, model } from 'mongoose';
import { IQuestion } from '../types/interfaces';


const questionSchema = new Schema<IQuestion>({
    questionText: {
        type: String,
        required: true,
        trim: true
    },
    options: [
        {
            _id: {
                type: Schema.Types.ObjectId,
                auto: true
            },
            optionText: {
                type: String,
                required: true,
                trim: true
            }
        }
    ],
    questionImage: {
        type: String,
        required: false,
    },
    quetionVideo: {
        type: String,
        required: false,
    },
    correctAnswer: {
        type: String,
        required: true,
    },
}, {
    timestamps: true
});

export const Question = model<IQuestion>('Question', questionSchema);