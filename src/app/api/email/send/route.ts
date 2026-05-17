/**
 * POST /api/email/send
 * Sends an email via the user's configured SMTP settings.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.6
 *
 * Request body: { to: string, subject: string, body: string }
 * Success response: { success: true, timestamp: string, recipientEmail: string }
 * Error responses:
 *   - 400: SMTP not configured (Req 4.6) or validation error
 *   - 401: Not authenticated
 *   - 502: SMTP connection/send failure (Req 4.3)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendEmail } from '@/features/email/services/email-sender.service';
import { handleApiError, AppError } from '@/shared/lib/errors';
import { isValidEmail } from '@/shared/lib/validation';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AppError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to send emails',
        statusCode: 401,
      });
    }

    const body = await request.json();
    const { to, subject, body: emailBody } = body;

    // Validate required fields
    if (!to || !subject || !emailBody) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields: to, subject, and body are required',
        statusCode: 400,
      });
    }

    // Validate email format
    if (!isValidEmail(to)) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid recipient email address format',
        statusCode: 400,
      });
    }

    // Send the email
    const result = await sendEmail(session.user.id, { to, subject, body: emailBody });

    if (!result.success) {
      // Req 4.3: SMTP failure — return 502 with retry/copy option
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: 'SMTP_FAILURE',
          canRetry: true,
          canCopy: true,
        },
        { status: 502 }
      );
    }

    // Req 4.2: Return confirmation with recipient email and timestamp
    return NextResponse.json({
      success: true,
      timestamp: result.timestamp?.toISOString(),
      recipientEmail: result.recipientEmail,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
