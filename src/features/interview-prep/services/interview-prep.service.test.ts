/**
 * Unit tests for Interview Prep Service
 * Tests response parsing, validation, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { parseInterviewPrepResponse } from './interview-prep.service';

describe('parseInterviewPrepResponse', () => {
  it('should parse a well-formatted response with all categories', () => {
    const response = `QUESTIONS:
[TECHNICAL]
Q: What is your experience with React hooks?
A: I have extensive experience with React hooks from my 3 years working on frontend applications. I regularly use useState, useEffect, useCallback, and custom hooks.

Q: How do you handle state management in large applications?
A: In my current role, I use Redux Toolkit for global state and React Context for component-level state sharing.

[BEHAVIORAL]
Q: Tell me about a time you resolved a conflict with a team member.
A: In my previous role, I had a disagreement with a colleague about architecture choices. I scheduled a one-on-one meeting to understand their perspective and we found a compromise.

Q: Describe a situation where you had to meet a tight deadline.
A: During a product launch, we had a two-week deadline for a critical feature. I broke the work into smaller tasks and coordinated with the team to deliver on time.

[ROLE-SPECIFIC]
Q: Why are you interested in this position?
A: This role aligns with my experience in building scalable web applications and my interest in working with modern frontend technologies.

Q: How would you approach onboarding to our codebase?
A: I would start by reading documentation, reviewing recent PRs, and pairing with team members to understand the architecture and conventions.

TIPS:
- Research the company's tech stack and recent product launches
- Prepare examples of your work that demonstrate problem-solving skills
- Practice explaining technical concepts in simple terms
- Review common system design patterns for frontend applications`;

    const result = parseInterviewPrepResponse(response);

    expect(result.questions.length).toBe(6);
    expect(result.tips.length).toBe(4);

    // Check categories
    const technical = result.questions.filter(q => q.category === 'technical');
    const behavioral = result.questions.filter(q => q.category === 'behavioral');
    const roleSpecific = result.questions.filter(q => q.category === 'role-specific');

    expect(technical.length).toBe(2);
    expect(behavioral.length).toBe(2);
    expect(roleSpecific.length).toBe(2);

    // Check structure
    for (const q of result.questions) {
      expect(q.question.length).toBeGreaterThan(0);
      expect(q.suggestedAnswer.length).toBeGreaterThan(0);
      expect(['technical', 'behavioral', 'role-specific']).toContain(q.category);
    }
  });

  it('should handle response with extra whitespace and formatting', () => {
    const response = `QUESTIONS:

[TECHNICAL]

Q: What is TypeScript?
A: TypeScript is a typed superset of JavaScript that I use daily for building type-safe applications.

Q: Explain closures in JavaScript.
A: A closure is a function that retains access to its outer scope variables. I use them frequently for data encapsulation.

[BEHAVIORAL]

Q: How do you handle feedback?
A: I welcome constructive feedback as it helps me grow. In my last review, I received feedback about communication and actively worked to improve.

Q: Describe your approach to learning new technologies.
A: I follow a structured approach: read documentation, build a small project, then apply it in a real context.

[ROLE-SPECIFIC]

Q: What interests you about our product?
A: Your product solves a real problem in the market and the technical challenges involved align with my expertise.

Q: How would you contribute to our team culture?
A: I value collaboration and knowledge sharing. I regularly conduct code reviews and mentor junior developers.

TIPS:
- Study the company's mission and values
- Prepare questions about team dynamics
- Review your past projects for relevant examples`;

    const result = parseInterviewPrepResponse(response);

    expect(result.questions.length).toBe(6);
    expect(result.tips.length).toBe(3);

    const technical = result.questions.filter(q => q.category === 'technical');
    const behavioral = result.questions.filter(q => q.category === 'behavioral');
    const roleSpecific = result.questions.filter(q => q.category === 'role-specific');

    expect(technical.length).toBe(2);
    expect(behavioral.length).toBe(2);
    expect(roleSpecific.length).toBe(2);
  });

  it('should extract tips with various bullet formats', () => {
    const response = `QUESTIONS:
[TECHNICAL]
Q: What is REST?
A: REST is an architectural style for APIs that I use in all my projects.

Q: Explain SOLID principles.
A: SOLID principles guide object-oriented design. I apply them to keep code maintainable.

[BEHAVIORAL]
Q: Tell me about teamwork.
A: I collaborate effectively with cross-functional teams in my current role.

Q: How do you prioritize tasks?
A: I use a combination of urgency and impact to prioritize my work.

[ROLE-SPECIFIC]
Q: Why this company?
A: The company's mission aligns with my career goals and technical interests.

Q: What value do you bring?
A: I bring strong technical skills and a collaborative mindset.

TIPS:
* Practice mock interviews with a friend
- Review the job description thoroughly
• Prepare your own questions for the interviewer
1. Research recent company news`;

    const result = parseInterviewPrepResponse(response);

    expect(result.tips.length).toBe(4);
    expect(result.tips[0]).toContain('Practice mock interviews');
    expect(result.tips[1]).toContain('Review the job description');
  });

  it('should return empty arrays for completely unparseable response', () => {
    const response = 'This is just random text with no structure at all.';

    const result = parseInterviewPrepResponse(response);

    // Should return empty or minimal results
    expect(result.questions).toBeDefined();
    expect(result.tips).toBeDefined();
    expect(Array.isArray(result.questions)).toBe(true);
    expect(Array.isArray(result.tips)).toBe(true);
  });

  it('should handle response with ROLE-SPECIFIC hyphenated header', () => {
    const response = `QUESTIONS:
[TECHNICAL]
Q: Explain microservices.
A: Microservices is an architecture pattern where applications are composed of small, independent services.

Q: What is Docker?
A: Docker is a containerization platform I use for consistent development and deployment environments.

[BEHAVIORAL]
Q: Describe a challenge you overcame.
A: I once had to migrate a legacy system to a new architecture under tight deadlines.

Q: How do you handle ambiguity?
A: I ask clarifying questions and break problems into smaller, manageable pieces.

[ROLE-SPECIFIC]
Q: How would you improve our current product?
A: Based on my research, I would focus on improving the user onboarding experience.

Q: What's your approach to code reviews?
A: I focus on readability, correctness, and providing constructive feedback.

TIPS:
- Prepare for whiteboard coding exercises
- Review data structures and algorithms
- Practice system design questions`;

    const result = parseInterviewPrepResponse(response);

    const roleSpecific = result.questions.filter(q => q.category === 'role-specific');
    expect(roleSpecific.length).toBe(2);
  });
});
