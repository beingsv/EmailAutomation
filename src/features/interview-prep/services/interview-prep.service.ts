/**
 * Interview Prep Service
 * Generates categorized interview questions with suggested answers and preparation tips
 * based on the user's resume and a provided job description.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { generateCompletion } from '@/features/ai-service/services/ai.service';
import { getResumeText } from '@/features/resume/services/resume.service';
import { isValidJobDescription, sanitizeForPrompt } from '@/shared/lib/validation';
import { AppError } from '@/shared/lib/errors';
import type { InterviewPrepResult, InterviewQuestion } from '../types';

const JD_MIN_LENGTH = 50;
const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 15;
const MIN_PER_CATEGORY = 2;
const MIN_TIPS = 3;

type QuestionCategory = 'technical' | 'behavioral' | 'role-specific';

/**
 * Builds the AI prompt for interview preparation generation.
 * Instructs the model to return a structured response with categorized questions,
 * suggested answers, and preparation tips.
 */
function buildInterviewPrepPrompt(resumeText: string, jobDescription: string): string {
  return `You are an expert interview coach. Based on the following resume and job description, generate interview preparation materials.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Generate interview questions with suggested answers and preparation tips in the following EXACT format:

QUESTIONS:
[TECHNICAL]
Q: First technical question based on the job requirements?
A: Suggested answer tailored to the candidate's resume experience.

Q: Second technical question?
A: Suggested answer tailored to the candidate's resume experience.

Q: Third technical question?
A: Suggested answer tailored to the candidate's resume experience.

[BEHAVIORAL]
Q: First behavioral question?
A: Suggested answer using STAR method based on the candidate's experience.

Q: Second behavioral question?
A: Suggested answer using STAR method based on the candidate's experience.

Q: Third behavioral question?
A: Suggested answer using STAR method based on the candidate's experience.

[ROLE-SPECIFIC]
Q: First role-specific question about the position?
A: Suggested answer demonstrating knowledge of the role requirements.

Q: Second role-specific question?
A: Suggested answer demonstrating knowledge of the role requirements.

Q: Third role-specific question?
A: Suggested answer demonstrating knowledge of the role requirements.

TIPS:
- Preparation tip 1
- Preparation tip 2
- Preparation tip 3
- Preparation tip 4

RULES:
- Generate between 9 and 15 questions total
- Include at least 3 questions per category (TECHNICAL, BEHAVIORAL, ROLE-SPECIFIC)
- Each answer should be 2-4 sentences, tailored to the candidate's actual experience from their resume
- Technical questions should test skills mentioned in the job description
- Behavioral questions should use the STAR method (Situation, Task, Action, Result)
- Role-specific questions should relate to the specific position and company context
- Provide at least 4 preparation tips that are specific and actionable
- Tips should be relevant to the job role described in the job description
- Use the exact format shown above with [TECHNICAL], [BEHAVIORAL], [ROLE-SPECIFIC] headers
- Each question MUST start with "Q: " and each answer MUST start with "A: "`;
}

/**
 * Parses the AI response to extract categorized questions and tips.
 * Handles the structured text format with category headers.
 */
