/**
 * Centralized error handling for API routes.
 * Provides AppError class and handleApiError utility for standardized responses.
 */
import { NextResponse } from 'next/server';

/**
 * Custom application error with HTTP status code and error code.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(params: {
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = 'AppError';
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.details = params.details;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Handles errors in API routes and returns standardized JSON responses.
 * Known AppErrors return their specific status and message.
 * Unknown errors return a generic 500 response.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  // Unknown errors - log full details, return generic message
  console.error('Unhandled error:', error);
  return NextResponse.json(
    { error: 'Something went wrong', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}
