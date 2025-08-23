import { api } from "../../../app/api";

export const questionApi = api.injectEndpoints({
    endpoints: (builder) => ({
        
        fetchAllQuestions: builder.query({
            query: () => ({
                url: '/player/fetchAllQuestions',
                method: 'GET',
            }),
        }),
        storeQuestionResponse: builder.mutation({
            query: (body) => ({
                url: '/player/storeQuestionResponse',
                method: 'POST',
                body,
            }),
        }),
        
    }),
});

export const {
    useFetchAllQuestionsQuery,
    useStoreQuestionResponseMutation,
} = questionApi;