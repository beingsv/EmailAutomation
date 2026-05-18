/**
 * Interview Prep API Route
 * POST /api/interview-prep
 *
 * Generates categorized interview questions with suggested answers and tips
 * based on the user's resume and a provided job description.
 *
 * Request body: { jobDescription: string }
 * Success response: { questions: InterviewQuestion[], tips: string[] }
 * Error responses: 400 (validation/no resume), 401 (unauthorized), 503 (AI failure)
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { generatePrep } from '@/features/interview-prep/services/interview-prep.service';
import { AppError, handleApiError } from '@/shared/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AppError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    // Parse request body
    let body: { jobDescription?: string };
    try {
      body = await request.json();
    } catch {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        statusCode: 400,
      });
    }

    const { jobDescription } = body;

    // Basic presence validation
    if (!jobDescription || typeof jobDescription !== 'string') {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Job description is required',
        statusCode: 400,
      });
    }

    // Call the interview prep service (handles JD validation, resume check, generation)
    const result = await generatePrep(session.user.id, jobDescription);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
