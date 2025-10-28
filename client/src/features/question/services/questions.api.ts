import { api } from "../../../app/api";

export interface QuestionOption {
  optionId: string;
  optionText: string;
}

export interface Question {
  _id: string;
  questionText: string;
  questionImage?: string;
  quetionVideo?: string;
  options: QuestionOption[];
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CurrentQuestionResponse {
  message: string;
  data: {
    question: Question;
    currentQuestionIndex: number;
  };
}

export interface QuestionResponseRequest {
  responseOptionId: string;
}

export interface QuestionResponseResult {
  message: string;
  data: {
    questionResponse: {
      _id: string;
      questionId: string;
      teamId: string;
      responseOptionId: string;
      createdAt: Date;
    };
    isCorrect: boolean;
    pointsAwarded: number;
  };
}

export const questionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    fetchAllQuestions: builder.query({
      query: () => ({
        url: "/player/fetchAllQuestions",
        method: "GET",
      }),
    }),

    fetchCurrentQuestion: builder.query<CurrentQuestionResponse, void>({
      query: () => ({
        url: "/questions/current",
        method: "GET",
      }),
      providesTags: ["Question"],
    }),

    sendQuestionResponse: builder.mutation<
      QuestionResponseResult,
      {
        questionId: string;
        responseOptionId: string;
      }
    >({
      query: ({ questionId, responseOptionId }) => ({
        url: `/questions/${questionId}/response`,
        method: "POST",
        body: { responseOptionId },
      }),
      invalidatesTags: ["Question", "Team", "Leaderboard"],
    }),

    storeQuestionResponse: builder.mutation({
      query: (body) => ({
        url: "/player/storeQuestionResponse",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useFetchAllQuestionsQuery,
  useFetchCurrentQuestionQuery,
  useLazyFetchCurrentQuestionQuery,
  useSendQuestionResponseMutation,
  useStoreQuestionResponseMutation,
} = questionApi;
