/**
 * Department Mapper Service
 *
 * Maps a job description to a Hunter.io department filter value.
 * Uses keyword matching first (fast, free), falls back to AI if inconclusive.
 * Defaults to "it" when mapping fails or returns an invalid value.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 1.2, 1.3
 */

import { generateCompletion } from '../../ai-service/services/ai.service';

/**
 * The 14 valid Hunter.io department filter values.
 */
export const VALID_DEPARTMENTS = [
  'executive',
  'it',
  'finance',
  'management',
  'sales',
  'legal',
  'support',
  'hr',
  'marketing',
  'communication',
  'education',
  'design',
  'health',
  'operations',
] as const;

export type HunterDepartment = (typeof VALID_DEPARTMENTS)[number];

/**
 * Default department when mapping fails or is inconclusive.
 */
const DEFAULT_DEPARTMENT: HunterDepartment = 'it';

/**
 * Keyword-to-department lookup table.
 * Each entry maps a set of keywords (lowercased) to a Hunter.io department.
 */
const KEYWORD_MAP: Array<{ keywords: string[]; department: HunterDepartment }> = [
  {
    keywords: [
      'software engineer', 'developer', 'web', 'backend', 'frontend',
      'full-stack', 'devops', 'sre', 'data engineer', 'data scientist',
      'qa', 'test engineer', 'cloud', 'infrastructure',
    ],
    department: 'it',
  },
  {
    keywords: [
      'graphic design', 'ux', 'ui design', 'product design',
      'visual design', 'interaction design',
    ],
    department: 'design',
  },
  {
    keywords: [
      'sales', 'business development', 'account manager',
      'account executive', 'sdr', 'bdr',
    ],
    department: 'sales',
  },
  {
    keywords: [
      'marketing', 'content', 'seo', 'growth',
      'digital marketing', 'brand',
    ],
    department: 'marketing',
  },
  {
    keywords: [
      'finance', 'accounting', 'fp&a', 'controller',
      'treasury', 'audit',
    ],
    department: 'finance',
  },
  {
    keywords: [
      'legal', 'compliance', 'counsel', 'paralegal', 'regulatory',
    ],
    department: 'legal',
  },
  {
    keywords: [
      'executive', 'ceo', 'cto', 'vp', 'director', 'chief',
    ],
    department: 'executive',
  },
  {
    keywords: [
      'operations', 'supply chain', 'logistics', 'procurement',
    ],
    department: 'operations',
  },
  {
    keywords: [
      'customer support', 'customer success', 'helpdesk', 'technical support',
    ],
    department: 'support',
  },
  {
    keywords: [
      'hr', 'recruiter', 'talent acquisition', 'people operations',
    ],
    department: 'hr',
  },
  {
    keywords: [
      'communications', 'pr', 'public relations', 'media',
    ],
    department: 'communication',
  },
  {
    keywords: [
      'health', 'medical', 'clinical', 'healthcare', 'nurse', 'physician',
    ],
    department: 'health',
  },
  {
    keywords: [
      'education', 'training', 'learning', 'instructor', 'professor',
    ],
    department: 'education',
  },
  {
    keywords: [
      'project manager', 'program manager', 'product manager', 'scrum master',
    ],
    department: 'management',
  },
];

/**
 * Checks if a value is a valid Hunter.io department.
 */
export function isValidDepartment(value: string): value is HunterDepartment {
  return VALID_DEPARTMENTS.includes(value as HunterDepartment);
}

/**
 * Attempts to match the job description against the keyword table.
 * Returns the matched department or null if no keywords match.
 */
export function matchKeywords(jobDescription: string): HunterDepartment | null {
  if (!jobDescription || jobDescription.trim() === '') {
    return null;
  }

  const lowerJD = jobDescription.toLowerCase();

  for (const entry of KEYWORD_MAP) {
    for (const keyword of entry.keywords) {
      if (lowerJD.includes(keyword.toLowerCase())) {
        return entry.department;
      }
    }
  }

  return null;
}

/**
 * Falls back to AI to determine the department from the job description.
 * Returns a valid department or null if AI fails or returns an invalid value.
 */
async function aiDepartmentFallback(
  jobDescription: string
): Promise<HunterDepartment | null> {
  const systemPrompt = `You are a department classifier. Given a job description, respond with ONLY one of these department values: executive, it, finance, management, sales, legal, support, hr, marketing, communication, education, design, health, operations. Respond with a single word, nothing else.`;

  const response = await generateCompletion(
    `Classify this job description into a department:\n\n${jobDescription}`,
    {
      systemPrompt,
      temperature: 0,
      maxTokens: 10,
    }
  );

  const result = response.content.trim().toLowerCase();

  if (isValidDepartment(result)) {
    return result;
  }

  return null;
}

/**
 * Maps a job description to a Hunter.io department filter value.
 *
 * Strategy:
 * 1. If job description is empty, return default ("it")
 * 2. Attempt keyword matching (fast, free)
 * 3. If no keywords match, fall back to AI
 * 4. If AI fails or returns invalid value, return default ("it")
 *
 * Never throws — always returns a valid department string.
 */
export async function mapDepartment(jobDescription: string): Promise<HunterDepartment> {
  // Empty input → default
  if (!jobDescription || jobDescription.trim() === '') {
    return DEFAULT_DEPARTMENT;
  }

  // Step 1: Try keyword matching
  const keywordMatch = matchKeywords(jobDescription);
  if (keywordMatch) {
    return keywordMatch;
  }

  // Step 2: AI fallback (wrapped in try/catch to never block)
  try {
    const aiResult = await aiDepartmentFallback(jobDescription);
    if (aiResult) {
      return aiResult;
    }
  } catch {
    // AI failure is non-fatal — fall through to default
  }

  // Step 3: Default when all else fails
  return DEFAULT_DEPARTMENT;
}
