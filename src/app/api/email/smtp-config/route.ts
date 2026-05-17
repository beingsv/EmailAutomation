/**
 * GET /api/email/smtp-config — Return masked SMTP config for display
 * POST /api/email/smtp-config — Validate connection, encrypt, and save SMTP config
 *
 * Validates: Requirements 4.4, 4.5, 4.6
 *
 * GET response: { configured: true, host, port, username (masked) } or { configured: false }
 * POST body: { host: string, port: number, username: string, password: string }
 * POST response: { success: true } or { success: false, error: string }
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { configureSmtp, getSmtpConfig } from '@/features/email/services/email-sender.service';
import { handleApiError, AppError } from '@/shared/lib/errors';

/**
 * Masks an email address for display (e.g., "u***@gmail.com")
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const maskedLocal = local.charAt(0) + '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * GET — Returns the current SMTP configuration with masked credentials.
 * Req 4.6: Allows UI to check if SMTP is configured.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AppError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to view SMTP configuration',
        statusCode: 401,
      });
    }

    const config = await getSmtpConfig(session.user.id);

    if (!config) {
      return NextResponse.json({ configured: false });
    }

    // Return masked config for display
    return NextResponse.json({
      configured: true,
      host: config.host,
      port: config.port,
      username: maskEmail(config.username),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST — Validates SMTP connection and saves encrypted configuration.
 * Req 4.4: Validates connection before saving.
 * Req 4.5: Stores credentials encrypted at rest.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AppError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to configure SMTP',
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

    // Validate port is a number
    const portNum = Number(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Port must be a valid number between 1 and 65535',
        statusCode: 400,
      });
    }

    // Configure SMTP (validates connection, encrypts, and saves)
    const result = await configureSmtp(session.user.id, {
      host,
      port: portNum,
      username,
      password,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
