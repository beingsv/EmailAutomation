/**
 * POST /api/email/send-bulk
 * Sends an email to multiple recipients sequentially, streaming progress events.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 *
 * Request body: { recipients: string[], subject: string, body: string }
 * Response: Streamed newline-delimited JSON of BulkSendProgressEvent objects
 *
 * Each progress event has type "progress" with current/total/recipientEmail/status.
 * The final event has type "complete" with a summary of totalSent, totalFailed, and per-recipient results.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendToMultiple } from '@/features/hr-contact-finder/services/bulk-sender.service';
import type { BulkSendRequest, BulkSendProgressEvent } from '@/features/hr-contact-finder/types';

export async function POST(request: Request) {
  // Authenticate request using existing NextAuth session check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'You must be logged in to send emails' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: BulkSendRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { recipients, subject, body: emailBody } = body;

  // Validate required fields
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return new Response(
      JSON.stringify({ error: 'recipients must be a non-empty array of email addresses' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!subject || !emailBody) {
    return new Response(
      JSON.stringify({ error: 'subject and body are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const userId = session.user.id;

  // Use ReadableStream to stream BulkSendProgressEvent objects as newline-delimited JSON
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
          // Pipe each yielded progress event to the stream
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
