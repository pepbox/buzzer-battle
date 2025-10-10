import { Document, Types } from "mongoose";

export interface option {
    _id?: Types.ObjectId;
    optionText: string;
}
export interface IQuestion extends Document {
    questionText: string;
    questionImage?: string;
    quetionVideo?: string;
    options: option[];
    correctAnswer: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IQuestionResponse extends Document {
    questionId: Types.ObjectId;
    team: Types.ObjectId;
    response: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
