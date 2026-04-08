import {
  CreateQuestionPayload,
  QuestionBankItem,
  QuestionMediaItem,
} from "../services/admin.Api";

export const inferMediaTypeFromUrl = (
  url: string,
): QuestionMediaItem["type"] => {
  const normalizedUrl = url.split("?")[0].split("#")[0].toLowerCase();

  if (/\.(gif)$/.test(normalizedUrl)) return "gif";
  if (/\.(png|jpe?g|webp|svg|bmp|avif)$/.test(normalizedUrl)) return "image";
  if (/\.(mp4|webm|mov|m4v|ogg)$/.test(normalizedUrl)) return "video";
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(normalizedUrl)) return "audio";

  return "file";
};

export const buildLinkedMediaItem = (url: string): QuestionMediaItem => {
  const trimmedUrl = url.trim();
  const fallbackName = trimmedUrl.split("/").filter(Boolean).pop() || trimmedUrl;

  return {
    type: inferMediaTypeFromUrl(trimmedUrl),
    url: trimmedUrl,
    name: fallbackName,
  };
};

export const questionToPayload = (
  question: QuestionBankItem,
  overrides?: Partial<CreateQuestionPayload>,
): CreateQuestionPayload => {
  const questionMedia =
    question.questionContent?.media?.length
      ? question.questionContent.media
      : question.questionAssets || [];

  return {
    questionText: question.questionText || question.questionContent?.text || "",
    questionImage: question.questionImage,
    quetionVideo: question.quetionVideo,
    options: (question.options || []).map((option) => ({
      optionId: option.optionId,
      optionText: option.optionText,
    })),
    correctAnswer: question.correctAnswer,
    score: question.score,
    folder: question.folder,
    keepBuzzer: question.keepBuzzer,
    hideFromUsers: question.hideFromUsers,
    questionContent: {
      text: question.questionContent?.text || question.questionText || undefined,
      media: questionMedia,
    },
    questionAssets: questionMedia,
    answerContent: {
      text: question.answerContent?.text,
      media: question.answerContent?.media || [],
    },
    ...overrides,
  };
};
