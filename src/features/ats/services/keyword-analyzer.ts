/**
 * Keyword Analyzer Service
 * Provides keyword extraction, TF-IDF similarity analysis, and keyword matching
 * for the deterministic portion (40%) of ATS scoring.
 *
 * Validates: Requirements 5.1, 5.3, 5.4, 5.7
 */

import { WordTokenizer, TfIdf } from 'natural';
import type { KeywordAnalysis } from '../types';

const tokenizer = new WordTokenizer();

/**
 * Common English stopwords and generic non-technical words to filter out.
 * These appear frequently in JDs and resumes but aren't meaningful skills.
 */
const STOPWORDS = new Set([
  // Standard stopwords
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself',
  'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
  'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
  'herself', 'they', 'them', 'their', 'theirs', 'themselves', 'what',
  'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'because', 'about', 'above', 'after', 'again', 'against', 'between',
  'into', 'through', 'during', 'before', 'below', 'under', 'over', 'then',
  'once', 'here', 'there', 'any', 'also', 'if', 'while', 'up', 'out',
  'off', 'down', 'further', 'able', 'etc', 'well', 'get', 'got', 'make',
  'made', 'work', 'working', 'use', 'using', 'new', 'one', 'two', 'first',
  'also', 'like', 'including', 'within', 'across', 'along', 'must', 'per',
  // Generic JD/resume words that aren't skills
  'role', 'team', 'company', 'position', 'candidate', 'looking', 'join',
  'opportunity', 'responsible', 'responsibilities', 'requirements', 'required',
  'preferred', 'experience', 'years', 'year', 'strong', 'good', 'excellent',
  'ability', 'skills', 'skill', 'knowledge', 'understanding', 'familiar',
  'familiarity', 'proficient', 'proficiency', 'expertise', 'expert',
  'high', 'low', 'best', 'great', 'quality', 'modern', 'current', 'latest',
  'solutions', 'solution', 'product', 'products', 'project', 'projects',
  'build', 'building', 'create', 'creating', 'develop', 'developing',
  'design', 'designing', 'implement', 'implementing', 'implementation',
  'manage', 'managing', 'management', 'lead', 'leading', 'leadership',
  'support', 'supporting', 'maintain', 'maintaining', 'ensure', 'ensuring',
  'provide', 'providing', 'deliver', 'delivering', 'drive', 'driving',
  'user', 'users', 'customer', 'customers', 'client', 'clients',
  'technical', 'technology', 'technologies', 'tech', 'digital',
  'business', 'process', 'processes', 'system', 'systems',
  'code', 'coding', 'write', 'writing', 'written', 'read', 'reading',
  'test', 'testing', 'tests', 'debug', 'debugging',
  'data', 'information', 'based', 'level', 'time', 'day', 'days',
  'cross', 'functional', 'collaborate', 'collaborating', 'collaboration',
  'communicate', 'communication', 'problem', 'solving', 'solve',
  'learn', 'learning', 'growth', 'grow', 'improve', 'improving',
  'fast', 'paced', 'environment', 'environments', 'scalable', 'scale',
  'performance', 'optimize', 'optimizing', 'optimization',
  'practices', 'practice', 'standards', 'standard', 'patterns', 'pattern',
  'architecture', 'architectural', 'component', 'components',
  'feature', 'features', 'function', 'functions', 'functional',
  'application', 'applications', 'app', 'apps', 'web', 'mobile',
  'platform', 'platforms', 'service', 'services', 'tool', 'tools',
  'framework', 'frameworks', 'library', 'libraries',
  'development', 'developer', 'developers', 'engineer', 'engineers',
  'engineering', 'software', 'senior', 'junior', 'mid', 'staff',
  'full', 'stack', 'frontend', 'backend', 'fullstack',
  'end', 'front', 'back', 'side', 'server',
  'plus', 'bonus', 'nice', 'ideal', 'minimum', 'maximum',
  'overview', 'description', 'summary', 'about', 'mission', 'vision',
  'innovative', 'innovation', 'innovations', 'passionate', 'passion',
  'creative', 'creativity', 'ambitious', 'ambitious',
  'world', 'global', 'industry', 'market', 'sector',
  'life', 'lives', 'people', 'human', 'real',
  'right', 'left', 'top', 'bottom', 'behind', 'force',
  'dreams', 'dream', 'breathe', 'believe', 'reality',
  'transforming', 'transform', 'change', 'changing',
  'hardware', 'mix', 'ideas', 'idea',
  'help', 'helping', 'want', 'wants', 'looking',
  'offer', 'offers', 'benefits', 'benefit', 'salary', 'compensation',
  'remote', 'hybrid', 'onsite', 'office', 'location',
  'india', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad',
  'gurugram', 'noida', 'pune', 'chennai', 'kolkata',
  // More generic words that appear in JDs but aren't skills
  'hiring', 'hire', 'hired', 'apply', 'send', 'resume', 'portfolio',
  'ready', 'convert', 'teams', 'version',
  'startup', 'startups', 'reusable',
  'maintain', 'maintained',
  'please', 'share', 'contact', 'email', 'phone',
  'looking', 'passionate', 'exciting', 'amazing', 'great',
  'designs', 'usability',
]);

