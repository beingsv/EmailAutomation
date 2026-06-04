/**
 * Bulk Sender Service
 * Sends emails sequentially to multiple recipients using the existing Email Sender service.
 * Yields progress events after each send attempt and continues even if individual emails fail.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.7
 */

import { sendEmail } from '@/features/email/services/email-sender.service';
import type {
  BulkSendParams,
  BulkSendProgress,
  BulkSendResult,
  SmartBulkSendParams,
  SmartBulkSendProgress,
  SmartBulkSendResult,
} from '../types';

/**
 * Sends the same email to multiple recipients sequentially, yielding progress after each attempt.
 *
 * - Req 6.1: Sends the generated email individually to each selected contact using the existing Email_Sender
 * - Req 6.2: Sends emails sequentially (one at a time) to avoid SMTP rate limiting
 * - Req 6.3: Returns a summary showing total emails sent and recipient list
 * - Req 6.4: On partial failure, reports which recipients succeeded and which failed
 * - Req 6.7: Attaches the user's resume (handled by the existing sendEmail service)
 *
 * @param params - The bulk send parameters (userId, recipients, subject, body)
 * @yields BulkSendProgress events after each send attempt
 * @returns BulkSendResult with totalSent, totalFailed, and per-recipient results
 */
export async function* sendToMultiple(params: BulkSendParams): AsyncGenerator<BulkSendProgress, BulkSendResult> {
  const { userId, recipients, subject, body } = params;
  const total = recipients.length;

  const results: Array<{ email: string; success: boolean; error?: string }> = [];
  let totalSent = 0;
  let totalFailed = 0;

  for (let i = 0; i < recipients.length; i++) {
    const recipientEmail = recipients[i];
    const current = i + 1;

    // Yield a "sending" progress event before attempting to send
    yield {
      current,
      total,
      recipientEmail,
      status: 'sending',
    };

    try {
      const result = await sendEmail(userId, {
        to: recipientEmail,
        subject,
        body,
      });

      if (result.success) {
        totalSent++;
        results.push({ email: recipientEmail, success: true });

        yield {
          current,
          total,
          recipientEmail,
          status: 'success',
        };
      } else {
        totalFailed++;
        const error = result.error || 'Unknown send failure';
        results.push({ email: recipientEmail, success: false, error });

        yield {
          current,
          total,
          recipientEmail,
          status: 'failed',
          error,
        };
      }
    } catch (error) {
      // Continue sending even if individual emails fail
      totalFailed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ email: recipientEmail, success: false, error: errorMessage });

      yield {
        current,
        total,
        recipientEmail,
        status: 'failed',
        error: errorMessage,
      };
    }
  }

  return {
    totalSent,
    totalFailed,
    results,
  };
}


/**
 * Sends emails to multiple recipients with smart routing based on contactType.
 * Routes the HR email template to contactType="hr" recipients and the referral
 * email template to contactType="tech" recipients.
 *
 * - Req 6.1: Sends the HR application email to HR contacts and the referral email to tech contacts
 * - Req 6.2: Determines which template to use based on the contactType field
 * - Req 6.3: Sends emails sequentially to avoid SMTP rate limiting
 * - Req 6.4: Returns a summary with totalHrSent, totalReferralSent, totalFailed breakdown
 * - Req 6.5: On partial failure, continues sending to remaining recipients and reports failures individually
 * - Req 6.7: Reuses the existing Email_Sender service and SMTP configuration
 *
 * @param params - SmartBulkSendParams with recipients, hrEmail template, and referralEmail template
 * @yields SmartBulkSendProgress events with contactType after each send attempt
 * @returns SmartBulkSendResult with type-based breakdown of sent/failed counts
 */
export async function* sendToMultipleSmart(
  params: SmartBulkSendParams
): AsyncGenerator<SmartBulkSendProgress, SmartBulkSendResult> {
  const { userId, recipients, hrEmail, referralEmail } = params;
  const total = recipients.length;

  const results: Array<{ email: string; contactType: 'hr' | 'tech'; success: boolean; error?: string }> = [];
  let totalHrSent = 0;
  let totalReferralSent = 0;
  let totalFailed = 0;

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const current = i + 1;
    const { email: recipientEmail, contactType } = recipient;

    // Select the appropriate email template based on contactType
    const emailTemplate = contactType === 'hr' ? hrEmail : referralEmail;

    // Yield a "sending" progress event before attempting to send
    yield {
      current,
      total,
      recipientEmail,
      contactType,
      status: 'sending',
    };

    try {
      const result = await sendEmail(userId, {
        to: recipientEmail,
        subject: emailTemplate.subject,
        body: emailTemplate.body,
      });

      if (result.success) {
        if (contactType === 'hr') {
          totalHrSent++;
        } else {
          totalReferralSent++;
        }
        results.push({ email: recipientEmail, contactType, success: true });

        yield {
          current,
          total,
          recipientEmail,
          contactType,
          status: 'success',
        };
      } else {
        totalFailed++;
        const error = result.error || 'Unknown send failure';
        results.push({ email: recipientEmail, contactType, success: false, error });

        yield {
          current,
          total,
          recipientEmail,
          contactType,
          status: 'failed',
          error,
        };
      }
    } catch (error) {
      // Continue sending even if individual emails fail
      totalFailed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ email: recipientEmail, contactType, success: false, error: errorMessage });

      yield {
        current,
        total,
        recipientEmail,
        contactType,
        status: 'failed',
        error: errorMessage,
      };
    }
  }

  return {
    totalHrSent,
    totalReferralSent,
    totalFailed,
    results,
  };
}
