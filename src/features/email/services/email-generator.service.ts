/**
 * Email Generator Service
 * Generates tailored job application emails using AI (Gemma 4) based on
 * the user's resume and a provided job description.
 *
 * Validates: Requirements 3.1, 3.2, 3.4, 3.5, 3.6
 */

import { generateCompletion } from '@/features/ai-service/services/ai.service';
import { getResumeText } from '@/features/resume/services/resume.service';
import { isValidEmail, isValidJobDescription, sanitizeForPrompt } from '@/shared/lib/validation';
import { AppError } from '@/shared/lib/errors';
import type { EmailGenerationParams, GeneratedEmail } from '../types';

const JD_MIN_LENGTH = 50;

/**
 * Extracts contact information (name, email, phone) from resume text.
 * Uses regex patterns to find common formats.
 */
function extractContactInfo(resumeText: string): { name: string; email: string; phone: string } {
  // Extract email
  const emailMatch = resumeText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const email = emailMatch?.[0] || '[Your Email]';

  // Extract phone (various formats: +91-XXXXX, (XXX) XXX-XXXX, XXX-XXX-XXXX, 10 digits)
  const phoneMatch = resumeText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]\d{5}[-.\s]\d{5}/);
  const phone = phoneMatch?.[0] || '[Your Phone]';

  // Extract name — typically the first line or first prominent text in a resume
  // Look for a name-like pattern at the beginning (capitalized words, no special chars)
  const lines = resumeText.split('\n').filter(l => l.trim().length > 0);
  let name = '[Your Name]';

  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim();
    // A name line is typically 2-4 capitalized words, no special characters, not too long
    if (
      trimmed.length >= 3 &&
      trimmed.length <= 40 &&
      /^[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]+){0,3}$/.test(trimmed) &&
      !trimmed.match(/resume|curriculum|vitae|objective|summary|experience|education|skills/i)
    ) {
      name = trimmed;
      break;
    }
  }

  // Fallback: if no name found from line matching, try the very first non-empty line
  if (name === '[Your Name]' && lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.length <= 40 && !firstLine.match(/resume|curriculum|vitae|http|@|\d{3}/i)) {
      name = firstLine;
    }
  }

  return { name, email, phone };
}

/**
 * Extracts years of experience from resume text.
 * Looks for explicit mentions like "3+ years", "3 years of experience",
 * or calculates from work history dates.
 */
function extractYearsOfExperience(resumeText: string): string {
  // Extract only the EXPERIENCE section (between "Experience" and "Education" headers)
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

  // Find ALL 4-digit years (2000+) in the experience section
  const allYears = [...experienceSection.matchAll(/\b(20\d{2})\b/g)].map(m => parseInt(m[1]));
  const currentYear = new Date().getFullYear();
  
  // Filter to valid years (not future years beyond next year)
  const validYears = allYears.filter(y => y >= 2000 && y <= currentYear + 1);

  if (validYears.length > 0) {
    const earliestYear = Math.min(...validYears);
    const totalYears = currentYear - earliestYear;
    if (totalYears > 0 && totalYears <= 40) {
      return `${totalYears}+`;
    }
  }

  // Pattern 2: Explicit mention in experience/summary context only
  const experienceContextPatterns = [
    /(\d+)\+?\s*years?\s+of\s+(?:professional\s+)?experience/i,
    /over\s+(\d+)\s*\+?\s*years/i,
    /(\d+)\+?\s*years?\s+(?:in|of)\s+(?:software|frontend|backend|full.?stack|web|development)/i,
    /experience\s*[:]\s*(\d+)\+?\s*years?/i,
    /total\s+experience\s*[:]\s*(\d+)/i,
  ];

  for (const pattern of experienceContextPatterns) {
    const match = resumeText.match(pattern);
    if (match) {
      const years = parseInt(match[1]);
      if (years > 0 && years <= 40) {
        return `${years}+`;
      }
    }
  }

  return '[X]+';
}

/**
 * Constructs the AI prompt for email generation.
 * Instructs the model to generate a professional job application email
 * with a structured format that only customizes company-specific parts.
 */