/**
 * Technical terms and skill-related keywords to prioritize.
 * Only these types of words should appear in keyword analysis.
 */
const TECHNICAL_PATTERNS = [
  // Programming languages
  /^(javascript|typescript|python|java|c\+\+|c#|ruby|go|golang|rust|swift|kotlin|php|scala|perl|r|matlab|sql|html|css|sass|scss|less|dart|elixir|haskell|lua|shell|bash|powershell)$/i,
  // Frontend frameworks and libraries
  /^(react|angular|vue|svelte|next\.?js|nuxt|gatsby|remix|astro|solid|preact|ember|backbone|jquery|redux|mobx|zustand|recoil|tailwind|bootstrap|material.?ui|chakra|ant.?design|styled.?components|storybook|webpack|vite|rollup|parcel|babel|eslint|prettier)$/i,
  // Backend frameworks
  /^(node\.?js|express|nestjs|fastify|koa|hapi|django|flask|fastapi|spring|springboot|rails|laravel|symfony|gin|fiber|actix|rocket|phoenix|asp\.?net|\.net)$/i,
  // Databases
  /^(mongodb|postgresql|postgres|mysql|mariadb|sqlite|oracle|mssql|redis|elasticsearch|cassandra|dynamodb|firestore|firebase|supabase|prisma|sequelize|typeorm|mongoose|knex)$/i,
  // Cloud and DevOps
  /^(docker|kubernetes|k8s|aws|azure|gcp|heroku|vercel|netlify|digitalocean|terraform|ansible|puppet|chef|jenkins|circleci|github.?actions|gitlab.?ci|travis|nginx|apache|caddy|cloudflare)$/i,
  // Tools and platforms
  /^(git|github|gitlab|bitbucket|jira|confluence|slack|figma|sketch|adobe|postman|insomnia|swagger|openapi|grafana|prometheus|datadog|sentry|new.?relic|splunk|kibana|sonarqube)$/i,
  // Concepts and methodologies
  /^(agile|scrum|kanban|devops|ci\/cd|cicd|microservices|monolith|serverless|rest|restful|graphql|grpc|websocket|oauth|jwt|saml|sso|tdd|bdd|ddd|oop|solid|mvc|mvvm|clean.?architecture)$/i,
  // Testing
  /^(jest|vitest|mocha|chai|cypress|playwright|selenium|puppeteer|enzyme|rtl|react.?testing.?library|junit|pytest|rspec|karma|jasmine|supertest|msw)$/i,
  // Data and ML
  /^(tensorflow|pytorch|keras|scikit|pandas|numpy|spark|hadoop|kafka|rabbitmq|airflow|mlflow|jupyter|tableau|powerbi|d3|chart\.?js|plotly)$/i,
  // Mobile
  /^(react.?native|flutter|ionic|xamarin|swiftui|jetpack.?compose|android|ios|expo|capacitor)$/i,
  // Specific skills/concepts
  /^(accessibility|a11y|i18n|seo|pwa|spa|ssr|ssg|isr|csr|responsive|animation|framer.?motion|gsap|three\.?js|webgl|canvas|svg)$/i,
  // Infrastructure
  /^(s3|ec2|lambda|ecs|eks|rds|cloudfront|route53|iam|vpc|cdn|saas|paas|iaas|load.?balancing|caching|cdn|dns|ssl|tls|https)$/i,
];

const MIN_JD_LENGTH = 100;
const MAX_JD_LENGTH = 10_000;
const MAX_KEYWORDS = 20;

/**
 * Validates job description length.
 * Requirement 5.7: Reject JD < 100 chars or > 10,000 chars.
 */
export function validateJobDescription(jobDescription: string): { valid: boolean; error?: string } {
  if (!jobDescription || typeof jobDescription !== 'string') {
    return { valid: false, error: 'Job description is required' };
  }
  if (jobDescription.length < MIN_JD_LENGTH) {
    return { valid: false, error: `Job description must be at least ${MIN_JD_LENGTH} characters (currently ${jobDescription.length})` };
  }
  if (jobDescription.length > MAX_JD_LENGTH) {
    return { valid: false, error: `Job description must not exceed ${MAX_JD_LENGTH} characters (currently ${jobDescription.length})` };
  }
  return { valid: true };
}

/**
 * Checks if a token matches known technical term patterns.
 */
function isTechnicalTerm(token: string): boolean {
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(token));
}

