/**
 * Unit tests for Email Sender Service
 * Tests SMTP configuration, connection validation, and email sending.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock nodemailer
const mockVerify = vi.fn();
const mockSendMail = vi.fn();
const mockClose = vi.fn();

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      verify: mockVerify,
      sendMail: mockSendMail,
      close: mockClose,
    })),
  },
}));

// Mock prisma
const mockFindUnique = vi.fn();
const mockResumeFindUnique = vi.fn();
const mockUpsert = vi.fn();

vi.mock('@/shared/lib/db', () => ({
  prisma: {
    smtpConfig: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
    resume: {
      findUnique: (...args: unknown[]) => mockResumeFindUnique(...args),
    },
  },
}));

// Mock encryption
vi.mock('@/shared/lib/encryption', () => ({
  encrypt: vi.fn((text: string) => `encrypted_${text}`),
  decrypt: vi.fn((text: string) => text.replace('encrypted_', '')),
}));

import {
  sendEmail,
  configureSmtp,
  validateSmtpConnection,
  getSmtpConfig,
} from './email-sender.service';

describe('Email Sender Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateSmtpConnection', () => {
    it('returns true when SMTP connection is valid', async () => {
      mockVerify.mockResolvedValue(true);

      const result = await validateSmtpConnection({
        host: 'smtp.gmail.com',
        port: 587,
        username: 'test@gmail.com',
        password: 'app-password',
      });

      expect(result).toBe(true);
      expect(mockClose).toHaveBeenCalled();
    });

    it('returns false when SMTP connection fails', async () => {
      mockVerify.mockRejectedValue(new Error('Auth failed'));

      const result = await validateSmtpConnection({
        host: 'smtp.gmail.com',
        port: 587,
        username: 'test@gmail.com',
        password: 'wrong-password',
      });

      expect(result).toBe(false);
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('configureSmtp', () => {
    it('saves encrypted config when connection is valid', async () => {
      mockVerify.mockResolvedValue(true);
      mockUpsert.mockResolvedValue({});

      const result = await configureSmtp('user-1', {
        host: 'smtp.gmail.com',
        port: 587,
        username: 'test@gmail.com',
        password: 'app-password',
      });

      expect(result.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          create: expect.objectContaining({
            userId: 'user-1',
            host: 'smtp.gmail.com',
            port: 587,
            encryptedUsername: 'encrypted_test@gmail.com',
            encryptedPassword: 'encrypted_app-password',
          }),
        })
      );
    });

    it('returns error when connection validation fails', async () => {
      mockVerify.mockRejectedValue(new Error('Connection refused'));

      const result = await configureSmtp('user-1', {
        host: 'smtp.gmail.com',
        port: 587,
        username: 'test@gmail.com',
        password: 'wrong-password',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP connection validation failed');
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });

  describe('getSmtpConfig', () => {
    it('returns decrypted config when found', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'config-1',
        userId: 'user-1',
        host: 'smtp.gmail.com',
        port: 587,
        encryptedUsername: 'encrypted_test@gmail.com',
        encryptedPassword: 'encrypted_app-password',
      });

      const config = await getSmtpConfig('user-1');

      expect(config).toEqual({
        host: 'smtp.gmail.com',
        port: 587,
        username: 'test@gmail.com',
        password: 'app-password',
      });
    });

    it('returns null when no config exists', async () => {
      mockFindUnique.mockResolvedValue(null);

      const config = await getSmtpConfig('user-1');

      expect(config).toBeNull();
    });
  });

  describe('sendEmail', () => {
    it('sends email successfully and returns confirmation', async () => {
      // Mock getSmtpConfig via prisma
      mockFindUnique.mockResolvedValue({
        id: 'config-1',
        userId: 'user-1',
        host: 'smtp.gmail.com',
        port: 587,
        encryptedUsername: 'encrypted_test@gmail.com',
        encryptedPassword: 'encrypted_app-password',
      });
      // Mock resume lookup for attachment
      mockResumeFindUnique.mockResolvedValue({
        fileData: Buffer.from('%PDF-test-content'),
        filename: 'resume.pdf',
      });
      mockSendMail.mockResolvedValue({ messageId: 'msg-123' });

      const result = await sendEmail('user-1', {
        to: 'hr@company.com',
        subject: 'Application for Developer',
        body: 'Dear Hiring Manager...',
      });

      expect(result.success).toBe(true);
      expect(result.recipientEmail).toBe('hr@company.com');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@gmail.com',
          to: 'hr@company.com',
          subject: 'Application for Developer',
          text: 'Dear Hiring Manager...',
        })
      );
    });

    it('throws error when SMTP is not configured', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(
        sendEmail('user-1', {
          to: 'hr@company.com',
          subject: 'Test',
          body: 'Test body',
        })
      ).rejects.toThrow('SMTP is not configured');
    });

    it('returns failure result on SMTP send error', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'config-1',
        userId: 'user-1',
        host: 'smtp.gmail.com',
        port: 587,
        encryptedUsername: 'encrypted_test@gmail.com',
        encryptedPassword: 'encrypted_app-password',
      });
      mockResumeFindUnique.mockResolvedValue(null);
      mockSendMail.mockRejectedValue(new Error('Connection timeout'));

      const result = await sendEmail('user-1', {
        to: 'hr@company.com',
        subject: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send email');
      expect(result.error).toContain('Connection timeout');
    });
  });
});
