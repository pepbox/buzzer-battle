import { Schema, model } from "mongoose";
import { IQuestion } from "../types/interfaces";

const questionSchema = new Schema<IQuestion>(
  {
    questionText: {
      type: String,
      required: false,
      trim: true,
      default: "",
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
          required: false,
          trim: true,
          default: "",
        },
      },
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
      required: false,
      // This should be the optionId of the correct option (e.g., 'a', 'b', 'c', 'd')
    },
    score: {
      type: Number,
      required: false,
      default: 0,
    },
    folder: {
      type: String,
      required: false,
      trim: true,
      default: "General",
    },
    keepBuzzer: {
      type: Boolean,
      default: true,
    },
    hideFromUsers: {
      type: Boolean,
      default: false,
    },
    questionContent: {
      text: {
        type: String,
        required: false,
        trim: true,
      },
      media: [
        {
          type: {
            type: String,
            enum: ["text", "image", "video", "audio", "gif", "file"],
            required: true,
          },
          url: {
            type: String,
            required: false,
          },
          text: {
            type: String,
            required: false,
          },
          mimeType: {
            type: String,
            required: false,
          },
          fileId: {
            type: String,
            required: false,
          },
          name: {
            type: String,
            required: false,
          },
        },
      ],
    },
    questionAssets: [
      {
        type: {
          type: String,
          enum: ["text", "image", "video", "audio", "gif", "file"],
          required: true,
        },
        url: {
          type: String,
          required: false,
        },
        text: {
          type: String,
          required: false,
        },
        mimeType: {
          type: String,
          required: false,
        },
        fileId: {
          type: String,
          required: false,
        },
        name: {
          type: String,
          required: false,
        },
      },
    ],
    answerContent: {
      text: {
        type: String,
        required: false,
        trim: true,
      },
      media: [
        {
          type: {
            type: String,
            enum: ["text", "image", "video", "audio", "gif", "file"],
            required: true,
          },
          url: {
            type: String,
            required: false,
          },
          text: {
            type: String,
            required: false,
          },
          mimeType: {
            type: String,
            required: false,
          },
          fileId: {
            type: String,
            required: false,
          },
          name: {
            type: String,
            required: false,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

questionSchema.index({ folder: 1, createdAt: -1 });
questionSchema.index({
  questionText: "text",
  folder: "text",
  "options.optionText": "text",
  "questionContent.text": "text",
  "answerContent.text": "text",
});

export const Question = model<IQuestion>("Question", questionSchema);
