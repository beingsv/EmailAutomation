/**
 * Unit tests for ATS Scorer Service
 * Tests the LLM response parsing, score combination, and graceful degradation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseLLMResponse } from './ats-scorer.service';

// Mock dependencies
vi.mock('@/features/ai-service/services/ai.service', () => ({
  generateCompletion: vi.fn(),
}));

vi.mock('@/features/resume/services/resume.service', () => ({
  getResumeText: vi.fn(),
}));

vi.mock('@/shared/lib/db', () => ({
  prisma: {},
}));

describe('ATS Scorer Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseLLMResponse', () => {
    it('should parse a well-formatted LLM response', () => {
      const response = `SCORE: 75
SKILLS_GAPS:
- Docker experience
- Kubernetes knowledge
- CI/CD pipeline management
SUGGESTIONS:
- Add Docker and container orchestration skills to your resume
- Highlight any DevOps or CI/CD experience you have
- Consider getting Kubernetes certification`;

      const result = parseLLMResponse(response);

      expect(result.score).toBe(75);
      expect(result.skillsGaps).toHaveLength(3);
      expect(result.skillsGaps).toContain('Docker experience');
      expect(result.skillsGaps).toContain('Kubernetes knowledge');
      expect(result.skillsGaps).toContain('CI/CD pipeline management');
      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions[0]).toContain('Docker');
    });

    it('should handle score at boundaries (0 and 100)', () => {
      const responseZero = `SCORE: 0\nSKILLS_GAPS:\n- Everything\nSUGGESTIONS:\n- Start over`;
      const responseHundred = `SCORE: 100\nSKILLS_GAPS:\nSUGGESTIONS:\n- Keep it up`;

      expect(parseLLMResponse(responseZero).score).toBe(0);
      expect(parseLLMResponse(responseHundred).score).toBe(100);
    });

    it('should default to 50 if score is not found', () => {
      const response = `No score here\nSKILLS_GAPS:\n- Something\nSUGGESTIONS:\n- Do something`;
      expect(parseLLMResponse(response).score).toBe(50);
    });

    it('should ignore invalid scores (> 100)', () => {
      const response = `SCORE: 150\nSKILLS_GAPS:\n- Gap\nSUGGESTIONS:\n- Suggestion`;
      // Score > 100 is invalid, should default to 50
      expect(parseLLMResponse(response).score).toBe(50);
    });

    it('should limit skills gaps to 10', () => {
      const gaps = Array.from({ length: 15 }, (_, i) => `- Gap ${i + 1}`).join('\n');
      const response = `SCORE: 60\nSKILLS_GAPS:\n${gaps}\nSUGGESTIONS:\n- Suggestion 1\n- Suggestion 2\n- Suggestion 3`;

      const result = parseLLMResponse(response);
      expect(result.skillsGaps.length).toBeLessThanOrEqual(10);
    });

    it('should limit suggestions to 5', () => {
      const suggestions = Array.from({ length: 8 }, (_, i) => `- Suggestion ${i + 1}`).join('\n');
      const response = `SCORE: 60\nSKILLS_GAPS:\n- Gap 1\nSUGGESTIONS:\n${suggestions}`;

      const result = parseLLMResponse(response);
      expect(result.suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should pad suggestions to minimum 3 if fewer are provided', () => {
      const response = `SCORE: 60\nSKILLS_GAPS:\n- Gap 1\nSUGGESTIONS:\n- Only one suggestion`;

      const result = parseLLMResponse(response);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle empty response gracefully', () => {
      const result = parseLLMResponse('');
      expect(result.score).toBe(50);
      expect(result.skillsGaps).toHaveLength(0);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('calculateScore - score combination formula', () => {
    it('should correctly combine scores: round(0.4 * keyword + 0.6 * llm)', async () => {
      // Import after mocks are set up
      const { generateCompletion } = await import('@/features/ai-service/services/ai.service');
      const { getResumeText } = await import('@/features/resume/services/resume.service');
      const { calculateScore } = await import('./ats-scorer.service');

      vi.mocked(getResumeText).mockResolvedValue('Experienced software engineer with React, TypeScript, Node.js, and AWS expertise. Built scalable web applications.');
      vi.mocked(generateCompletion).mockResolvedValue({
        content: `SCORE: 80\nSKILLS_GAPS:\n- Python\n- Machine Learning\nSUGGESTIONS:\n- Add Python skills\n- Learn ML basics\n- Get AWS certification`,
        tokensUsed: 100,
        latencyMs: 500,
      });

      const result = await calculateScore('user-1', 'We are looking for a software engineer with experience in React, TypeScript, Node.js, Python, and Machine Learning. Must have AWS experience and strong problem-solving skills.');

      // LLM score is 80, keyword score varies but formula should be applied
      expect(result.llmScore).toBe(80);
      expect(result.overallScore).toBe(Math.round(0.4 * result.keywordScore + 0.6 * 80));
      expect(result.aiUnavailable).toBe(false);
      expect(result.skillsGaps.length).toBeLessThanOrEqual(10);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(3);
      expect(result.suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should gracefully degrade when AI fails', async () => {
      const { generateCompletion } = await import('@/features/ai-service/services/ai.service');
      const { getResumeText } = await import('@/features/resume/services/resume.service');
      const { calculateScore } = await import('./ats-scorer.service');

      vi.mocked(getResumeText).mockResolvedValue('Experienced software engineer with React, TypeScript, Node.js, and AWS expertise. Built scalable web applications.');
      vi.mocked(generateCompletion).mockRejectedValue(new Error('AI service unavailable'));

      const result = await calculateScore('user-1', 'We are looking for a software engineer with experience in React, TypeScript, Node.js, Python, and Machine Learning. Must have AWS experience and strong problem-solving skills.');

      expect(result.aiUnavailable).toBe(true);
      expect(result.llmScore).toBeNull();
      // Overall score should equal keyword score when AI is unavailable
      expect(result.overallScore).toBe(result.keywordScore);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(3);
    });

    it('should throw error when no resume exists', async () => {
      const { getResumeText } = await import('@/features/resume/services/resume.service');
      const { calculateScore } = await import('./ats-scorer.service');

      vi.mocked(getResumeText).mockResolvedValue(null);

      await expect(
        calculateScore('user-1', 'We are looking for a software engineer with experience in React, TypeScript, Node.js, Python, and Machine Learning. Must have AWS experience.')
      ).rejects.toThrow('Please upload a resume before performing ATS analysis');
    });

    it('should throw error for short job description', async () => {
      const { calculateScore } = await import('./ats-scorer.service');

      await expect(
        calculateScore('user-1', 'Too short')
      ).rejects.toThrow(/at least 100 characters/);
    });
  });
});
