/**
 * Unit tests for the Referral Email Generator Service.
 * Tests input validation, response parsing, word limit enforcement,
 * and integration with AI service.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseReferralResponse,
  enforceWordLimit,
  generateReferralEmail,
} from './referral-generator.service';

// Mock dependencies
vi.mock('@/features/ai-service/services/ai.service', () => ({
  generateCompletion: vi.fn(),
}));

vi.mock('@/features/resume/services/resume.service', () => ({
  getResumeText: vi.fn(),
}));

import { generateCompletion } from '@/features/ai-service/services/ai.service';
import { getResumeText } from '@/features/resume/services/resume.service';

const mockGenerateCompletion = vi.mocked(generateCompletion);
const mockGetResumeText = vi.mocked(getResumeText);

describe('referral-generator.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseReferralResponse', () => {
    it('should parse a well-formatted referral email response', () => {
      const response = `SUBJECT: Quick question about the Frontend Engineer opening at Acme
GREETING: Hey there,
BODY: I noticed your team at Acme has a Frontend Engineer opening and wanted to reach out. I'm a fellow engineer with 5+ years in React, TypeScript, and Node.js. I've been building scalable web apps and my skills in performance optimization and component architecture seem like a great fit for the role. Would you be open to referring me? I'd really appreciate it.
CLOSING: Cheers,
Alex`;

      const result = parseReferralResponse(response);

      expect(result.subject).toBe('Quick question about the Frontend Engineer opening at Acme');
      expect(result.greeting).toBe('Hey there,');
      expect(result.body).toContain('Frontend Engineer');
      expect(result.body).toContain('React, TypeScript, and Node.js');
      expect(result.closing).toContain('Cheers,');
      expect(result.closing).toContain('Alex');
      expect(result.fullContent).toContain(result.greeting);
      expect(result.fullContent).toContain(result.body);
      expect(result.fullContent).toContain(result.closing);
    });

    it('should truncate subject to 120 characters if too long', () => {
      const longSubject = 'A'.repeat(150);
      const response = `SUBJECT: ${longSubject}
GREETING: Hey,
BODY: This is the body of the referral email.
CLOSING: Cheers,
Alex`;

      const result = parseReferralResponse(response);

      expect(result.subject.length).toBeLessThanOrEqual(120);
      expect(result.subject.endsWith('...')).toBe(true);
    });

    it('should handle response without proper labels using fallback parsing', () => {
      const response = `Hey! About the Senior Dev role at TechCo

Hi there,

I saw your company has an opening for a Senior Developer and I thought I'd reach out. As a fellow engineer, I'd love to chat.

Thanks,
Sam`;

      const result = parseReferralResponse(response);

      expect(result.subject).toBeTruthy();
      expect(result.greeting).toBeTruthy();
      expect(result.body).toBeTruthy();
      expect(result.closing).toBeTruthy();
    });

    it('should provide defaults for minimal response', () => {
      const response = 'Just a single paragraph of text.';

      const result = parseReferralResponse(response);

      expect(result.subject).toBeTruthy();
      expect(result.greeting).toBeTruthy();
      expect(result.body).toBeTruthy();
      expect(result.closing).toBeTruthy();
    });

    it('should construct fullContent from greeting, body, and closing', () => {
      const response = `SUBJECT: About the opening
GREETING: Hey,
BODY: I wanted to ask about a referral.
CLOSING: Cheers,
Alex`;

      const result = parseReferralResponse(response);

      expect(result.fullContent).toBe('Hey,\n\nI wanted to ask about a referral.\n\nCheers,\nAlex');
    });
  });

  describe('enforceWordLimit', () => {
    it('should return body unchanged when under 150 words', () => {
      const body = 'This is a short body with only a few words.';
      expect(enforceWordLimit(body)).toBe(body);
    });

    it('should return body unchanged when exactly 80 words', () => {
      const words = Array.from({ length: 80 }, (_, i) => `word${i}`);
      const body = words.join(' ');
      expect(enforceWordLimit(body)).toBe(body);
    });

    it('should truncate body exceeding 80 words at last complete sentence', () => {
      // Create a body with multiple sentences that exceeds 80 words
      const sentence1 = 'This is the first sentence with some words in it.'; // ~10 words
      const sentence2 = 'Here is another sentence that adds more content to the body.'; // ~11 words
      const sentences = Array.from({ length: 20 }, () => sentence1 + ' ' + sentence2);
      const body = sentences.join(' ');

      const result = enforceWordLimit(body);
      const wordCount = result.split(/\s+/).filter(w => w.length > 0).length;

      expect(wordCount).toBeLessThanOrEqual(80);
      // Should end with a sentence boundary
      expect(result).toMatch(/[.!?]$/);
    });

    it('should handle body with no sentence boundaries by truncating at 80 words', () => {
      const words = Array.from({ length: 200 }, (_, i) => `word${i}`);
      const body = words.join(' ');

      const result = enforceWordLimit(body);
      const wordCount = result.split(/\s+/).filter(w => w.length > 0).length;

      expect(wordCount).toBeLessThanOrEqual(80);
    });

    it('should handle empty body', () => {
      expect(enforceWordLimit('')).toBe('');
    });

    it('should handle single word body', () => {
      expect(enforceWordLimit('hello')).toBe('hello');
    });
  });

  describe('generateReferralEmail', () => {
    const validParams = {
      userId: 'user-123',
      jobDescription:
        'We are looking for a Senior Frontend Engineer with 5+ years of experience in React, TypeScript, and Node.js at Acme Corp.',
    };

    const mockResumeText =
      'Alex Johnson\nSenior Software Engineer with 6+ years of experience in React, TypeScript, Node.js, GraphQL, and AWS. Currently at TechStart Inc building scalable web applications.';

    it('should reject job description shorter than 50 characters', async () => {
      await expect(
        generateReferralEmail({
          ...validParams,
          jobDescription: 'Short JD',
        })
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        message: expect.stringContaining('50 characters'),
      });

      expect(mockGetResumeText).not.toHaveBeenCalled();
      expect(mockGenerateCompletion).not.toHaveBeenCalled();
    });

    it('should return 400 when user has no resume', async () => {
      mockGetResumeText.mockResolvedValue(null);

      await expect(generateReferralEmail(validParams)).rejects.toMatchObject({
        code: 'NO_RESUME',
        statusCode: 400,
        message: expect.stringContaining('upload a resume'),
      });

      expect(mockGenerateCompletion).not.toHaveBeenCalled();
    });

    it('should call AI service and return structured referral email', async () => {
      mockGetResumeText.mockResolvedValue(mockResumeText);
      mockGenerateCompletion.mockResolvedValue({
        content: `SUBJECT: Quick question about the Senior Frontend Engineer role at Acme
GREETING: Hey there,
BODY: I noticed the Senior Frontend Engineer opening at Acme Corp and wanted to reach out as a fellow engineer. I have 6+ years of experience working with React, TypeScript, Node.js, GraphQL, and AWS, building scalable web applications. The role seems like a great match for my background. Would you be open to putting in a referral for me? I'd really appreciate it and happy to chat more if helpful.
CLOSING: Cheers,
Alex`,
        tokensUsed: 150,
        latencyMs: 1200,
      });

      const result = await generateReferralEmail(validParams);

      expect(result.subject).toContain('Senior Frontend Engineer');
      expect(result.greeting).toBe('Hey there,');
      expect(result.body).toContain('Acme');
      expect(result.body).toContain('React');
      expect(result.closing).toContain('Cheers,');
      expect(result.fullContent).toContain(result.greeting);
      expect(result.fullContent).toContain(result.body);
      expect(result.fullContent).toContain(result.closing);

      // Verify AI service was called with referral-specific prompt
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.stringContaining('casual, professional referral request email'),
        expect.objectContaining({
          temperature: 0.8,
          maxTokens: 1000,
        })
      );
    });

    it('should enforce 150-word body limit on AI response', async () => {
      mockGetResumeText.mockResolvedValue(mockResumeText);

      // Generate a body that exceeds 150 words
      const longBody = Array.from(
        { length: 30 },
        () => 'I have great skills in tech.'
      ).join(' ');

      mockGenerateCompletion.mockResolvedValue({
        content: `SUBJECT: About the role at Acme
GREETING: Hey,
BODY: ${longBody}
CLOSING: Cheers,
Alex`,
        tokensUsed: 300,
        latencyMs: 1500,
      });

      const result = await generateReferralEmail(validParams);
      const wordCount = result.body.split(/\s+/).filter(w => w.length > 0).length;

      expect(wordCount).toBeLessThanOrEqual(150);
    });

    it('should throw AI_SERVICE_ERROR when AI service fails', async () => {
      mockGetResumeText.mockResolvedValue(mockResumeText);
      mockGenerateCompletion.mockRejectedValue(new Error('AI service timeout'));

      await expect(generateReferralEmail(validParams)).rejects.toMatchObject({
        code: 'AI_SERVICE_ERROR',
        statusCode: 503,
        message: expect.stringContaining('try again'),
      });
    });

    it('should accept job description of exactly 50 characters', async () => {
      mockGetResumeText.mockResolvedValue(mockResumeText);
      mockGenerateCompletion.mockResolvedValue({
        content: `SUBJECT: About the opening
GREETING: Hey,
BODY: Would love to chat about a referral for the role.
CLOSING: Thanks,
Alex`,
        tokensUsed: 50,
        latencyMs: 500,
      });

      const jd = 'A'.repeat(50);
      const result = await generateReferralEmail({
        ...validParams,
        jobDescription: jd,
      });

      expect(result.subject).toBeTruthy();
    });
  });
});
