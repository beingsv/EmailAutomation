/**
 * POST /api/email/smtp-test
 * Tests an SMTP connection without saving the configuration.
 *
 * Validates: Requirement 4.4
 *
 * Request body: { host: string, port: number, username: string, password: string }
 * Success response: { success: true, message: "SMTP connection successful" }
 * Failure response: { success: false, error: "Connection failed..." }
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { validateSmtpConnection } from '@/features/email/services/email-sender.service';
import { handleApiError, AppError } from '@/shared/lib/errors';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AppError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to test SMTP connection',
        statusCode: 401,
      });
    }

    const body = await request.json();
    const { host, port, username, password } = body;

    // Validate required fields
    if (!host || !port || !username || !password) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'All SMTP fields are required: host, port, username, password',
        statusCode: 400,
      });
    }

    // Validate port
    const portNum = Number(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Port must be a valid number between 1 and 65535',
        statusCode: 400,
      });
    }

    // Test the connection without saving
    const isValid = await validateSmtpConnection({
      host,
      port: portNum,
      username,
      password,
    });

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'SMTP connection failed. Please verify your host, port, username, and password.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'SMTP connection successful',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
