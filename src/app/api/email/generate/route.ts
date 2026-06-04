/**
 * Email Generate API Route
 * POST /api/email/generate
 *
 * Generates a tailored job application email using AI based on
 * the user's resume and a provided job description.
 * Optionally generates a referral request email in parallel.
 *
 * Request body: { jobDescription: string, hrEmail?: string, generateReferral?: boolean }
 * Success response: { hrEmail: GeneratedEmail, referralEmail?: GeneratedReferralEmail }
 * Error responses: 400 (validation/no resume), 401 (unauthorized), 503 (AI failure)
 *
 * Validates: Requirements 3.1, 3.2, 3.4, 3.5, 3.6, 3.7, 4.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { generateEmail } from '@/features/email/services/email-generator.service';
import { generateReferralEmail } from '@/features/email/services/referral-generator.service';
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
    let body: { jobDescription?: string; hrEmail?: string; generateReferral?: boolean };
    try {
      body = await request.json();
    } catch {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        statusCode: 400,
      });
    }

    const { jobDescription, hrEmail, generateReferral = true } = body;

    // Basic presence validation
    if (!jobDescription || typeof jobDescription !== 'string') {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Job description is required',
        statusCode: 400,
      });
    }

    if (!hrEmail || typeof hrEmail !== 'string') {
      // hrEmail is optional — user can use HR Contact Finder for bulk send instead
    }

    const userId = session.user.id;

    if (generateReferral) {
      // Generate both HR email and referral email in parallel
      const [hrEmailResult, referralEmailResult] = await Promise.allSettled([
        generateEmail({
          userId,
          jobDescription,
          hrEmail: hrEmail || undefined,
        }),
        generateReferralEmail({
          userId,
          jobDescription,
        }),
      ]);

      // HR email generation is required — if it fails, throw the error
      if (hrEmailResult.status === 'rejected') {
        throw hrEmailResult.reason;
      }

      // Referral email failure is handled independently — still return HR email
      const response: {
        hrEmail: typeof hrEmailResult.value;
        referralEmail?: Awaited<ReturnType<typeof generateReferralEmail>>;
        referralError?: string;
      } = {
        hrEmail: hrEmailResult.value,
      };

      if (referralEmailResult.status === 'fulfilled') {
        response.referralEmail = referralEmailResult.value;
      } else {
        // Log the referral failure but don't block the response
        console.error('[Email Generate] Referral generation failed:', referralEmailResult.reason);
        response.referralError = 'Referral email generation failed. Please try again.';
      }

      return NextResponse.json(response, { status: 200 });
    } else {
      // Only generate HR email (legacy behavior)
      const email = await generateEmail({
        userId,
        jobDescription,
        hrEmail: hrEmail || undefined,
      });

      return NextResponse.json({ hrEmail: email }, { status: 200 });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
