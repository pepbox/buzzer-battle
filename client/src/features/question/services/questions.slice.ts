import { createSlice } from '@reduxjs/toolkit';
import { SerializedError } from '@reduxjs/toolkit';
import { questionApi } from './questions.api';


export interface IQuestion {
    questionText: string;
    keyAspect: string;
    questionImage?: string;
    _id: string;
}

const initialState = {
    questions: [] as IQuestion[],
    isLoading: false,
    error: null as SerializedError | null,
};

const questionSlice = createSlice({
    name: 'Questions',
    initialState,
    reducers: {
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


export default questionSlice.reducer;