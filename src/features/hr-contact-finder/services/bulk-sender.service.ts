/**
 * Bulk Sender Service
 * Sends emails sequentially to multiple recipients using the existing Email Sender service.
 * Yields progress events after each send attempt and continues even if individual emails fail.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.7
 */

import { sendEmail } from '@/features/email/services/email-sender.service';
import type { BulkSendParams, BulkSendProgress, BulkSendResult } from '../types';

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
