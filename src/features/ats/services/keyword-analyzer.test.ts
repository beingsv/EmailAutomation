/**
 * Unit tests for the Keyword Analyzer Service.
 * Tests keyword extraction, TF-IDF similarity, matched/missing keywords,
 * and input validation.
 *
 * Validates: Requirements 5.1, 5.3, 5.4, 5.7
 */

import { describe, it, expect } from 'vitest';
import {
  extractKeywords,
  calculateTfIdfSimilarity,
  findMatchedKeywords,
  findMissingKeywords,
  validateJobDescription,
  analyzeKeywords,
} from './keyword-analyzer';

describe('Keyword Analyzer', () => {
  describe('validateJobDescription', () => {
    it('rejects empty string', () => {
      const result = validateJobDescription('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('rejects JD shorter than 100 characters', () => {
      const shortJD = 'a'.repeat(99);
      const result = validateJobDescription(shortJD);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 100');
    });

    it('rejects JD longer than 10,000 characters', () => {
      const longJD = 'a'.repeat(10_001);
      const result = validateJobDescription(longJD);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10000');
    });

    it('accepts JD with exactly 100 characters', () => {
      const jd = 'a'.repeat(100);
      const result = validateJobDescription(jd);
      expect(result.valid).toBe(true);
    });

    it('accepts JD with exactly 10,000 characters', () => {
      const jd = 'a'.repeat(10_000);
      const result = validateJobDescription(jd);
      expect(result.valid).toBe(true);
    });

    it('accepts JD within valid range', () => {
      const jd = 'We are looking for a software engineer with experience in React, TypeScript, and Node.js. The ideal candidate will have 3+ years of experience.';
      const result = validateJobDescription(jd);
      expect(result.valid).toBe(true);
    });
  });

  describe('extractKeywords', () => {
    it('returns empty array for empty input', () => {
      expect(extractKeywords('')).toEqual([]);
    });

    it('returns empty array for null/undefined input', () => {
      expect(extractKeywords(null as unknown as string)).toEqual([]);
      expect(extractKeywords(undefined as unknown as string)).toEqual([]);
    });

    it('extracts technical terms and removes stopwords/generic words', () => {
      const text = 'We are looking for a software engineer with experience in JavaScript and React';
      const keywords = extractKeywords(text);
      // Technical terms should be extracted
      expect(keywords).toContain('javascript');
      expect(keywords).toContain('react');
      // Generic job words should be filtered
      expect(keywords).not.toContain('software');
      expect(keywords).not.toContain('engineer');
      expect(keywords).not.toContain('experience');
      // Stopwords should be removed
      expect(keywords).not.toContain('we');
      expect(keywords).not.toContain('are');
      expect(keywords).not.toContain('for');
      expect(keywords).not.toContain('the');
    });

    it('filters out short words (< 3 chars)', () => {
      const text = 'We need an AI ML engineer to do QA';
      const keywords = extractKeywords(text);
      expect(keywords).not.toContain('an');
      expect(keywords).not.toContain('to');
      expect(keywords).not.toContain('do');
    });

    it('extracts technical terms', () => {
      const text = 'Experience with React, TypeScript, Docker, and Kubernetes required';
      const keywords = extractKeywords(text);
      expect(keywords).toContain('react');
      expect(keywords).toContain('typescript');
      expect(keywords).toContain('docker');
      expect(keywords).toContain('kubernetes');
    });

    it('handles case insensitively', () => {
      const text = 'JavaScript PYTHON TypeScript';
      const keywords = extractKeywords(text);
      expect(keywords).toContain('javascript');
      expect(keywords).toContain('python');
      expect(keywords).toContain('typescript');
    });

    it('filters out pure numbers', () => {
      const text = 'Need 5 years of experience with 3 frameworks and 100 tests';
      const keywords = extractKeywords(text);
      expect(keywords).not.toContain('5');
      expect(keywords).not.toContain('3');
      expect(keywords).not.toContain('100');
    });
  });

  describe('calculateTfIdfSimilarity', () => {
    it('returns 0 for empty inputs', () => {
      expect(calculateTfIdfSimilarity('', 'some text')).toBe(0);
      expect(calculateTfIdfSimilarity('some text', '')).toBe(0);
    });

    it('returns a value between 0 and 1', () => {
      const resume = 'Experienced software engineer with JavaScript React Node.js skills';
      const jd = 'Looking for a software engineer with JavaScript and React experience';
      const similarity = calculateTfIdfSimilarity(resume, jd);
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('returns higher similarity for closely related texts', () => {
      const resume = 'Senior JavaScript developer with React and Node.js experience building web applications';
      const closeJD = 'We need a JavaScript developer with React experience for web application development';
      const distantJD = 'Looking for a mechanical engineer with experience in automotive design and manufacturing';

      const closeSimilarity = calculateTfIdfSimilarity(resume, closeJD);
      const distantSimilarity = calculateTfIdfSimilarity(resume, distantJD);

      expect(closeSimilarity).toBeGreaterThan(distantSimilarity);
    });

    it('returns high similarity for identical texts', () => {
      const text = 'JavaScript React Node.js TypeScript developer with 5 years experience';
      const similarity = calculateTfIdfSimilarity(text, text);
      // Identical texts should have very high similarity
      expect(similarity).toBeGreaterThan(0.5);
    });
  });

  describe('findMatchedKeywords', () => {
    it('finds keywords present in both lists (case-insensitive)', () => {
      const resumeKeywords = ['javascript', 'react', 'node', 'python'];
      const jobKeywords = ['JavaScript', 'React', 'Angular', 'TypeScript'];
      const matched = findMatchedKeywords(resumeKeywords, jobKeywords);
      expect(matched).toContain('JavaScript');
      expect(matched).toContain('React');
      expect(matched).not.toContain('Angular');
      expect(matched).not.toContain('TypeScript');
    });

    it('returns empty array when no matches', () => {
      const resumeKeywords = ['python', 'django', 'flask'];
      const jobKeywords = ['javascript', 'react', 'angular'];
      const matched = findMatchedKeywords(resumeKeywords, jobKeywords);
      expect(matched).toEqual([]);
    });

    it('limits results to 20 keywords', () => {
      const resumeKeywords = Array.from({ length: 30 }, (_, i) => `keyword${i}`);
      const jobKeywords = Array.from({ length: 30 }, (_, i) => `keyword${i}`);
      const matched = findMatchedKeywords(resumeKeywords, jobKeywords);
      expect(matched.length).toBeLessThanOrEqual(20);
    });

    it('handles empty arrays', () => {
      expect(findMatchedKeywords([], ['react'])).toEqual([]);
      expect(findMatchedKeywords(['react'], [])).toEqual([]);
    });
  });

  describe('findMissingKeywords', () => {
    it('finds keywords in JD but not in resume (case-insensitive)', () => {
      const resumeKeywords = ['javascript', 'react'];
      const jobKeywords = ['JavaScript', 'React', 'TypeScript', 'Angular'];
      const missing = findMissingKeywords(resumeKeywords, jobKeywords);
      expect(missing).toContain('TypeScript');
      expect(missing).toContain('Angular');
      expect(missing).not.toContain('JavaScript');
      expect(missing).not.toContain('React');
    });

    it('returns empty array when all JD keywords are in resume', () => {
      const resumeKeywords = ['javascript', 'react', 'typescript'];
      const jobKeywords = ['javascript', 'react'];
      const missing = findMissingKeywords(resumeKeywords, jobKeywords);
      expect(missing).toEqual([]);
    });

    it('limits results to 20 keywords', () => {
      const resumeKeywords = ['python'];
      const jobKeywords = Array.from({ length: 30 }, (_, i) => `keyword${i}`);
      const missing = findMissingKeywords(resumeKeywords, jobKeywords);
      expect(missing.length).toBeLessThanOrEqual(20);
    });

    it('handles empty arrays', () => {
      expect(findMissingKeywords([], ['react'])).toEqual(['react']);
      expect(findMissingKeywords(['react'], [])).toEqual([]);
    });
  });

  describe('analyzeKeywords', () => {
    const sampleResume = `
      Senior Software Engineer with 5 years of experience in full-stack web development.
      Proficient in JavaScript, TypeScript, React, Node.js, and Python.
      Experience with Docker, Kubernetes, AWS, and CI/CD pipelines.
      Strong background in agile methodologies and test-driven development.
      Built scalable microservices architecture serving millions of users.
    `;

    const sampleJD = `
      We are looking for a Senior Software Engineer to join our team.
      Requirements: 3+ years experience with JavaScript, TypeScript, and React.
      Experience with Node.js, GraphQL, and PostgreSQL is preferred.
      Familiarity with Docker, Kubernetes, and cloud platforms (AWS or GCP).
      Strong understanding of agile development practices and CI/CD.
      Experience building microservices and distributed systems.
    `;

    it('returns a keyword score between 0 and 100', () => {
      const result = analyzeKeywords(sampleResume, sampleJD);
      expect(result.keywordScore).toBeGreaterThanOrEqual(0);
      expect(result.keywordScore).toBeLessThanOrEqual(100);
    });

    it('returns tfidfSimilarity between 0 and 1', () => {
      const result = analyzeKeywords(sampleResume, sampleJD);
      expect(result.tfidfSimilarity).toBeGreaterThanOrEqual(0);
      expect(result.tfidfSimilarity).toBeLessThanOrEqual(1);
    });

    it('returns matched keywords limited to 20', () => {
      const result = analyzeKeywords(sampleResume, sampleJD);
      expect(result.matchedKeywords.length).toBeLessThanOrEqual(20);
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
    });

    it('returns missing keywords limited to 20', () => {
      const result = analyzeKeywords(sampleResume, sampleJD);
      expect(result.missingKeywords.length).toBeLessThanOrEqual(20);
    });

    it('keyword score equals rounded tfidfSimilarity * 100', () => {
      const result = analyzeKeywords(sampleResume, sampleJD);
      expect(result.keywordScore).toBe(Math.round(result.tfidfSimilarity * 100));
    });

    it('finds relevant matched keywords', () => {
      const result = analyzeKeywords(sampleResume, sampleJD);
      // Both texts mention these terms
      const matchedLower = result.matchedKeywords.map((k) => k.toLowerCase());
      expect(matchedLower).toContain('javascript');
      expect(matchedLower).toContain('typescript');
      expect(matchedLower).toContain('react');
    });

    it('identifies missing keywords from JD not in resume', () => {
      const result = analyzeKeywords(sampleResume, sampleJD);
      const missingLower = result.missingKeywords.map((k) => k.toLowerCase());
      // GraphQL and PostgreSQL are in JD but not in resume
      expect(missingLower).toContain('graphql');
      expect(missingLower).toContain('postgresql');
    });
  });
});