function buildEmailPrompt(resumeText: string, jobDescription: string): string {
  const yearsOfExperience = extractYearsOfExperience(resumeText);
  return `You are a professional job application email writer. Generate a SHORT, GENERIC job application email. Do NOT describe specific projects or technical achievements in detail.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Generate a professional job application email with the following clearly labeled sections. Each section must start on a new line with the exact label shown:

SUBJECT: (mention the specific role from the JD. Example: "Application for Frontend Developer Role")

GREETING: Dear Hiring Team,

BODY: (Generate the email body following this EXACT template. Do NOT deviate from this structure. Do NOT add extra paragraphs or elaborate on projects.)

---BEGIN TEMPLATE---
I hope you're doing well.

I am writing to express my interest in [ROLE FROM JD] opportunities at [COMPANY FROM JD]. I have over ${yearsOfExperience} years of experience in [BROAD DOMAIN like "frontend development" or "software engineering"], primarily working with [LIST 4-6 KEY SKILLS FROM RESUME] to build scalable and user-friendly applications.

In my current role, I work on developing [2-3 GENERIC ACTIVITIES like "reusable UI components, integrating APIs, improving application performance, and building production-grade features"]. I enjoy solving complex challenges and collaborating with cross-functional teams to deliver high-quality products.

Please find my profile summary below:
Total Experience: ${yearsOfExperience} Years
Current Role: [Job Title from resume]
Primary Skills: [Top 6-8 skills from resume matching the JD]
Current Company: [Company from resume]
Notice Period: 30 Days
Current Location: [Location from resume or placeholder]

I have attached my resume for your consideration. I would appreciate the opportunity to discuss how my experience and skills align with your requirements.

Thank you for your time and consideration. I look forward to hearing from you.
---END TEMPLATE---

CLOSING:
Best regards,
[Full Name from resume]
[Email from resume or placeholder]
[Phone or placeholder]

CRITICAL RULES:
- The subject MUST be under 120 characters
- Total Experience / years of experience is ALREADY calculated and inserted into the template as "${yearsOfExperience} years". Do NOT change this number. Use it exactly as shown. NEVER use years from the JD.
- The "current role" paragraph MUST be generic (2 sentences max). Say things like "developing components, integrating APIs, improving performance" — do NOT mention specific project names, specific systems, or technical architecture details
- Do NOT write things like "I engineer type-safe Design Language Systems" or "high-traffic CMS platforms" — keep it GENERIC
- Only the role name, company name, years of experience, and skills list should change between different applications
- Extract name, skills, experience years, company name from the resume
- Use [placeholder] for anything not found
- The "Thank you" line MUST only appear ONCE at the end of the BODY section. Do NOT repeat it in CLOSING.
- CLOSING must ONLY contain: "Best regards," followed by name, email, and phone. Nothing else.
- Do NOT include LinkedIn, GitHub, or portfolio links in the closing
- Use the exact section labels (SUBJECT:, GREETING:, BODY:, CLOSING:)`;
}

/**
 * Parses the AI response into structured email sections.
 * Looks for labeled sections (SUBJECT:, GREETING:, BODY:, CLOSING:).
 * Falls back to splitting the response into reasonable sections if labels are missing.
 */
