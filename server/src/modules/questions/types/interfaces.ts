import { Document, Types } from "mongoose";

export interface option {
  optionId: string; // 'a', 'b', 'c', 'd', etc.
  optionText: string;
}

export interface IQuestionMedia {
  type: "text" | "image" | "video" | "audio" | "gif" | "file";
  url?: string;
  text?: string;
  mimeType?: string;
  fileId?: string;
  name?: string;
}

export interface IQuestionContent {
  text?: string;
  media?: IQuestionMedia[];
}

export interface IQuestion extends Document {
  questionText: string;
  questionImage?: string;
  quetionVideo?: string;
  options: option[];
  correctAnswer?: string; // This should be the optionId of the correct option (e.g., 'a', 'b', 'c', 'd')
  score: number;
  folder?: string;
  keepBuzzer?: boolean;
  questionContent?: IQuestionContent;
  questionAssets?: IQuestionMedia[];
  answerContent?: IQuestionContent;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuestionResponse extends Document {
  questionId: Types.ObjectId;
  team: Types.ObjectId;
  response: string; // This stores the optionId (e.g., 'a', 'b', 'c', 'd') or "VERBAL_ANSWER" for buzzer questions
  isCorrect?: boolean; // Optional: used for verbal/buzzer answers where admin marks correct/wrong
  createdAt: Date;
  updatedAt: Date;
}
