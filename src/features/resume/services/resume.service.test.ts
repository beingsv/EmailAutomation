/**
 * Unit tests for Resume Service
 * Tests upload validation, text extraction, and storage logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadResume, getResumeText, deleteResume } from './resume.service';

// Mock dependencies
vi.mock('@/shared/lib/db', () => ({
  prisma: {
    resume: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('./pdf-parser.service', () => ({
  extractTextFromPdf: vi.fn(),
}));

import { prisma } from '@/shared/lib/db';
import { extractTextFromPdf } from './pdf-parser.service';

const mockPrismaResume = prisma.resume as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const mockPrismaUser = (prisma as unknown as { user: { findUnique: ReturnType<typeof vi.fn> } }).user;

const mockExtractText = extractTextFromPdf as ReturnType<typeof vi.fn>;

describe('Resume Service', () => {
  const userId = 'test-user-123';
  const filename = 'resume.pdf';

  // Valid PDF buffer (starts with %PDF magic bytes)
  const validPdfBuffer = Buffer.concat([
    Buffer.from('%PDF-1.4 '),
    Buffer.alloc(100, 'x'),
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaResume.findUnique.mockResolvedValue(null);
    mockPrismaResume.create.mockResolvedValue({});
    mockPrismaResume.delete.mockResolvedValue({});
    mockPrismaUser.findUnique.mockResolvedValue({ id: userId });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('uploadResume', () => {
    it('should reject non-PDF files (invalid magic bytes)', async () => {
      const nonPdfBuffer = Buffer.from('This is not a PDF file');

      const result = await uploadResume(userId, nonPdfBuffer, 'document.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_TYPE');
    });

    it('should reject files exceeding 5MB', async () => {
      // Create a buffer > 5MB with PDF magic bytes
      const largePdfBuffer = Buffer.concat([
        Buffer.from('%PDF'),
        Buffer.alloc(5 * 1024 * 1024 + 1, 'x'),
      ]);

      const result = await uploadResume(userId, largePdfBuffer, filename);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SIZE_EXCEEDED');
    });

    it('should return EXTRACTION_FAILED when pdf-parse throws', async () => {
      mockExtractText.mockRejectedValue(new Error('Parse error'));

      const result = await uploadResume(userId, validPdfBuffer, filename);

      expect(result.success).toBe(false);
      expect(result.error).toBe('EXTRACTION_FAILED');
    });

    it('should return LOW_TEXT_CONTENT when extracted text < 50 chars', async () => {
      mockExtractText.mockResolvedValue({
        text: 'Short text',
        numPages: 1,
        info: {},
      });

      const result = await uploadResume(userId, validPdfBuffer, filename);

      expect(result.success).toBe(false);
      expect(result.error).toBe('LOW_TEXT_CONTENT');
      expect(result.characterCount).toBe(10);
    });

    it('should successfully upload a valid PDF with sufficient text', async () => {
      const longText = 'A'.repeat(100);
      mockExtractText.mockResolvedValue({
        text: longText,
        numPages: 2,
        info: {},
      });

      const result = await uploadResume(userId, validPdfBuffer, filename);

      expect(result.success).toBe(true);
      expect(result.extractedText).toBe(longText);
      expect(result.characterCount).toBe(100);
      expect(mockPrismaResume.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          filename,
          extractedText: longText,
          characterCount: 100,
        }),
      });
    });

    it('should delete existing resume before re-upload', async () => {
      // Simulate existing resume
      mockPrismaResume.findUnique.mockResolvedValue({
        userId,
        fileData: Buffer.from('%PDF-old'),
      });

      const longText = 'B'.repeat(100);
      mockExtractText.mockResolvedValue({
        text: longText,
        numPages: 1,
        info: {},
      });

      const result = await uploadResume(userId, validPdfBuffer, 'new-resume.pdf');

      expect(result.success).toBe(true);
      expect(mockPrismaResume.delete).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  describe('getResumeText', () => {
    it('should return null when no resume exists', async () => {
      mockPrismaResume.findUnique.mockResolvedValue(null);

      const result = await getResumeText(userId);

      expect(result).toBeNull();
    });

    it('should return extracted text when resume exists', async () => {
      mockPrismaResume.findUnique.mockResolvedValue({
        extractedText: 'My resume content here',
      });

      const result = await getResumeText(userId);

      expect(result).toBe('My resume content here');
    });
  });

  describe('deleteResume', () => {
    it('should do nothing when no resume exists', async () => {
      mockPrismaResume.findUnique.mockResolvedValue(null);

      await deleteResume(userId);

      expect(mockPrismaResume.delete).not.toHaveBeenCalled();
    });

    it('should delete file and DB record when resume exists', async () => {
      mockPrismaResume.findUnique.mockResolvedValue({
        userId,
        fileData: Buffer.from('%PDF-existing'),
      });

      await deleteResume(userId);

      expect(mockPrismaResume.delete).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });
});