export function parseEmailResponse(content: string): GeneratedEmail {
  const lines = content.trim();

  // Try to extract labeled sections using more robust patterns
  const subjectMatch = lines.match(/^SUBJECT:\s*([\s\S]*?)(?=\n\s*GREETING:)/m);
  const greetingMatch = lines.match(/^GREETING:\s*([\s\S]*?)(?=\n\s*BODY:)/m);
  const bodyMatch = lines.match(/^BODY:\s*([\s\S]*?)(?=\n\s*CLOSING:)/m);
  const closingMatch = lines.match(/CLOSING:\s*([\s\S]*)$/);

  // If the above didn't work, try inline patterns (labels might not be at line start)
  let subject = subjectMatch?.[1]?.trim() || '';
  let greeting = greetingMatch?.[1]?.trim() || '';
  let body = bodyMatch?.[1]?.trim() || '';
  let closing = closingMatch?.[1]?.trim() || '';

  // If body regex failed, try a simpler split approach
  if (!body && lines.includes('BODY:')) {
    const bodyStart = lines.indexOf('BODY:') + 5;
    const closingStart = lines.indexOf('CLOSING:', bodyStart);
    if (closingStart > bodyStart) {
      body = lines.slice(bodyStart, closingStart).trim();
    } else {
      body = lines.slice(bodyStart).trim();
    }
  }

  // Strip any remaining label prefixes that might have leaked
  subject = subject.replace(/^SUBJECT:\s*/i, '').trim();
  greeting = greeting.replace(/^GREETING:\s*/i, '').trim();
  body = body.replace(/^BODY:\s*/i, '').trim();
  closing = closing.replace(/^CLOSING:\s*/i, '').trim();

  // Remove "Thank you" / "I look forward" lines from closing — they belong in body only
  // But preserve everything after "Best regards" (name, email, phone)
  const bestRegardsMatch = closing.match(/(Best regards|Kind regards|Regards|Sincerely|Warm regards)[,.]?\s*\n?([\s\S]*)/i);
  if (bestRegardsMatch) {
    const signOff = bestRegardsMatch[1];
    const afterSignOff = bestRegardsMatch[2]?.trim() || '';
    closing = afterSignOff ? `${signOff},\n${afterSignOff}` : `${signOff},`;
  } else {
    // No sign-off found, strip thank you lines and keep what's left
    closing = closing.replace(/Thank you.*?\.\s*/gi, '').trim();
    closing = closing.replace(/I look forward.*?\.\s*/gi, '').trim();
    if (!closing) {
      closing = 'Best regards,';
    }
  }

  // If closing is just "Best regards," without name/contact, add placeholders
  if (closing.match(/^(Best regards|Kind regards|Regards|Sincerely|Warm regards)[,.]?\s*$/i)) {
    closing = `${closing}\n[Your Name]\n[Your Email]\n[Your Phone]`;
  }

  // Fallback: if parsing failed, try to split intelligently
  if (!subject || !greeting || !body || !closing) {
    const paragraphs = lines.split(/\n\n+/).filter((p) => p.trim().length > 0);

    if (paragraphs.length >= 4) {
      subject = subject || paragraphs[0].replace(/^(Subject|SUBJECT):?\s*/i, '').trim();
      greeting = greeting || paragraphs[1].trim();
      body = body || paragraphs.slice(2, -1).join('\n\n').trim();
      closing = closing || paragraphs[paragraphs.length - 1].trim();
    } else if (paragraphs.length >= 2) {
      subject = subject || 'Job Application';
      greeting = greeting || paragraphs[0].trim();
      body = body || paragraphs.slice(1, -1).join('\n\n').trim() || paragraphs[1]?.trim() || '';
      closing = closing || paragraphs[paragraphs.length - 1].trim();
    } else {
      // Last resort: use the entire content as body
      subject = subject || 'Job Application';
      greeting = greeting || 'Dear Hiring Manager,';
      body = body || lines;
      closing = closing || 'Best regards';
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
 * Generates a tailored job application email using AI.
 *
 * @param params - userId, jobDescription, hrEmail
 * @returns Structured email with subject, greeting, body, closing, fullContent
 * @throws AppError for validation failures, missing resume, or AI errors
 */
export async function generateEmail(params: EmailGenerationParams): Promise<GeneratedEmail> {
  const { userId, jobDescription, hrEmail } = params;

  // Req 3.6: Validate job description length
  if (!isValidJobDescription(jobDescription, JD_MIN_LENGTH)) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: `Job description must be at least ${JD_MIN_LENGTH} characters`,
      statusCode: 400,
    });
  }

  // Req 3.6: Validate HR email format (only if provided)
  if (hrEmail && !isValidEmail(hrEmail)) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'Invalid HR email address format',
      statusCode: 400,
    });
  }

  // Req 3.2: Check if user has a stored resume
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

  // Build the prompt
  const prompt = buildEmailPrompt(sanitizedResume, sanitizedJD);

  // Calculate years of experience up-front so we can force-correct the AI output
  const correctYears = extractYearsOfExperience(sanitizedResume);

  // Req 3.1, 3.5: Call AI service
  try {
    const aiResponse = await generateCompletion(prompt, {
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Req 3.4: Parse response into structured email
    const email = parseEmailResponse(aiResponse.content);

    // Extract contact info from resume and inject into closing if placeholders exist
    const contactInfo = extractContactInfo(resumeText);
    if (email.closing.includes('[Your Name]') || email.closing.includes('[Your Email]') || email.closing.includes('[Your Phone]')) {
      email.closing = email.closing
        .replace('[Your Name]', contactInfo.name)
        .replace('[Your Email]', contactInfo.email)
        .replace('[Your Phone]', contactInfo.phone);
      // Rebuild fullContent
      email.fullContent = `${email.greeting}\n\n${email.body}\n\n${email.closing}`;
    }

    // Force-correct years of experience in case the AI ignored our value
    if (correctYears !== '[X]+') {
      // Replace any "over N years", "N+ years", "N years" with the correct value
      email.body = email.body.replace(
        /over\s+\d+\+?\s*years?\s+of\s+experience/gi,
        `over ${correctYears} years of experience`
      );
      email.body = email.body.replace(
        /Total\s+Experience\s*:\s*\d+\+?\s*Years?/gi,
        `Total Experience: ${correctYears} Years`
      );
      // Rebuild fullContent
      email.fullContent = `${email.greeting}\n\n${email.body}\n\n${email.closing}`;
    }

    return email;
  } catch (error) {
    // Req 3.5: AI failure
    console.error('[Email Generator] AI service error:', error);
    throw new AppError({
      code: 'AI_SERVICE_ERROR',
      message: 'Email generation failed. Please try again.',
      statusCode: 503,
    });
  }
}
