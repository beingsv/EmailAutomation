/**
 * Referral Email Generator Service
 * Generates casual, professional referral request emails using AI (Gemma 4)
 * based on the user's resume and a provided job description.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import { generateCompletion } from '@/features/ai-service/services/ai.service';
import { getResumeText } from '@/features/resume/services/resume.service';
import { isValidJobDescription, sanitizeForPrompt } from '@/shared/lib/validation';
import { AppError } from '@/shared/lib/errors';
import type { ReferralEmailParams, GeneratedReferralEmail } from '../types';

const JD_MIN_LENGTH = 50;
const MAX_BODY_WORDS = 80;

/**
 * Extracts the sender's first name from the resume text.
 * Assumes the name appears at the very beginning of the resume.
 */
function extractFirstName(resumeText: string): string {
  // Most resumes start with the person's name on the first line
  const firstLine = resumeText.trim().split(/\n/)[0]?.trim() || '';
  // Take the first word as the first name (handles "Shiwam Vishwakarma" → "Shiwam")
  const firstName = firstLine.split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, '') || '';
  if (firstName.length >= 2 && firstName.length <= 20) {
    return firstName;
  }
  return '';
}

/**
 * Extracts experience level from resume text.
 * Looks for explicit years of experience or calculates from work history dates.
 */
function extractExperienceLevel(resumeText: string): string {
  // Look in experience section
  let experienceSection = resumeText;
  const expStart = resumeText.search(/\bexperience\b/i);
  const eduStart = resumeText.search(/\beducation\b/i);

  if (expStart !== -1) {
    if (eduStart !== -1 && eduStart > expStart) {
      experienceSection = resumeText.slice(expStart, eduStart);
    } else {
      experienceSection = resumeText.slice(expStart);
    }
  }

  // Find years from work history
  const allYears = [...experienceSection.matchAll(/\b(20\d{2})\b/g)].map(m => parseInt(m[1]));
  const currentYear = new Date().getFullYear();
  const validYears = allYears.filter(y => y >= 2000 && y <= currentYear + 1);

  if (validYears.length > 0) {
    const earliestYear = Math.min(...validYears);
    const totalYears = currentYear - earliestYear;
    if (totalYears > 0 && totalYears <= 40) {
      return `${totalYears}+ years`;
    }
  }

  // Explicit mention patterns
  const patterns = [
    /(\d+)\+?\s*years?\s+of\s+(?:professional\s+)?experience/i,
    /over\s+(\d+)\s*\+?\s*years/i,
    /(\d+)\+?\s*years?\s+(?:in|of)\s+(?:software|frontend|backend|full.?stack|web|development)/i,
  ];

  for (const pattern of patterns) {
    const match = resumeText.match(pattern);
    if (match) {
      const years = parseInt(match[1]);
      if (years > 0 && years <= 40) {
        return `${years}+ years`;
      }
    }
  }

  return 'several years';
}

/**
 * Constructs the AI prompt for referral email generation.
 * Requests casual tone, 150-word limit, shared tech background mention, and clear referral ask.
 *
 * Validates: Requirements 3.2, 3.3, 3.4
 */
function buildReferralPrompt(resumeText: string, jobDescription: string): string {
  const experienceLevel = extractExperienceLevel(resumeText);

  return `You are writing a casual, professional referral request email. The sender is a tech professional reaching out to someone who works at the target company in a similar technical department. The tone should be friendly and informal — like messaging a fellow engineer, not a recruiter.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Generate a concise referral request email with the following clearly labeled sections. Each section must start on a new line with the exact label shown:

SUBJECT: (Write an informal, personalized subject line. Examples: "Quick question about the [Role] opening at [Company]", "Fellow engineer reaching out about [Role] at [Company]", "Hey! Saw the [Role] position at [Company]")

GREETING: (Use a casual greeting like "Hey there," or "Hi," — NOT "Dear" or formal greetings)

BODY: (Write the email body following these rules:
- MAXIMUM 80 words. Be extremely concise — 3-4 short sentences max.
- Mention shared technical background (you're both in tech/engineering)
- Reference the specific role from the job description
- Highlight 2-3 matching technical skills that appear BOTH in the job description AND in the candidate's MOST RECENT role on the resume. Do NOT pick skills only listed under older/previous positions.
- Briefly mention experience level: ${experienceLevel}
- Include a clear, polite ask for a referral
- Keep the tone casual and conversational, like talking to a peer
- Do NOT be overly formal or use corporate jargon
- Do NOT include contact info or signature in the body
- Do NOT mention resume attachment or say "I've attached my resume")

CLOSING: (Use a casual sign-off with your first name only. Examples: "Cheers, Shiwam", "Thanks, Shiwam", "Appreciate it, Shiwam". Do NOT add a separate SIGNATURE line. The closing IS the signature — just the sign-off word and first name on one line.)

CRITICAL RULES:
- Subject MUST be informal and under 120 characters
- Body MUST be 80 words or less — brevity is key
- Tone MUST be casual professional — like messaging a colleague, not writing to HR
- MUST mention shared tech background
- MUST include 2-3 specific skills that appear in BOTH the job description AND the candidate's most recent/current role. Ignore skills from older positions that aren't in the JD.
- MUST clearly ask for a referral
- MUST mention the specific role title
- Do NOT mention resume, attachments, or "attached my resume" anywhere in the email
- Use the exact section labels (SUBJECT:, GREETING:, BODY:, CLOSING:)`;
}