/**
 * Common compound technical terms that tokenizers split incorrectly.
 * Maps various text representations to a normalized form.
 */
const COMPOUND_TERMS: [RegExp, string][] = [
  [/next\.?js/gi, 'next.js'],
  [/node\.?js/gi, 'node.js'],
  [/express\.?js/gi, 'express.js'],
  [/vue\.?js/gi, 'vue.js'],
  [/nuxt\.?js/gi, 'nuxt.js'],
  [/d3\.?js/gi, 'd3.js'],
  [/three\.?js/gi, 'three.js'],
  [/chart\.?js/gi, 'chart.js'],
  [/material[\s\-]?ui/gi, 'material-ui'],
  [/react[\s\-]?native/gi, 'react-native'],
  [/framer[\s\-]?motion/gi, 'framer-motion'],
  [/tailwind[\s\-]?css/gi, 'tailwind'],
  [/redux[\s\-]?toolkit/gi, 'redux-toolkit'],
  [/react[\s\-]?query/gi, 'react-query'],
  [/styled[\s\-]?components/gi, 'styled-components'],
  [/ci[\s\/]?cd/gi, 'ci/cd'],
  [/type[\s\-]?script/gi, 'typescript'],
  [/java[\s\-]?script/gi, 'javascript'],
  [/mongo[\s\-]?db/gi, 'mongodb'],
  [/postgre[\s\-]?sql/gi, 'postgresql'],
  [/my[\s\-]?sql/gi, 'mysql'],
  [/graphql/gi, 'graphql'],
  [/web[\s\-]?socket/gi, 'websocket'],
  [/micro[\s\-]?services/gi, 'microservices'],
];

/**
 * Extracts compound technical terms from raw text before tokenization.
 */
function extractCompoundTerms(text: string): string[] {
  const found: string[] = [];
  for (const [pattern, normalized] of COMPOUND_TERMS) {
    if (pattern.test(text)) {
      found.push(normalized);
      // Reset regex lastIndex since we use 'g' flag
      pattern.lastIndex = 0;
    }
  }
  return found;
}

/**
 * Extracts meaningful keywords from text.
 * Focuses on technical terms and skill-related words.
 * Filters out generic business/marketing language.
 *
 * Requirement 5.1: Keyword extraction for TF-IDF similarity analysis.
 */
