/**
 * Email Sender Service
 * Handles SMTP email sending via Nodemailer with Gmail support,
 * credential encryption, and connection validation.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { prisma } from '@/shared/lib/db';
import { encrypt, decrypt } from '@/shared/lib/encryption';
import { AppError } from '@/shared/lib/errors';
import type { SmtpConfig, EmailToSend, SendResult, ConfigResult } from '../types';

/**
 * Creates a Nodemailer transport configured for Gmail SMTP with STARTTLS.
 * Req 4.1: Uses TLS encryption via STARTTLS on port 587.
 */
function createTransport(config: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: false, // STARTTLS — upgrades to TLS after connecting
    auth: {
      user: config.username,
      pass: config.password,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });
}

/**
 * Sends an email via the user's configured SMTP settings.
 *
 * Req 4.1: Send email via SMTP/Gmail with TLS encryption
 * Req 4.2: Return confirmation with recipient email and timestamp on success
 * Req 4.3: On SMTP failure, return error with retry/copy option
 * Req 4.6: Prompt user to configure SMTP if not set up
 *
 * @param userId - The authenticated user's ID
 * @param email - The email to send (to, subject, body)
 * @returns SendResult with success status, timestamp, and recipient
 */
export async function sendEmail(userId: string, email: EmailToSend): Promise<SendResult> {
  // Req 4.6: Check if SMTP is configured
  const config = await getSmtpConfig(userId);
  if (!config) {
    throw new AppError({
      code: 'SMTP_NOT_CONFIGURED',
      message: 'SMTP is not configured. Please configure your SMTP settings before sending emails.',
      statusCode: 400,
    });
  }

  // Get resume file path for attachment
  const resume = await prisma.resume.findUnique({
    where: { userId },
    select: { filePath: true, filename: true },
  });

  const transport = createTransport(config);

  try {
    const mailOptions: {
      from: string;
      to: string;
      subject: string;
      text: string;
      attachments?: Array<{ filename: string; path: string }>;
    } = {
      from: config.username,
      to: email.to,
      subject: email.subject,
      text: email.body,
    };

    // Attach resume if available
    if (resume?.filePath) {
      mailOptions.attachments = [
        {
          filename: resume.filename || 'resume.pdf',
          path: resume.filePath,
        },
      ];
    }

    await transport.sendMail(mailOptions);

    // Req 4.2: Return confirmation with recipient and timestamp
    const timestamp = new Date();
    return {
      success: true,
      timestamp,
      recipientEmail: email.to,
    };
  } catch (error) {
    // Req 4.3: SMTP connection failure
    console.error('[Email Sender] SMTP send error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown SMTP error';
    return {
      success: false,
      error: `Failed to send email: ${errorMessage}. You can retry or copy the email content to clipboard.`,
    };
  } finally {
    transport.close();
  }
}

/**
 * Configures SMTP settings for a user.
 * Validates the connection first, then encrypts credentials and saves to DB.
 *
 * Req 4.4: Validate SMTP connection before saving configuration
 * Req 4.5: Store SMTP credentials encrypted at rest (AES-256-GCM)
 *
 * @param userId - The authenticated user's ID
 * @param config - SMTP configuration (host, port, username, password)
 * @returns ConfigResult indicating success or failure
 */
export async function configureSmtp(userId: string, config: SmtpConfig): Promise<ConfigResult> {
  // Req 4.4: Validate connection before saving
  const isValid = await validateSmtpConnection(config);
  if (!isValid) {
    return {
      success: false,
      error: 'SMTP connection validation failed. Please check your credentials and try again.',
    };
  }

  // Req 4.5: Encrypt credentials before storing
  const encryptedUsername = encrypt(config.username);
  const encryptedPassword = encrypt(config.password);

  // Upsert SMTP config (replace if exists)
  await prisma.smtpConfig.upsert({
    where: { userId },
    update: {
      host: config.host,
      port: config.port,
      encryptedUsername,
      encryptedPassword,
      updatedAt: new Date(),
    },
    create: {
      userId,
      host: config.host,
      port: config.port,
      encryptedUsername,
      encryptedPassword,
    },
  });

  return { success: true };
}

/**
 * Validates an SMTP connection by attempting to authenticate.
 * Does not save the configuration.
 *
 * Req 4.4: Validate the connection by sending a test authentication request
 *
 * @param config - SMTP configuration to test
 * @returns true if connection is valid, false otherwise
 */
export async function validateSmtpConnection(config: SmtpConfig): Promise<boolean> {
  const transport = createTransport(config);

  try {
    await transport.verify();
    return true;
  } catch (error) {
    console.error('[Email Sender] SMTP connection validation failed:', error);
    return false;
  } finally {
    transport.close();
  }
}

/**
 * Retrieves and decrypts the SMTP configuration for a user.
 *
 * @param userId - The authenticated user's ID
 * @returns Decrypted SmtpConfig or null if not configured
 */
export async function getSmtpConfig(userId: string): Promise<SmtpConfig | null> {
  const record = await prisma.smtpConfig.findUnique({
    where: { userId },
  });

  if (!record) {
    return null;
  }

  // Decrypt credentials
  const username = decrypt(record.encryptedUsername);
  const password = decrypt(record.encryptedPassword);

  return {
    host: record.host,
    port: record.port,
    username,
    password,
  };
}
