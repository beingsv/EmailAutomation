import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeCompanyName, extractCompanyName } from '../company-extractor.service';

// Mock the AI service
vi.mock('@/features/ai-service/services/ai.service', () => ({
  generateCompletion: vi.fn(),
}));

import { generateCompletion } from '@/features/ai-service/services/ai.service';

const mockGenerateCompletion = vi.mocked(generateCompletion);

describe('CompanyExtractorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeCompanyName', () => {
    it('should trim leading and trailing whitespace', () => {
      expect(sanitizeCompanyName('  Google  ')).toBe('Google');
    });

    it('should preserve alphanumeric characters', () => {
      expect(sanitizeCompanyName('Google123')).toBe('Google123');
    });

    it('should preserve spaces within the name', () => {
      expect(sanitizeCompanyName('Palo Alto Networks')).toBe('Palo Alto Networks');
    });

    it('should preserve hyphens', () => {
      expect(sanitizeCompanyName('Hewlett-Packard')).toBe('Hewlett-Packard');
    });

    it('should preserve ampersands', () => {
      expect(sanitizeCompanyName('Johnson & Johnson')).toBe('Johnson & Johnson');
    });

    it('should preserve periods', () => {
      expect(sanitizeCompanyName('A.T. Kearney')).toBe('A.T. Kearney');
    });

    it('should preserve commas', () => {
      expect(sanitizeCompanyName('Goldman Sachs, Inc.')).toBe('Goldman Sachs, Inc.');
    });

    it('should remove special characters like @, #, $, !, etc.', () => {
      expect(sanitizeCompanyName('Google@#$!')).toBe('Google');
    });

    it('should remove parentheses and brackets', () => {
      expect(sanitizeCompanyName('Google (Alphabet)')).toBe('Google Alphabet');
    });

    it('should handle empty string', () => {
      expect(sanitizeCompanyName('')).toBe('');
    });

    it('should handle string with only special characters', () => {
      expect(sanitizeCompanyName('!@#$%^*()')).toBe('');
    });

    it('should handle string with only whitespace', () => {
      expect(sanitizeCompanyName('   ')).toBe('');
    });
  });

  describe('extractCompanyName', () => {
    it('should return extracted company name on success', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: 'Google',
        tokensUsed: 10,
        latencyMs: 500,
      });

      const result = await extractCompanyName('Software Engineer at Google...');
      expect(result).toBe('Google');
    });

    it('should trim whitespace from AI response', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: '  Microsoft  ',
        tokensUsed: 10,
        latencyMs: 500,
      });

      const result = await extractCompanyName('Job at Microsoft...');
      expect(result).toBe('Microsoft');
    });

    it('should return null when AI returns UNKNOWN', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: 'UNKNOWN',
        tokensUsed: 5,
        latencyMs: 300,
      });

      const result = await extractCompanyName('Some vague job description');
      expect(result).toBeNull();
    });

    it('should return null when AI returns empty string', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: '',
        tokensUsed: 0,
        latencyMs: 200,
      });

      const result = await extractCompanyName('No company here');
      expect(result).toBeNull();
    });

    it('should return null when AI service throws an error', async () => {
      mockGenerateCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const result = await extractCompanyName('Some job description');
      expect(result).toBeNull();
    });

    it('should return null when AI service times out', async () => {
      mockGenerateCompletion.mockRejectedValue(new Error('Request timed out'));

      const result = await extractCompanyName('Some job description');
      expect(result).toBeNull();
    });

    it('should sanitize the extracted company name', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: 'Google (Alphabet)!',
        tokensUsed: 10,
        latencyMs: 500,
      });

      const result = await extractCompanyName('Job at Google...');
      expect(result).toBe('Google Alphabet');
    });

    it('should return null if sanitization removes all content', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: '!!!@@@###',
        tokensUsed: 10,
        latencyMs: 500,
      });

      const result = await extractCompanyName('Some description');
      expect(result).toBeNull();
    });

    it('should pass job description to generateCompletion', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: 'TestCorp',
        tokensUsed: 10,
        latencyMs: 500,
      });

      await extractCompanyName('We are hiring at TestCorp');

      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        'We are hiring at TestCorp',
        expect.objectContaining({
          temperature: 0.1,
          maxTokens: 50,
        })
      );
    });

    it('should handle case-insensitive UNKNOWN response', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: 'unknown',
        tokensUsed: 5,
        latencyMs: 300,
      });

      const result = await extractCompanyName('Vague description');
      expect(result).toBeNull();
    });
  });
});