export function extractKeywords(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  const keywords = new Set<string>();

  // First: extract compound terms from raw text (before tokenization splits them)
  const compoundTerms = extractCompoundTerms(text);
  for (const term of compoundTerms) {
    keywords.add(term);
  }

  // Then: tokenize and extract individual terms
  const tokens = tokenizer.tokenize(text.toLowerCase()) || [];

  for (const token of tokens) {
    // Skip short words (< 3 chars) unless they are known technical terms
    if (token.length < 3 && !isTechnicalTerm(token)) continue;

    // Skip stopwords
    if (STOPWORDS.has(token)) continue;

    // Skip pure numbers
    if (/^\d+$/.test(token)) continue;

    // Prioritize technical terms; for non-technical words, require 5+ chars
    if (isTechnicalTerm(token)) {
      keywords.add(token);
    } else if (token.length >= 5) {
      keywords.add(token);
    }
  }

  // Also extract multi-word technical terms (bigrams)
  const words = text.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`.replace(/[^a-z0-9\s.+#]/g, '').trim();
    if (bigram.length >= 3 && isTechnicalTerm(bigram)) {
      keywords.add(bigram);
    }
  }

  return Array.from(keywords);
}

/**
 * Calculates TF-IDF cosine similarity between resume text and job description.
 * Returns a value between 0 and 1.
 *
 * Requirement 5.1: TF-IDF similarity analysis.
 */
export function calculateTfIdfSimilarity(resumeText: string, jobDescription: string): number {
  if (!resumeText || !jobDescription) return 0;

  const tfidf = new TfIdf();

  // Add both documents
  tfidf.addDocument(resumeText.toLowerCase());
  tfidf.addDocument(jobDescription.toLowerCase());

  // Get all terms from both documents
  const resumeTerms = tfidf.listTerms(0);
  const jdTerms = tfidf.listTerms(1);

  // Build a combined vocabulary
  const allTerms = new Set<string>();
  for (const term of resumeTerms) allTerms.add(term.term);
  for (const term of jdTerms) allTerms.add(term.term);

  if (allTerms.size === 0) return 0;

  // Build TF-IDF vectors for both documents
  const resumeVector: number[] = [];
  const jdVector: number[] = [];

  for (const term of allTerms) {
    resumeVector.push(tfidf.tfidf(term, 0));
    jdVector.push(tfidf.tfidf(term, 1));
  }

  // Calculate cosine similarity
  const similarity = cosineSimilarity(resumeVector, jdVector);

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, similarity));
}

/**
 * Computes cosine similarity between two vectors.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Finds keywords that appear in both resume and job description.
 * Case-insensitive comparison, limited to 20 results.
 *
 * Requirement 5.4: Up to 20 matched keywords.
 */
export function findMatchedKeywords(resumeKeywords: string[], jobKeywords: string[]): string[] {
  const resumeSet = new Set(resumeKeywords.map((k) => k.toLowerCase()));
  const matched: string[] = [];

  for (const keyword of jobKeywords) {
    if (resumeSet.has(keyword.toLowerCase())) {
      matched.push(keyword);
      if (matched.length >= MAX_KEYWORDS) break;
    }
  }

  return matched;
}

/**
 * Finds keywords present in job description but missing from resume.
 * Case-insensitive comparison, limited to 20 results.
 *
 * Requirement 5.4: Up to 20 missing keywords.
 */
export function findMissingKeywords(resumeKeywords: string[], jobKeywords: string[]): string[] {
  const resumeSet = new Set(resumeKeywords.map((k) => k.toLowerCase()));
  const missing: string[] = [];

  for (const keyword of jobKeywords) {
    if (!resumeSet.has(keyword.toLowerCase())) {
      missing.push(keyword);
      if (missing.length >= MAX_KEYWORDS) break;
    }
  }

  return missing;
}

/**
 * Performs full keyword analysis: extracts keywords, calculates similarity,
 * finds matched and missing keywords, and scales to a 0-100 score.
 *
 * Requirements 5.1, 5.3, 5.4, 5.7
 */
export function analyzeKeywords(resumeText: string, jobDescription: string): KeywordAnalysis {
  // Extract keywords from both texts
  const resumeKeywords = extractKeywords(resumeText);
  const jobKeywords = extractKeywords(jobDescription);

  // Calculate TF-IDF similarity (0-1)
  const tfidfSimilarity = calculateTfIdfSimilarity(resumeText, jobDescription);

  // Find matched and missing keywords
  const matchedKeywords = findMatchedKeywords(resumeKeywords, jobKeywords);
  const missingKeywords = findMissingKeywords(resumeKeywords, jobKeywords);

  // Scale TF-IDF similarity (0-1) to keyword score (0-100)
  const keywordScore = Math.round(tfidfSimilarity * 100);

  return {
    keywordScore,
    matchedKeywords,
    missingKeywords,
    tfidfSimilarity,
  };
}