/**
 * Parses the AI response into structured referral email sections.
 * Looks for labeled sections (SUBJECT:, GREETING:, BODY:, CLOSING:).
 */
export function parseReferralResponse(content: string): GeneratedReferralEmail {
  const lines = content.trim();

  // Extract labeled sections
  const subjectMatch = lines.match(/^SUBJECT:\s*([\s\S]*?)(?=\n\s*GREETING:)/m);
  const greetingMatch = lines.match(/^GREETING:\s*([\s\S]*?)(?=\n\s*BODY:)/m);
  const bodyMatch = lines.match(/^BODY:\s*([\s\S]*?)(?=\n\s*CLOSING:)/m);
  const closingMatch = lines.match(/CLOSING:\s*([\s\S]*)$/m);

  let subject = subjectMatch?.[1]?.trim() || '';
  let greeting = greetingMatch?.[1]?.trim() || '';
  let body = bodyMatch?.[1]?.trim() || '';
  let closing = closingMatch?.[1]?.trim() || '';

  // Fallback: try splitting by labels if regex failed
  if (!body && lines.includes('BODY:')) {
    const bodyStart = lines.indexOf('BODY:') + 5;
    const closingStart = lines.indexOf('CLOSING:', bodyStart);
    if (closingStart > bodyStart) {
      body = lines.slice(bodyStart, closingStart).trim();
    } else {
      body = lines.slice(bodyStart).trim();
    }
  }

  // Strip any remaining label prefixes
  subject = subject.replace(/^SUBJECT:\s*/i, '').trim();
  greeting = greeting.replace(/^GREETING:\s*/i, '').trim();
  body = body.replace(/^BODY:\s*/i, '').trim();
  closing = closing.replace(/^CLOSING:\s*/i, '').trim();

  // Strip any SIGNATURE: artifact the AI may add to closing
  closing = closing.replace(/\n*SIGNATURE:.*$/is, '').trim();

  // Fallback for completely unparseable content
  if (!subject || !greeting || !body || !closing) {
    const paragraphs = lines.split(/\n\n+/).filter(p => p.trim().length > 0);

    if (paragraphs.length >= 4) {
      subject = subject || paragraphs[0].replace(/^(Subject|SUBJECT):?\s*/i, '').trim();
      greeting = greeting || paragraphs[1].trim();
      body = body || paragraphs.slice(2, -1).join('\n\n').trim();
      closing = closing || paragraphs[paragraphs.length - 1].trim();
    } else if (paragraphs.length >= 2) {
      subject = subject || 'Quick question about an opening';
      greeting = greeting || paragraphs[0].trim();
      body = body || paragraphs.slice(1, -1).join('\n\n').trim() || paragraphs[1]?.trim() || '';
      closing = closing || paragraphs[paragraphs.length - 1].trim();
    } else {
      subject = subject || 'Quick question about an opening';
      greeting = greeting || 'Hey there,';
      body = body || lines;
      closing = closing || 'Cheers,';
    }
  }

  // Enforce subject max length (120 chars)
  if (subject.length > 120) {
    subject = subject.slice(0, 117) + '...';
  }

  const fullContent = `${greeting}\n\n${body}\n\n${closing}`;

  return {
    subject,
    greeting,
    body,
    closing,
    fullContent,
  };
}

