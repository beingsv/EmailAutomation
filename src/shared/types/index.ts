/**
 * Shared TypeScript interfaces for API responses.
 */

/**
 * Standard error response shape returned by all API routes on failure.
 */
export interface APIErrorResponse {
  error: string;
  code: string;
}

/**
 * Standard success response shape wrapping data from API routes.
 */
export interface APISuccessResponse<T> {
  data: T;
}
