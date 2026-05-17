/**
 * Unit tests for the Email Generator Service.
 * Tests input validation, response parsing, and integration with AI service.
 *
 * Validates: Requirements 3.1, 3.2, 3.4, 3.5, 3.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseEmailResponse, generateEmail } from './email-generator.service';

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

describe('email-generator.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseEmailResponse', () => {
    it('should parse a well-formatted AI response with labeled sections', () => {
      const response = `SUBJECT: Application for Senior Software Engineer Position
GREETING: Dear Hiring Manager,
BODY: I am writing to express my strong interest in the Senior Software Engineer position at your company. With over 5 years of experience in full-stack development, I believe I am an excellent fit for this role.

My expertise in React, Node.js, and cloud technologies aligns well with your requirements.
CLOSING: Best regards,
John Doe`;

      const result = parseEmailResponse(response);

      expect(result.subject).toBe('Application for Senior Software Engineer Position');
      expect(result.greeting).toBe('Dear Hiring Manager,');
      expect(result.body).toContain('I am writing to express my strong interest');
      expect(result.body).toContain('React, Node.js, and cloud technologies');
      expect(result.closing).toContain('Best regards,');
      expect(result.closing).toContain('John Doe');
      expect(result.fullContent).toContain(result.greeting);
      expect(result.fullContent).toContain(result.body);
      expect(result.fullContent).toContain(result.closing);
    });

    it('should truncate subject to 120 characters if too long', () => {
      const longSubject = 'A'.repeat(150);
      const response = `SUBJECT: ${longSubject}
GREETING: Dear Hiring Manager,
BODY: This is the body of the email.
CLOSING: Best regards`;

      const result = parseEmailResponse(response);

      expect(result.subject.length).toBeLessThanOrEqual(120);
      expect(result.subject.endsWith('...')).toBe(true);
    });

    it('should handle response without proper labels using fallback parsing', () => {
      const response = `Application for Developer Role

Dear Hiring Manager,

I am excited to apply for the Developer position. My background in software engineering makes me a strong candidate.

I have extensive experience with JavaScript and Python.

Best regards,
Jane Smith`;

      const result = parseEmailResponse(response);

      expect(result.subject).toBeTruthy();
      expect(result.greeting).toBeTruthy();
      expect(result.body).toBeTruthy();
      expect(result.closing).toBeTruthy();
    });

    it('should provide defaults for minimal response', () => {
      const response = 'Just a single paragraph of text.';

      const result = parseEmailResponse(response);

      expect(result.subject).toBeTruthy();
      expect(result.greeting).toBeTruthy();
      expect(result.body).toBeTruthy();
      expect(result.closing).toBeTruthy();
    });

    it('should construct fullContent from greeting, body, and closing', () => {
      const response = `SUBJECT: Test Subject
GREETING: Hello,
BODY: This is the body.
CLOSING: Best regards,
John Doe
john@email.com
1234567890`;

      const result = parseEmailResponse(response);

      expect(result.fullContent).toBe('Hello,\n\nThis is the body.\n\nBest regards,\nJohn Doe\njohn@email.com\n1234567890');
    });
  });

  describe('generateEmail', () => {
    const validParams = {
      userId: 'user-123',
      jobDescription: 'We are looking for a senior software engineer with 5+ years of experience in React and Node.js.',
      hrEmail: 'hr@company.com',
    };

    const mockResumeText = 'Experienced software engineer with 7 years of experience in React, Node.js, TypeScript, and cloud technologies. Led multiple projects at Fortune 500 companies.';

    it('should reject job description shorter than 50 characters', async () => {
      await expect(
        generateEmail({
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

    it('should reject invalid HR email format', async () => {
      await expect(
        generateEmail({
          ...validParams,
          hrEmail: 'not-an-email',
        })
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        message: expect.stringContaining('Invalid HR email'),
      });

      expect(mockGetResumeText).not.toHaveBeenCalled();
      expect(mockGenerateCompletion).not.toHaveBeenCalled();
    });

    it('should return 400 when user has no resume', async () => {
      mockGetResumeText.mockResolvedValue(null);

      await expect(generateEmail(validParams)).rejects.toMatchObject({
        code: 'NO_RESUME',
        statusCode: 400,
        message: expect.stringContaining('upload a resume'),
      });

      expect(mockGenerateCompletion).not.toHaveBeenCalled();
    });

    it('should call AI service with constructed prompt and return structured email', async () => {
      mockGetResumeText.mockResolvedValue(mockResumeText);
      mockGenerateCompletion.mockResolvedValue({
        content: `SUBJECT: Application for Senior Software Engineer
GREETING: Dear Hiring Manager,
BODY: I am writing to express my interest in the Senior Software Engineer position. With 7 years of experience in React and Node.js, I am confident I can contribute significantly to your team.
CLOSING: Best regards,
John Doe`,
        tokensUsed: 200,
        latencyMs: 1500,
      });

      const result = await generateEmail(validParams);

      expect(result.subject).toBe('Application for Senior Software Engineer');
      expect(result.greeting).toBe('Dear Hiring Manager,');
      expect(result.body).toContain('Senior Software Engineer');
      expect(result.closing).toContain('Best regards,');
      expect(result.fullContent).toContain(result.greeting);
      expect(result.fullContent).toContain(result.body);
      expect(result.fullContent).toContain(result.closing);

      // Verify AI service was called with prompt containing resume and JD
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.stringContaining('RESUME:'),
        expect.objectContaining({
          temperature: 0.7,
          maxTokens: 2000,
        })
      );
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.stringContaining('JOB DESCRIPTION:'),
        expect.anything()
      );
    });

    it('should return 503 when AI service fails', async () => {
      mockGetResumeText.mockResolvedValue(mockResumeText);
      mockGenerateCompletion.mockRejectedValue(new Error('AI service timeout'));

      await expect(generateEmail(validParams)).rejects.toMatchObject({
        code: 'AI_SERVICE_ERROR',
        statusCode: 503,
        message: expect.stringContaining('try again'),
      });
    });

    it('should enforce subject max 120 chars in generated email', async () => {
      mockGetResumeText.mockResolvedValue(mockResumeText);
      const longSubject = 'A'.repeat(150);
      mockGenerateCompletion.mockResolvedValue({
        content: `SUBJECT: ${longSubject}
GREETING: Dear Hiring Manager,
BODY: Email body content here.
CLOSING: Best regards`,
        tokensUsed: 100,
        latencyMs: 1000,
      });

      const result = await generateEmail(validParams);

      expect(result.subject.length).toBeLessThanOrEqual(120);
    });

    it('should accept job description of exactly 50 characters', async () => {
      mockGetResumeText.mockResolvedValue(mockResumeText);
      mockGenerateCompletion.mockResolvedValue({
        content: `SUBJECT: Application
GREETING: Dear Hiring Manager,
BODY: Body text.
CLOSING: Regards`,
        tokensUsed: 50,
        latencyMs: 500,
      });

      const jd = 'A'.repeat(50); // exactly 50 chars
      const result = await generateEmail({
        ...validParams,
        jobDescription: jd,
      });

      expect(result.subject).toBeTruthy();
    });
  });
});