/**
 * Enforces the 150-word body limit by truncating at the last complete sentence.
 * If the body exceeds 150 words, finds the last sentence boundary within the limit.
 *
 * Validates: Requirement 3.5
 */
export function enforceWordLimit(body: string): string {
  const words = body.split(/\s+/).filter(w => w.length > 0);

  if (words.length <= MAX_BODY_WORDS) {
    return body;
  }

  // Take first 150 words
  const truncatedText = words.slice(0, MAX_BODY_WORDS).join(' ');

  // Find the last complete sentence within the truncated text
  // Sentence endings: . ! ?
  const sentenceEndPattern = /[.!?]\s*$/;
  const sentences = truncatedText.match(/[^.!?]*[.!?]/g);

  if (sentences && sentences.length > 0) {
    // Rebuild from complete sentences until we hit the limit
    let result = '';
    for (const sentence of sentences) {
      const candidate = result + sentence;
      const candidateWords = candidate.trim().split(/\s+/).filter(w => w.length > 0);
      if (candidateWords.length <= MAX_BODY_WORDS) {
        result = candidate;
      } else {
        break;
      }
    }

    if (result.trim().length > 0) {
      return result.trim();
    }
  }

  // If no sentence boundary found, just take the 150 words
  // and try to end at a natural break point
  const hardTruncated = words.slice(0, MAX_BODY_WORDS).join(' ');

  // Try to find the last period, exclamation, or question mark
  const lastPeriod = hardTruncated.lastIndexOf('.');
  const lastExcl = hardTruncated.lastIndexOf('!');
  const lastQuestion = hardTruncated.lastIndexOf('?');
  const lastSentenceEnd = Math.max(lastPeriod, lastExcl, lastQuestion);

  if (lastSentenceEnd > 0) {
    return hardTruncated.slice(0, lastSentenceEnd + 1).trim();
  }

  // Last resort: just use the 150 words
  return hardTruncated;
}

/**
 * Generates a casual, professional referral request email using AI.
 *
 * @param params - userId, jobDescription
 * @returns Structured referral email with subject, greeting, body, closing, fullContent
 * @throws AppError for validation failures, missing resume, or AI errors
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */
export async function generateReferralEmail(
  params: ReferralEmailParams
): Promise<GeneratedReferralEmail> {
  const { userId, jobDescription } = params;

  // Validate job description length
  if (!isValidJobDescription(jobDescription, JD_MIN_LENGTH)) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: `Job description must be at least ${JD_MIN_LENGTH} characters`,
      statusCode: 400,
    });
  }

  // Check if user has a stored resume
  const resumeText = await getResumeText(userId);
  if (!resumeText) {
    throw new AppError({
      code: 'NO_RESUME',
      message: 'Please upload a resume before generating an email',
      statusCode: 400,
    });
  }

  // Sanitize inputs before constructing prompt
  const sanitizedJD = sanitizeForPrompt(jobDescription);
  const sanitizedResume = sanitizeForPrompt(resumeText);

  // Build the referral-specific prompt
  const prompt = buildReferralPrompt(sanitizedResume, sanitizedJD);

  // Req 3.6: Call AI service (Ollama Cloud / Gemma 4)
  try {
    const aiResponse = await generateCompletion(prompt, {
      temperature: 0.8,
      maxTokens: 1000,
    });

    // Parse response into structured referral email
    const email = parseReferralResponse(aiResponse.content);

    // Ensure closing includes the sender's first name
    const firstName = extractFirstName(resumeText);
    if (firstName && !email.closing.toLowerCase().includes(firstName.toLowerCase())) {
      // Closing is missing the name — append it
      // Strip trailing punctuation/whitespace, then add proper format
      const closingBase = email.closing.replace(/[,!\s]+$/, '').trim();
      email.closing = `${closingBase},\n${firstName}`;
    }

    // Req 3.5: Enforce 150-word body limit
    email.body = enforceWordLimit(email.body);

    // Rebuild fullContent after word limit enforcement
    email.fullContent = `${email.greeting}\n\n${email.body}\n\n${email.closing}`;

    return email;
  } catch (error) {
    // Req 3.7: AI failure — throw AppError with code 'AI_SERVICE_ERROR'
    if (error instanceof AppError) {
      throw error;
    }
    console.error('[Referral Generator] AI service error:', error);
    throw new AppError({
      code: 'AI_SERVICE_ERROR',
      message: 'Referral email generation failed. Please try again.',
      statusCode: 503,
    });
  }
}
