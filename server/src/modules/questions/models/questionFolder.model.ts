import { Schema, model } from "mongoose";

interface IQuestionFolder {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const questionFolderSchema = new Schema<IQuestionFolder>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

questionFolderSchema.index({ name: 1 }, { unique: true });

export const QuestionFolder = model<IQuestionFolder>(
  "QuestionFolder",
  questionFolderSchema,
);
