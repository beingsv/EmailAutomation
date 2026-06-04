import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendToMultiple } from '../bulk-sender.service';

// Mock the email sender service
vi.mock('@/features/email/services/email-sender.service', () => ({
  sendEmail: vi.fn(),
}));

import { sendEmail } from '@/features/email/services/email-sender.service';

const mockSendEmail = vi.mocked(sendEmail);

describe('BulkSenderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendToMultiple', () => {
    it('should send emails to all recipients sequentially', async () => {
      mockSendEmail.mockResolvedValue({ success: true, timestamp: new Date(), recipientEmail: '' });

      const params = {
        userId: 'user-1',
        recipients: ['a@test.com', 'b@test.com', 'c@test.com'],
        subject: 'Hello',
        body: 'Test body',
      };

      const generator = sendToMultiple(params);
      const events: Array<{ value: unknown; done: boolean | undefined }> = [];

      let result = await generator.next();
      while (!result.done) {
        events.push({ value: result.value, done: result.done });
        result = await generator.next();
      }

      // Final return value is the summary
      expect(result.value).toEqual({
        totalSent: 3,
        totalFailed: 0,
        results: [
          { email: 'a@test.com', success: true },
          { email: 'b@test.com', success: true },
          { email: 'c@test.com', success: true },
        ],
      });

      // sendEmail called once per recipient
      expect(mockSendEmail).toHaveBeenCalledTimes(3);
      expect(mockSendEmail).toHaveBeenCalledWith('user-1', { to: 'a@test.com', subject: 'Hello', body: 'Test body' });
      expect(mockSendEmail).toHaveBeenCalledWith('user-1', { to: 'b@test.com', subject: 'Hello', body: 'Test body' });
      expect(mockSendEmail).toHaveBeenCalledWith('user-1', { to: 'c@test.com', subject: 'Hello', body: 'Test body' });
    });

    it('should yield sending and success progress events for each recipient', async () => {
      mockSendEmail.mockResolvedValue({ success: true, timestamp: new Date(), recipientEmail: '' });

      const params = {
        userId: 'user-1',
        recipients: ['a@test.com', 'b@test.com'],
        subject: 'Subject',
        body: 'Body',
      };

      const generator = sendToMultiple(params);
      const events: unknown[] = [];

      let result = await generator.next();
      while (!result.done) {
        events.push(result.value);
        result = await generator.next();
      }

      // Each recipient gets a "sending" event followed by a "success" event
      expect(events).toEqual([
        { current: 1, total: 2, recipientEmail: 'a@test.com', status: 'sending' },
        { current: 1, total: 2, recipientEmail: 'a@test.com', status: 'success' },
        { current: 2, total: 2, recipientEmail: 'b@test.com', status: 'sending' },
        { current: 2, total: 2, recipientEmail: 'b@test.com', status: 'success' },
      ]);
    });

    it('should continue sending even if individual emails fail', async () => {
      mockSendEmail
        .mockResolvedValueOnce({ success: true, timestamp: new Date(), recipientEmail: 'a@test.com' })
        .mockResolvedValueOnce({ success: false, error: 'SMTP timeout' })
        .mockResolvedValueOnce({ success: true, timestamp: new Date(), recipientEmail: 'c@test.com' });

      const params = {
        userId: 'user-1',
        recipients: ['a@test.com', 'b@test.com', 'c@test.com'],
        subject: 'Subject',
        body: 'Body',
      };

      const generator = sendToMultiple(params);
      let result = await generator.next();
      while (!result.done) {
        result = await generator.next();
      }

      // All 3 recipients were attempted
      expect(mockSendEmail).toHaveBeenCalledTimes(3);

      // Summary reflects partial success
      expect(result.value).toEqual({
        totalSent: 2,
        totalFailed: 1,
        results: [
          { email: 'a@test.com', success: true },
          { email: 'b@test.com', success: false, error: 'SMTP timeout' },
          { email: 'c@test.com', success: true },
        ],
      });
    });

    it('should handle thrown errors from sendEmail gracefully', async () => {
      mockSendEmail
        .mockResolvedValueOnce({ success: true, timestamp: new Date(), recipientEmail: 'a@test.com' })
        .mockRejectedValueOnce(new Error('Network error'));

      const params = {
        userId: 'user-1',
        recipients: ['a@test.com', 'b@test.com'],
        subject: 'Subject',
        body: 'Body',
      };

      const generator = sendToMultiple(params);
      const events: unknown[] = [];

      let result = await generator.next();
      while (!result.done) {
        events.push(result.value);
        result = await generator.next();
      }

      expect(result.value).toEqual({
        totalSent: 1,
        totalFailed: 1,
        results: [
          { email: 'a@test.com', success: true },
          { email: 'b@test.com', success: false, error: 'Network error' },
        ],
      });

      // Should yield a failed event for the thrown error
      const failedEvent = events.find(
        (e: any) => e.recipientEmail === 'b@test.com' && e.status === 'failed'
      );
      expect(failedEvent).toBeDefined();
      expect((failedEvent as any).error).toBe('Network error');
    });

    it('should yield correct progress numbers (current/total)', async () => {
      mockSendEmail.mockResolvedValue({ success: true, timestamp: new Date(), recipientEmail: '' });

      const params = {
        userId: 'user-1',
        recipients: ['a@test.com', 'b@test.com', 'c@test.com'],
        subject: 'Subject',
        body: 'Body',
      };

      const generator = sendToMultiple(params);
      const events: unknown[] = [];

      let result = await generator.next();
      while (!result.done) {
        events.push(result.value);
        result = await generator.next();
      }

      // All events should have total = 3
      for (const event of events) {
        expect((event as any).total).toBe(3);
      }

      // "sending" events should have current = 1, 2, 3
      const sendingEvents = events.filter((e: any) => e.status === 'sending');
      expect(sendingEvents).toHaveLength(3);
      expect((sendingEvents[0] as any).current).toBe(1);
      expect((sendingEvents[1] as any).current).toBe(2);
      expect((sendingEvents[2] as any).current).toBe(3);
    });

    it('should handle empty recipients list', async () => {
      const params = {
        userId: 'user-1',
        recipients: [],
        subject: 'Subject',
        body: 'Body',
      };

      const generator = sendToMultiple(params);
      const result = await generator.next();

      // Should immediately return with empty summary
      expect(result.done).toBe(true);
      expect(result.value).toEqual({
        totalSent: 0,
        totalFailed: 0,
        results: [],
      });

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should handle single recipient', async () => {
      mockSendEmail.mockResolvedValue({ success: true, timestamp: new Date(), recipientEmail: 'solo@test.com' });

      const params = {
        userId: 'user-1',
        recipients: ['solo@test.com'],
        subject: 'Subject',
        body: 'Body',
      };

      const generator = sendToMultiple(params);
      const events: unknown[] = [];

      let result = await generator.next();
      while (!result.done) {
        events.push(result.value);
        result = await generator.next();
      }

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(result.value).toEqual({
        totalSent: 1,
        totalFailed: 0,
        results: [{ email: 'solo@test.com', success: true }],
      });
    });

    it('should handle all emails failing', async () => {
      mockSendEmail.mockResolvedValue({ success: false, error: 'SMTP down' });

      const params = {
        userId: 'user-1',
        recipients: ['a@test.com', 'b@test.com'],
        subject: 'Subject',
        body: 'Body',
      };

      const generator = sendToMultiple(params);
      let result = await generator.next();
      while (!result.done) {
        result = await generator.next();
      }

      expect(result.value).toEqual({
        totalSent: 0,
        totalFailed: 2,
        results: [
          { email: 'a@test.com', success: false, error: 'SMTP down' },
          { email: 'b@test.com', success: false, error: 'SMTP down' },
        ],
      });
    });
  });
});
