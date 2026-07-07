import { Schema, model } from "mongoose";

interface IQuestionFolder {
  name: string;
  createdBy: string;
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
    createdBy: {
      type: String,
      required: true,
      default: "superadmin",
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
