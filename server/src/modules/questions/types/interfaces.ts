import { Document, Types } from "mongoose";

export interface IQuestion extends Document {
    questionText: string;
    keyAspect: string;
    questionImage?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IQuestionResponse extends Document {
    question: Types.ObjectId;
    player: Types.ObjectId;
    response: string;
    createdAt: Date;
    updatedAt: Date;
}
