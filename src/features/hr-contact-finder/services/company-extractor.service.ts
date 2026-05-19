/**
 * Company Extractor Service
 *
 * Uses the AI service to extract company names from job descriptions.
 * Falls back gracefully — returns null on any failure so the user
 * can always enter the company name manually.
 *
 * Validates: Requirements 1.1, 1.3, 1.4, 1.5
 */

import { generateCompletion } from '@/features/ai-service/services/ai.service';

const EXTRACTION_PROMPT = `Extract the company name from the following job description. 
Return ONLY the company name, nothing else. No quotes, no explanation.
If you cannot identify a company name, respond with exactly "UNKNOWN".`;

/**
 * Sanitizes a raw company name by trimming whitespace and removing
 * characters that are not alphanumeric, spaces, hyphens, ampersands,
 * periods, or commas.
 */
export function sanitizeCompanyName(raw: string): string {
  const trimmed = raw.trim();
  // Keep only: alphanumeric, spaces, hyphens, ampersands, periods, commas
  return trimmed.replace(/[^a-zA-Z0-9\s\-&.,]/g, '');
}

/**
 * Extracts a company name from a job description using the AI service.
 * Returns null if extraction fails for any reason (AI unavailable,
 * parsing failure, timeout, etc.).
 */
export async function extractCompanyName(
  jobDescription: string
): Promise<string | null> {
  try {
    const response = await generateCompletion(jobDescription, {
      systemPrompt: EXTRACTION_PROMPT,
      temperature: 0.1,
      maxTokens: 50,
    });

    const extracted = response.content.trim();

    // If the AI couldn't identify a company name
    if (!extracted || extracted.toUpperCase() === 'UNKNOWN') {
      return null;
    }

    const sanitized = sanitizeCompanyName(extracted);

    // If sanitization removed everything meaningful
    if (!sanitized) {
      return null;
    }

    return sanitized;
  } catch {
    // Return null on any failure — never block the user
    return null;
  }
}
