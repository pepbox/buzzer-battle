import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SerializedError } from '@reduxjs/toolkit';
import { questionApi, Question } from './questions.api';

export interface IQuestion {
    questionText: string;
    keyAspect: string;
    questionImage?: string;
    _id: string;
}

export interface QuestionState {
    questions: IQuestion[];
    currentQuestion: Question | null;
    currentQuestionIndex: number;
    responseResult: {
        isCorrect: boolean;
        pointsAwarded: number;
    } | null;
    isLoading: boolean;
    error: SerializedError | null;
}

const initialState: QuestionState = {
    questions: [],
    currentQuestion: null,
    currentQuestionIndex: 0,
    responseResult: null,
    isLoading: false,
    error: null,
};

const questionSlice = createSlice({
    name: 'Questions',
    initialState,
    reducers: {
        setCurrentQuestion: (state, action: PayloadAction<Question>) => {
            state.currentQuestion = action.payload;
        },
        clearResponseResult: (state) => {
            state.responseResult = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addMatcher(
                questionApi.endpoints.fetchAllQuestions.matchPending,
                (state) => {
                    state.isLoading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                questionApi.endpoints.fetchAllQuestions.matchFulfilled,
                (state, payload) => {
                    state.questions = payload.payload;
                    state.isLoading = false;
                }
            )
            .addMatcher(
                questionApi.endpoints.fetchAllQuestions.matchRejected,
                (state, { error }) => {
                    state.isLoading = false;
                    state.error = error;
                }
            );

        // Fetch Current Question
        builder
            .addMatcher(
                questionApi.endpoints.fetchCurrentQuestion.matchPending,
                (state) => {
                    state.isLoading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                questionApi.endpoints.fetchCurrentQuestion.matchFulfilled,
                (state, { payload }) => {
                    state.currentQuestion = payload.data.question;
                    state.currentQuestionIndex = payload.data.currentQuestionIndex;
                    state.isLoading = false;
                }
            )
            .addMatcher(
                questionApi.endpoints.fetchCurrentQuestion.matchRejected,
                (state, { error }) => {
                    state.isLoading = false;
                    state.error = error;
                }
            );

        // Send Question Response
        builder
            .addMatcher(
                questionApi.endpoints.sendQuestionResponse.matchPending,
                (state) => {
                    state.isLoading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                questionApi.endpoints.sendQuestionResponse.matchFulfilled,
                (state, { payload }) => {
                    state.responseResult = {
                        isCorrect: payload.data.isCorrect,
                        pointsAwarded: payload.data.pointsAwarded,
                    };
                    state.isLoading = false;
                }
            )
            .addMatcher(
                questionApi.endpoints.sendQuestionResponse.matchRejected,
                (state, { error }) => {
                    state.isLoading = false;
                    state.error = error;
                }
            );

        builder
            .addMatcher(
                questionApi.endpoints.storeQuestionResponse.matchPending,
                (state) => {
                    state.isLoading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                questionApi.endpoints.storeQuestionResponse.matchFulfilled,
                (state) => {
                    state.isLoading = false;
                }
            )
            .addMatcher(
                questionApi.endpoints.storeQuestionResponse.matchRejected,
                (state, { error }) => {
                    state.isLoading = false;
                    state.error = error;
                }
            );
    },
});

export const { setCurrentQuestion, clearResponseResult, clearError } = questionSlice.actions;
export default questionSlice.reducer;