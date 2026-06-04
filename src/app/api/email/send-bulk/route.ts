/**
 * POST /api/email/send-bulk
 * Sends emails to multiple recipients sequentially, streaming progress events.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 *
 * Supports two request formats:
 *
 * Legacy format (backward compatible):
 *   { recipients: string[], subject: string, body: string }
 *   Sends the same email to all recipients using sendToMultiple.
 *
 * Smart routing format:
 *   { recipients: Array<{ email, contactType }>, hrEmail: { subject, body }, referralEmail: { subject, body } }
 *   Routes HR email to hr contacts and referral email to tech contacts using sendToMultipleSmart.
 *
 * Response: Streamed newline-delimited JSON of BulkSendProgressEvent objects
 * Each progress event has type "progress" with current/total/recipientEmail/status (and contactType for smart format).
 * The final event has type "complete" with a summary.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendToMultiple, sendToMultipleSmart } from '@/features/hr-contact-finder/services/bulk-sender.service';
import type {
  BulkSendRequest,
  SmartBulkSendRequest,
  BulkSendProgressEvent,
} from '@/features/hr-contact-finder/types';

/**
 * Determines whether the request body uses the new smart routing format.
 * Smart format has recipients as objects with { email, contactType } and hrEmail/referralEmail fields.
 * Legacy format has recipients as plain strings with a single subject/body.
 */
function isSmartBulkSendRequest(body: unknown): body is SmartBulkSendRequest {
  if (!body || typeof body !== 'object') return false;
  const obj = body as Record<string, unknown>;

  // Check if recipients is an array of objects with email+contactType
  if (!Array.isArray(obj.recipients) || obj.recipients.length === 0) return false;
  const firstRecipient = obj.recipients[0];
  if (typeof firstRecipient !== 'object' || firstRecipient === null) return false;
  if (!('email' in firstRecipient) || !('contactType' in firstRecipient)) return false;

  // Check for hrEmail and referralEmail objects
  if (!obj.hrEmail || typeof obj.hrEmail !== 'object') return false;
  if (!obj.referralEmail || typeof obj.referralEmail !== 'object') return false;

  return true;
}

function isLegacyBulkSendRequest(body: unknown): body is BulkSendRequest {
  if (!body || typeof body !== 'object') return false;
  const obj = body as Record<string, unknown>;

  if (!Array.isArray(obj.recipients) || obj.recipients.length === 0) return false;
  if (typeof obj.recipients[0] !== 'string') return false;
  if (!obj.subject || !obj.body) return false;

  return true;
}

export async function POST(request: Request) {
  // Authenticate request using existing NextAuth session check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'You must be logged in to send emails' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.id;

  // Determine request format and handle accordingly
  if (isSmartBulkSendRequest(body)) {
    return handleSmartBulkSend(userId, body);
  } else if (isLegacyBulkSendRequest(body)) {
    return handleLegacyBulkSend(userId, body);
  } else {
    return new Response(
      JSON.stringify({ error: 'Invalid request body. Provide either legacy format (recipients[], subject, body) or smart format (recipients[{email, contactType}], hrEmail, referralEmail)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handles the new smart routing format.
 * Routes HR email to hr contacts and referral email to tech contacts.
 */
function handleSmartBulkSend(userId: string, body: SmartBulkSendRequest): Response {
  const { recipients, hrEmail, referralEmail } = body;

  // Validate hrEmail and referralEmail have required fields
  if (!hrEmail.subject || !hrEmail.body) {
    return new Response(
      JSON.stringify({ error: 'hrEmail must have subject and body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!referralEmail.subject || !referralEmail.body) {
    return new Response(
      JSON.stringify({ error: 'referralEmail must have subject and body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        const generator = sendToMultipleSmart({
          userId,
          recipients,
          hrEmail,
          referralEmail,
        });

        let result = await generator.next();

        while (!result.done) {
          const progressEvent: BulkSendProgressEvent = {
            type: 'progress',
            current: result.value.current,
            total: result.value.total,
            recipientEmail: result.value.recipientEmail,
            contactType: result.value.contactType,
            status: result.value.status === 'sending' ? undefined : result.value.status as 'success' | 'failed',
            error: result.value.error,
          };

          controller.enqueue(encoder.encode(JSON.stringify(progressEvent) + '\n'));
          result = await generator.next();
        }

        // Send final "complete" event with extended summary including type breakdown
        const completeEvent: BulkSendProgressEvent = {
          type: 'complete',
          summary: result.value,
        };

        controller.enqueue(encoder.encode(JSON.stringify(completeEvent) + '\n'));
      } catch (error) {
        // If an unexpected error occurs, send an error event
        const errorEvent: BulkSendProgressEvent = {
          type: 'complete',
          summary: {
            totalHrSent: 0,
            totalReferralSent: 0,
            totalFailed: recipients.length,
            results: recipients.map((r) => ({
              email: r.email,
              contactType: r.contactType,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            })),
          },
        };

        controller.enqueue(encoder.encode(JSON.stringify(errorEvent) + '\n'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * Handles the legacy format for backward compatibility.
 * Sends the same email to all recipients using sendToMultiple.
 */
function handleLegacyBulkSend(userId: string, body: BulkSendRequest): Response {
  const { recipients, subject, body: emailBody } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        const generator = sendToMultiple({
          userId,
          recipients,
          subject,
          body: emailBody,
        });

        let result = await generator.next();

        while (!result.done) {
          const progressEvent: BulkSendProgressEvent = {
            type: 'progress',
            current: result.value.current,
            total: result.value.total,
            recipientEmail: result.value.recipientEmail,
            status: result.value.status === 'sending' ? undefined : result.value.status as 'success' | 'failed',
            error: result.value.error,
          };

          controller.enqueue(encoder.encode(JSON.stringify(progressEvent) + '\n'));
          result = await generator.next();
        }

        // Send final "complete" event with summary
        const completeEvent: BulkSendProgressEvent = {
          type: 'complete',
          summary: result.value,
        };

        controller.enqueue(encoder.encode(JSON.stringify(completeEvent) + '\n'));
      } catch (error) {
        // If an unexpected error occurs, send an error event
        const errorEvent: BulkSendProgressEvent = {
          type: 'complete',
          summary: {
            totalSent: 0,
            totalFailed: recipients.length,
            results: recipients.map((email) => ({
              email,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            })),
          },
        };

        controller.enqueue(encoder.encode(JSON.stringify(errorEvent) + '\n'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