export function parseInterviewPrepResponse(response: string): InterviewPrepResult {
  const questions: InterviewQuestion[] = [];
  const tips: string[] = [];

  // Extract the QUESTIONS section
  const questionsMatch = response.match(/QUESTIONS\s*:([\s\S]*?)(?=\nTIPS\s*:|$)/i);
  const tipsMatch = response.match(/TIPS\s*:([\s\S]*)$/i);

  if (questionsMatch) {
    const questionsSection = questionsMatch[1];

    // Parse each category
    const categories: { pattern: RegExp; category: QuestionCategory }[] = [
      { pattern: /\[TECHNICAL\]([\s\S]*?)(?=\[BEHAVIORAL\]|\[ROLE[- ]SPECIFIC\]|$)/i, category: 'technical' },
      { pattern: /\[BEHAVIORAL\]([\s\S]*?)(?=\[TECHNICAL\]|\[ROLE[- ]SPECIFIC\]|$)/i, category: 'behavioral' },
      { pattern: /\[ROLE[- ]SPECIFIC\]([\s\S]*?)(?=\[TECHNICAL\]|\[BEHAVIORAL\]|$)/i, category: 'role-specific' },
    ];

    for (const { pattern, category } of categories) {
      const categoryMatch = questionsSection.match(pattern);
      if (categoryMatch) {
        const categoryText = categoryMatch[1];
        const qaPairs = extractQAPairs(categoryText);
        for (const qa of qaPairs) {
          questions.push({
            question: qa.question,
            category,
            suggestedAnswer: qa.answer,
          });
        }
      }
    }
  }

  // If structured parsing failed, try a fallback approach
  if (questions.length === 0) {
    const fallbackQuestions = extractQAPairsFallback(response);
    questions.push(...fallbackQuestions);
  }

  // Extract tips
  if (tipsMatch) {
    const tipsText = tipsMatch[1];
    const tipLines = tipsText.split('\n');
    for (const line of tipLines) {
      const trimmed = line.replace(/^[\s\-*•\d.]+/, '').trim();
      if (trimmed.length > 0) {
        tips.push(trimmed);
      }
    }
  }

  return { questions, tips };
}

/**
 * Extracts Q&A pairs from a category section text.
 */
function extractQAPairs(text: string): Array<{ question: string; answer: string }> {
  const pairs: Array<{ question: string; answer: string }> = [];

  // Split by "Q:" markers
  const parts = text.split(/\nQ:\s*/i).filter(p => p.trim().length > 0);

  for (const part of parts) {
    // Handle case where the first part might start with "Q: " already stripped
    const cleanPart = part.replace(/^Q:\s*/i, '');

    // Split into question and answer by "A:" marker
    const aMatch = cleanPart.match(/^([\s\S]*?)\nA:\s*([\s\S]*?)$/i);
    if (aMatch) {
      const question = aMatch[1].trim();
      const answer = aMatch[2].trim();
      if (question.length > 0 && answer.length > 0) {
        pairs.push({ question, answer });
      }
    } else {
      // Try splitting by newline if A: is on same line
      const inlineMatch = cleanPart.match(/^(.*?)\s*\nA:\s*([\s\S]*)/i);
      if (inlineMatch) {
        const question = inlineMatch[1].trim();
        const answer = inlineMatch[2].trim();
        if (question.length > 0 && answer.length > 0) {
          pairs.push({ question, answer });
        }
      }
    }
  }

  return pairs;
}

/**
 * Fallback parser that tries to extract questions from less structured responses.
 * Assigns categories in round-robin if no category headers are found.
 */
function extractQAPairsFallback(response: string): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [];
  const categoryOrder: QuestionCategory[] = ['technical', 'behavioral', 'role-specific'];

  // Try to find Q:/A: patterns anywhere in the response
  const qaParts = response.split(/\nQ:\s*/i).filter(p => p.trim().length > 0);

  let categoryIndex = 0;
  for (const part of qaParts) {
    const cleanPart = part.replace(/^Q:\s*/i, '');
    const aMatch = cleanPart.match(/^([\s\S]*?)\nA:\s*([\s\S]*?)(?=\nQ:|$)/i);

    if (aMatch) {
      const question = aMatch[1].trim();
      const answer = aMatch[2].trim();
      if (question.length > 0 && answer.length > 0) {
        // Determine category from context or use round-robin
        let category = categoryOrder[categoryIndex % 3];

        // Try to detect category from surrounding text
        const lowerPart = part.toLowerCase();
        if (lowerPart.includes('technical') || lowerPart.includes('coding') || lowerPart.includes('algorithm')) {
          category = 'technical';
        } else if (lowerPart.includes('behavioral') || lowerPart.includes('tell me about a time') || lowerPart.includes('describe a situation')) {
          category = 'behavioral';
        } else if (lowerPart.includes('role') || lowerPart.includes('position') || lowerPart.includes('company')) {
          category = 'role-specific';
        }

        questions.push({ question, category, suggestedAnswer: answer });
        categoryIndex++;
      }
    }
  }

  return questions;
}

