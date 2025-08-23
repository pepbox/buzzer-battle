import {
    createApi,
    fetchBaseQuery,
    FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

import { BaseQueryFn, FetchArgs } from "@reduxjs/toolkit/query";

// Create the base query with auth headers and credentials
const baseQuery = fetchBaseQuery({
    baseUrl: import.meta.env.VITE_BACKEND_BASE_URL,
    credentials: "include", // Include credentials for cross-origin requests
});

// Helper function to determine the refresh endpoint based on the original request URL
// const getRefreshEndpoint = (url: string): string => {
//     // console.log(url);
//     if (url.includes('/admin/')) {
//         return '/admin/refresh';
//     } else if (url.includes('/user')) {
//         return '/user/refresh';
//     }
//     // Default fallback
//     return '/auth/refresh';
// };

// Create the reauth wrapper
const baseQueryWithReauth: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    if (!args) {
        throw new Error("Arguments for baseQuery cannot be undefined");
    }

    // Initial request
    let result = await baseQuery(args, api, extraOptions);

    // If unauthorized (token expired or invalid), attempt refresh
    // if (
    //     result.error &&
    //     (result.error.status === 401 || result.error.status === 403)
    // ) {
    // console.warn("Access token expired. Attempting refresh...");
    // Extract URL from args to determine the appropriate refresh endpoint
    // const originalUrl = typeof args === 'string' ? args : args.url;
    // const refreshEndpoint = getRefreshEndpoint(originalUrl);

    // Try to refresh the token
    // const refreshResult = await baseQuery(
    //     { url: refreshEndpoint, method: "POST" },
    //     api,
    //     extraOptions
    // );

    // if (refreshResult.data) {
    //     // Optionally dispatch new token (if using Redux store for access token)
    //     api.dispatch({
    //         type: "auth/tokenRefreshed",
    //         payload: refreshResult.data,
    //     });

    //     // Retry the original query
    //     result = await baseQuery(args, api, extraOptions);
    // } else {
    //     console.warn("Refresh token invalid. Logging out.");
    //     // Optional: force logout or reset auth state
    //     api.dispatch({ type: "auth/logout" });
    // }
    // }

    return result;
};

// Create the base API
export const api = createApi({
    baseQuery: baseQueryWithReauth,
    tagTypes: [
        "GameCards",
        "AdminPlayer",
        "GameSession",
        "Selfie",
        "GameCompletion",
    ],
    endpoints: () => ({}),
});
