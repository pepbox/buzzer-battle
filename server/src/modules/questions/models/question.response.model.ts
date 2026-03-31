import { Schema, model } from "mongoose";
import { IQuestionResponse } from "../types/interfaces";

const questionResponseSchema = new Schema<IQuestionResponse>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    response: {
      type: String,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

export const QuestionResponse = model<IQuestionResponse>(
  "QuestionResponse",
  questionResponseSchema,
);
