/**
 * ATS Scorer Service
 * Orchestrates keyword analysis (40%) + LLM semantic scoring (60%)
 * to produce a combined ATS compatibility score.
 *
 * Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { analyzeKeywords, validateJobDescription } from './keyword-analyzer';
import { generateCompletion } from '@/features/ai-service/services/ai.service';
import { getResumeText } from '@/features/resume/services/resume.service';
import { sanitizeForPrompt } from '@/shared/lib/validation';
import { AppError } from '@/shared/lib/errors';
import type { ATSResult } from '../types';

const MAX_SKILLS_GAPS = 10;
const MIN_SUGGESTIONS = 3;
const MAX_SUGGESTIONS = 5;

/**
 * Builds the AI prompt for semantic ATS scoring.
 * Instructs the model to return a structured response with score, gaps, and suggestions.
 */
function buildScoringPrompt(resumeText: string, jobDescription: string): string {
  return `You are an expert ATS (Applicant Tracking System) analyzer. Analyze how well the following resume matches the job description.

Provide your analysis in the following EXACT format:

SCORE: [number 0-100]
SKILLS_GAPS:
- [skill or qualification gap 1]
- [skill or qualification gap 2]
...
SUGGESTIONS:
- [improvement suggestion 1]
- [improvement suggestion 2]
- [improvement suggestion 3]
...

Rules:
- SCORE must be a single integer between 0 and 100 representing overall fit
- List up to 10 skills gaps (specific skills, qualifications, or experiences missing from the resume)
- Provide exactly 3 to 5 actionable improvement suggestions
- Be specific and actionable in your suggestions
- Do NOT include "years of experience" as a skills gap. The candidate's total experience should be calculated from their WORK HISTORY section only (not education). Focus only on technical skills, tools, and qualifications gaps.
- Do NOT mention experience duration mismatch in skills gaps or suggestions

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}`;
}

/**
 * Parses the LLM response to extract score, skills gaps, and suggestions.
 * Handles various formatting from the model.
 */
export function parseLLMResponse(response: string): {
  score: number;
  skillsGaps: string[];
  suggestions: string[];
} {
  let score = 50; // Default fallback
  const skillsGaps: string[] = [];
  const suggestions: string[] = [];

  // Extract score
  const scoreMatch = response.match(/SCORE\s*:\s*(\d+)/i);
  if (scoreMatch) {
    const parsed = parseInt(scoreMatch[1], 10);
    if (parsed >= 0 && parsed <= 100) {
      score = parsed;
    }
  }

  // Extract skills gaps section
  const gapsMatch = response.match(/SKILLS_GAPS\s*:([\s\S]*?)(?=SUGGESTIONS\s*:|$)/i);
  if (gapsMatch) {
    const gapsText = gapsMatch[1];
    const gapLines = gapsText.split('\n');
    for (const line of gapLines) {
      const trimmed = line.replace(/^[\s\-*•]+/, '').trim();
      if (trimmed.length > 0 && skillsGaps.length < MAX_SKILLS_GAPS) {
        skillsGaps.push(trimmed);
      }
    }
  }

  // Extract suggestions section
  const suggestionsMatch = response.match(/SUGGESTIONS\s*:([\s\S]*?)$/i);
  if (suggestionsMatch) {
    const suggestionsText = suggestionsMatch[1];
    const suggestionLines = suggestionsText.split('\n');
    for (const line of suggestionLines) {
      const trimmed = line.replace(/^[\s\-*•]+/, '').trim();
      if (trimmed.length > 0 && suggestions.length < MAX_SUGGESTIONS) {
        suggestions.push(trimmed);
      }
    }
  }

  // Ensure minimum suggestions (pad with generic ones if needed)
  while (suggestions.length < MIN_SUGGESTIONS) {
    const defaults = [
      'Tailor your resume keywords to match the job description more closely',
      'Add quantifiable achievements that demonstrate relevant experience',
      'Include specific technical skills mentioned in the job posting',
      'Highlight relevant certifications or training',
      'Restructure your resume to prioritize the most relevant experience',
    ];
    const next = defaults[suggestions.length];
    if (next) {
      suggestions.push(next);
    } else {
      break;
    }
  }

  return { score, skillsGaps, suggestions };
}

/**
 * Calculates the combined ATS score by orchestrating keyword analysis and LLM scoring.
 *
 * - Req 5.2: Sends JD and resume to AI service for LLM-based semantic scoring
 * - Req 5.3: Combined score = round(0.4 * keywordScore + 0.6 * llmScore)
 * - Req 5.4: Up to 20 matched/missing keywords, up to 10 gaps, 3-5 suggestions
 * - Req 5.5: If user has no resume, throw error prompting upload
 * - Req 5.6: If AI fails, return keyword score alone, set aiUnavailable: true
 */
export async function calculateScore(
  userId: string,
  jobDescription: string
): Promise<ATSResult> {
  // Validate job description
  const validation = validateJobDescription(jobDescription);
  if (!validation.valid) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: validation.error || 'Invalid job description',
      statusCode: 400,
    });
  }

  // Req 5.5: Check resume exists
  const resumeText = await getResumeText(userId);
  if (!resumeText) {
    throw new AppError({
      code: 'NO_RESUME',
      message: 'Please upload a resume before performing ATS analysis',
      statusCode: 400,
    });
  }

  // Sanitize inputs for AI prompt
  const sanitizedResume = sanitizeForPrompt(resumeText);
  const sanitizedJD = sanitizeForPrompt(jobDescription);

  // Step 1: Keyword/TF-IDF analysis (deterministic, 40% weight)
  const keywordAnalysis = analyzeKeywords(sanitizedResume, sanitizedJD);

  // Step 2: LLM semantic scoring (60% weight) with graceful degradation
  let llmScore: number | null = null;
  let skillsGaps: string[] = [];
  let suggestions: string[] = [];
  let aiUnavailable = false;

  try {
    const prompt = buildScoringPrompt(sanitizedResume, sanitizedJD);
    const aiResponse = await generateCompletion(prompt, {
      temperature: 0.3,
      systemPrompt: 'You are an expert ATS analyzer. Respond only in the exact format requested.',
    });

    const parsed = parseLLMResponse(aiResponse.content);
    llmScore = parsed.score;
    skillsGaps = parsed.skillsGaps;
    suggestions = parsed.suggestions;
  } catch (error) {
    // Req 5.6: Graceful degradation - AI unavailable
    console.error('[ATS Scorer] AI scoring failed, falling back to keyword-only:', error);
    aiUnavailable = true;

    // Provide default suggestions when AI is unavailable
    suggestions = [
      'Tailor your resume keywords to match the job description more closely',
      'Add quantifiable achievements that demonstrate relevant experience',
      'Include specific technical skills mentioned in the job posting',
    ];
  }

  // Step 3: Combine scores (Req 5.3)
  let overallScore: number;
  if (aiUnavailable || llmScore === null) {
    // Req 5.6: Use keyword score alone (already scaled 0-100)
    overallScore = keywordAnalysis.keywordScore;
  } else {
    // Combined: round(0.4 * keywordScore + 0.6 * llmScore)
    overallScore = Math.round(0.4 * keywordAnalysis.keywordScore + 0.6 * llmScore);
  }

  // Clamp overall score to 0-100
  overallScore = Math.max(0, Math.min(100, overallScore));

  return {
    overallScore,
    keywordScore: keywordAnalysis.keywordScore,
    llmScore,
    matchedKeywords: keywordAnalysis.matchedKeywords,
    missingKeywords: keywordAnalysis.missingKeywords,
    skillsGaps,
    suggestions,
    aiUnavailable,
  };
}