/**
 * Validates the parsed interview prep result meets all requirements.
 * Returns validation issues if any constraints are violated.
 */
function validateResult(result: InterviewPrepResult): string[] {
  const issues: string[] = [];

  // Check total question count (5-15)
  if (result.questions.length < MIN_QUESTIONS) {
    issues.push(`Too few questions: ${result.questions.length} (minimum ${MIN_QUESTIONS})`);
  }
  if (result.questions.length > MAX_QUESTIONS) {
    issues.push(`Too many questions: ${result.questions.length} (maximum ${MAX_QUESTIONS})`);
  }

  // Check per-category minimums
  const categoryCounts = {
    technical: 0,
    behavioral: 0,
    'role-specific': 0,
  };
  for (const q of result.questions) {
    categoryCounts[q.category]++;
  }

  for (const [category, count] of Object.entries(categoryCounts)) {
    if (count < MIN_PER_CATEGORY) {
      issues.push(`Too few ${category} questions: ${count} (minimum ${MIN_PER_CATEGORY})`);
    }
  }

  // Check non-empty answers
  for (const q of result.questions) {
    if (!q.suggestedAnswer || q.suggestedAnswer.trim().length === 0) {
      issues.push(`Empty answer for question: "${q.question.slice(0, 50)}..."`);
    }
  }

  // Check tips count
  if (result.tips.length < MIN_TIPS) {
    issues.push(`Too few tips: ${result.tips.length} (minimum ${MIN_TIPS})`);
  }

  return issues;
}

/**
 * Trims the result to meet maximum constraints.
 * Removes excess questions (keeping category balance) and excess tips.
 */
function trimResult(result: InterviewPrepResult): InterviewPrepResult {
  let questions = [...result.questions];
  const tips = [...result.tips];

  // Trim questions to MAX_QUESTIONS while maintaining category balance
  if (questions.length > MAX_QUESTIONS) {
    const byCategory: Record<QuestionCategory, InterviewQuestion[]> = {
      technical: [],
      behavioral: [],
      'role-specific': [],
    };

    for (const q of questions) {
      byCategory[q.category].push(q);
    }

    // Distribute MAX_QUESTIONS evenly, then fill remaining
    const perCategory = Math.floor(MAX_QUESTIONS / 3);
    const trimmed: InterviewQuestion[] = [];

    for (const category of Object.keys(byCategory) as QuestionCategory[]) {
      const categoryQuestions = byCategory[category];
      trimmed.push(...categoryQuestions.slice(0, perCategory));
    }

    // Fill remaining slots from categories with extra questions
    const remaining = MAX_QUESTIONS - trimmed.length;
    let added = 0;
    for (const category of Object.keys(byCategory) as QuestionCategory[]) {
      const categoryQuestions = byCategory[category];
      const extras = categoryQuestions.slice(perCategory);
      for (const q of extras) {
        if (added >= remaining) break;
        trimmed.push(q);
        added++;
      }
      if (added >= remaining) break;
    }

    questions = trimmed;
  }

  return { questions, tips };
}

