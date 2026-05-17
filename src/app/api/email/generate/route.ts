/**
 * Email Generate API Route
 * POST /api/email/generate
 *
 * Generates a tailored job application email using AI based on
 * the user's resume and a provided job description.
 *
 * Request body: { jobDescription: string, hrEmail: string }
 * Success response: { subject, greeting, body, closing, fullContent }
 * Error responses: 400 (validation/no resume), 401 (unauthorized), 503 (AI failure)
 *
 * Validates: Requirements 3.1, 3.2, 3.4, 3.5, 3.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { generateEmail } from '@/features/email/services/email-generator.service';
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
    let body: { jobDescription?: string; hrEmail?: string };
    try {
      body = await request.json();
    } catch {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        statusCode: 400,
      });
    }

    const { jobDescription, hrEmail } = body;

    // Basic presence validation
    if (!jobDescription || typeof jobDescription !== 'string') {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Job description is required',
        statusCode: 400,
      });
    }

    if (!hrEmail || typeof hrEmail !== 'string') {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'HR email address is required',
        statusCode: 400,
      });
    }

    // Call the email generator service (handles validation, resume check, AI call)
    const email = await generateEmail({
      userId: session.user.id,
      jobDescription,
      hrEmail,
    });

    return NextResponse.json(email, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
