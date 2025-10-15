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
            optionId: {
                type: String,
                required: true,
                // Should be 'a', 'b', 'c', 'd', etc.
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
        // This should be the optionId of the correct option (e.g., 'a', 'b', 'c', 'd')
    },
}, {
    timestamps: true
});

export const Question = model<IQuestion>('Question', questionSchema);