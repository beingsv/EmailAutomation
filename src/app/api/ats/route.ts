/**
 * ATS Scoring API Route
 * POST /api/ats
 *
 * Analyzes resume-to-job-description compatibility using hybrid
 * keyword/TF-IDF (40%) and LLM semantic scoring (60%).
 *
 * Request body: { jobDescription: string }
 * Success response: ATSResult object
 * Error responses: 400 (validation/no resume), 401 (unauthorized)
 *
 * Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { calculateScore } from '@/features/ats/services/ats-scorer.service';
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

    // Call the ATS scorer service (handles JD validation, resume check, scoring)
    const result = await calculateScore(session.user.id, jobDescription);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