/**
 * Generates interview preparation materials using AI.
 *
 * @param userId - The authenticated user's ID
 * @param jobDescription - The job description text
 * @returns InterviewPrepResult with categorized questions, answers, and tips
 * @throws AppError for validation failures, missing resume, or AI errors
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
export async function generatePrep(
  userId: string,
  jobDescription: string
): Promise<InterviewPrepResult> {
  // Req 6.7: Validate job description length
  if (!isValidJobDescription(jobDescription, JD_MIN_LENGTH)) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: `Job description must be at least ${JD_MIN_LENGTH} characters`,
      statusCode: 400,
    });
  }

  // Req 6.5: Check if user has a stored resume
  const resumeText = await getResumeText(userId);
  if (!resumeText) {
    throw new AppError({
      code: 'NO_RESUME',
      message: 'Please upload a resume before generating interview preparation materials',
      statusCode: 400,
    });
  }

  // Sanitize inputs before constructing prompt
  const sanitizedJD = sanitizeForPrompt(jobDescription);
  const sanitizedResume = sanitizeForPrompt(resumeText);

  // Build the prompt
  const prompt = buildInterviewPrepPrompt(sanitizedResume, sanitizedJD);

  // Req 6.1, 6.6: Call AI service
  let aiContent: string;
  try {
    const aiResponse = await generateCompletion(prompt, {
      temperature: 0.7,
      maxTokens: 4000,
      systemPrompt: 'You are an expert interview coach. Generate interview preparation materials in the exact format requested. Always include at least 3 questions per category and at least 4 preparation tips.',
    });
    aiContent = aiResponse.content;
  } catch (error) {
    // Req 6.6: AI failure
    console.error('[Interview Prep] AI service error:', error);
    throw new AppError({
      code: 'AI_SERVICE_ERROR',
      message: 'Interview preparation generation failed. Please try again.',
      statusCode: 503,
    });
  }

  // Parse the AI response
  let result = parseInterviewPrepResponse(aiContent);

  // Trim if over limits
  result = trimResult(result);

  // Validate the result
  const issues = validateResult(result);

  // If validation fails, attempt a re-prompt with more specific instructions
  if (issues.length > 0) {
    console.warn('[Interview Prep] Validation issues on first attempt:', issues);

    try {
      const retryPrompt = buildRetryPrompt(sanitizedResume, sanitizedJD, issues);
      const retryResponse = await generateCompletion(retryPrompt, {
        temperature: 0.5,
        maxTokens: 4000,
        systemPrompt: 'You are an expert interview coach. You MUST follow the format exactly. Generate the exact number of questions requested per category.',
      });

      let retryResult = parseInterviewPrepResponse(retryResponse.content);
      retryResult = trimResult(retryResult);

      const retryIssues = validateResult(retryResult);
      if (retryIssues.length < issues.length) {
        // Use retry result if it's better
        result = retryResult;
      }
    } catch (retryError) {
      // If retry also fails, use the original result (best effort)
      console.warn('[Interview Prep] Retry also failed:', retryError);
    }
  }

  // Final safety: ensure minimum tips even if parsing was incomplete
  if (result.tips.length < MIN_TIPS) {
    const defaultTips = [
      'Research the company thoroughly before the interview, including recent news, products, and culture',
      'Prepare specific examples from your experience that demonstrate relevant skills using the STAR method',
      'Practice answering questions out loud to improve clarity and confidence',
      'Prepare thoughtful questions to ask the interviewer about the role and team',
      'Review the job description carefully and be ready to explain how your experience aligns with each requirement',
    ];
    while (result.tips.length < MIN_TIPS) {
      const tip = defaultTips[result.tips.length];
      if (tip) {
        result.tips.push(tip);
      } else {
        break;
      }
    }
  }

  return result;
}

/**
 * Builds a retry prompt that addresses specific validation issues.
 */
function buildRetryPrompt(resumeText: string, jobDescription: string, issues: string[]): string {
  return `You are an expert interview coach. Your previous response had issues that need to be fixed.

ISSUES TO FIX:
${issues.map(i => `- ${i}`).join('\n')}

Based on the following resume and job description, generate interview preparation materials.
You MUST generate at least 3 questions per category (TECHNICAL, BEHAVIORAL, ROLE-SPECIFIC) for a total of at least 9 questions.
You MUST provide at least 4 preparation tips.
Every question MUST have a non-empty suggested answer.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Generate in this EXACT format:

QUESTIONS:
[TECHNICAL]
Q: question text
A: answer text

Q: question text
A: answer text

Q: question text
A: answer text

[BEHAVIORAL]
Q: question text
A: answer text

Q: question text
A: answer text

Q: question text
A: answer text

[ROLE-SPECIFIC]
Q: question text
A: answer text

Q: question text
A: answer text

Q: question text
A: answer text

TIPS:
- tip 1
- tip 2
- tip 3
- tip 4`;
}
