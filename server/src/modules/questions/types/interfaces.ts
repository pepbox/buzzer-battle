import { Document, Types } from "mongoose";

export interface option {
  optionId: string; // 'a', 'b', 'c', 'd', etc.
  optionText: string;
}
export interface IQuestion extends Document {
  questionText: string;
  questionImage?: string;
  quetionVideo?: string;
  options: option[];
  correctAnswer: string; // This should be the optionId of the correct option (e.g., 'a', 'b', 'c', 'd')
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuestionResponse extends Document {
  questionId: Types.ObjectId;
  team: Types.ObjectId;
  response: string; // This stores the optionId (e.g., 'a', 'b', 'c', 'd')
  createdAt: Date;
  updatedAt: Date;
}
