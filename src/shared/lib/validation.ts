/**
 * Shared validation utilities for the AI Job Dashboard.
 * Provides email, password, job description validation and input sanitization.
 */

/**
 * Validates an email address format.
 * Checks for exactly one @, non-empty local part, and domain with at least one dot.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;

  // Must contain exactly one @
  const atParts = email.split('@');
  if (atParts.length !== 2) return false;

  const [localPart, domain] = atParts;

  // Local part must be non-empty
  if (localPart.length === 0) return false;

  // Domain must have at least one dot and non-empty parts
  if (!domain || domain.length === 0) return false;
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;

  // Each domain part must be non-empty
  if (domainParts.some((part) => part.length === 0)) return false;

  // Local part should not contain whitespace
  if (/\s/.test(localPart)) return false;

  // Domain should not contain whitespace
  if (/\s/.test(domain)) return false;

  return true;
}

/**
 * Validates password length (8-128 characters inclusive).
 */
export function isValidPassword(password: string): boolean {
  if (typeof password !== 'string') return false;
  return password.length >= 8 && password.length <= 128;
}

/**
 * Validates job description meets minimum length requirement.
 */
export function isValidJobDescription(text: string, minLength: number): boolean {
  if (typeof text !== 'string') return false;
  if (typeof minLength !== 'number' || minLength < 0) return false;
  return text.length >= minLength;
}

/**
 * Prompt injection patterns to strip from user input.
 * Case-insensitive matching.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /ignore\s+(all\s+)?prior\s+instructions/gi,
  /ignore\s+(all\s+)?above\s+instructions/gi,
  /disregard\s+(all\s+)?previous\s+instructions/gi,
  /disregard\s+(all\s+)?prior\s+instructions/gi,
  /forget\s+(all\s+)?previous\s+instructions/gi,
  /system\s*:/gi,
  /you\s+are\s+now/gi,
  /act\s+as\s+if/gi,
  /pretend\s+you\s+are/gi,
  /new\s+instructions\s*:/gi,
  /override\s+(all\s+)?instructions/gi,
  /bypass\s+(all\s+)?instructions/gi,
  /\[system\]/gi,
  /\[inst\]/gi,
  /<<\s*sys\s*>>/gi,
  /<<\s*\/sys\s*>>/gi,
];

const MAX_INPUT_LENGTH = 10_000;

/**
 * Sanitizes user input for use in AI prompts.
 * Strips prompt injection patterns and caps length at 10,000 characters.
 */
export function sanitizeForPrompt(input: string): string {
  if (typeof input !== 'string') return '';

  let sanitized = input;

  // Strip injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Truncate to max length
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_INPUT_LENGTH);
  }

  return sanitized;
}
