# Tasks

## Task 1: Project Scaffolding and Configuration

**Requirements:** 8.1, 8.2, 8.3, 8.4

**Description:** Initialize the Next.js project with TypeScript, Tailwind CSS, Prisma ORM, and the feature-based directory structure. Configure environment variables and database setup.

**Steps:**
1. Initialize Next.js project with TypeScript and App Router (`npx create-next-app@latest --typescript --tailwind --app`)
2. Install core dependencies: `prisma`, `@prisma/client`, `next-auth`, `bcryptjs`, `nodemailer`, `pdf-parse`, `natural`, `zod`
3. Install dev dependencies: `@types/bcryptjs`, `@types/nodemailer`
4. Create Prisma schema at `prisma/schema.prisma` with User, Resume, SmtpConfig, and LoginAttempt models (supporting both SQLite and PostgreSQL via `DATABASE_PROVIDER` env var)
5. Create `.env.local` template with all environment variables (DATABASE_PROVIDER, DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, OLLAMA_API_KEY, OLLAMA_BASE_URL, OLLAMA_MODEL, ENCRYPTION_KEY)
6. Create feature-based directory structure under `src/features/` (auth, resume, email, ats, interview-prep, ai-service) each with components/, hooks/, services/, and types.ts
7. Create shared utilities directory at `src/shared/lib/` with placeholder files for db.ts, encryption.ts, validation.ts
8. Run `npx prisma generate` and `npx prisma db push` to initialize the database
9. Create `src/middleware.ts` for NextAuth route protection
10. Verify the app starts with `npm run dev` and renders the default page

- [x] Done

## Task 2: Shared Utilities — Validation and Encryption

**Requirements:** 1.1, 1.7, 2.2, 3.6, 4.5, 5.7, 6.7, 7.6

**Description:** Implement shared validation utilities (email, password, job description length) and AES-256-GCM encryption service for SMTP credentials.

**Steps:**
1. Implement `src/shared/lib/validation.ts` with: `isValidEmail()` (RFC-compliant check), `isValidPassword()` (8-128 chars), `isValidJobDescription(text, minLength)`, `sanitizeForPrompt()` (strip injection patterns, cap at 10,000 chars)
2. Implement `src/shared/lib/encryption.ts` with: `encrypt(plaintext)` and `decrypt(ciphertext)` using AES-256-GCM with the `ENCRYPTION_KEY` env var
3. Implement `src/shared/lib/errors.ts` with `AppError` class and `handleApiError()` utility for standardized API error responses
4. Create `src/shared/types/index.ts` with shared TypeScript interfaces (APIErrorResponse, APISuccessResponse)
5. Verify encryption round-trip works (encrypt then decrypt returns original value)

- [x] Done

## Task 3: Authentication — NextAuth.js Setup with Credentials Provider

**Requirements:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8

**Description:** Set up NextAuth.js with credentials provider, implement registration API, login attempt tracking, and account lockout logic.

**Steps:**
1. Create `src/app/api/auth/[...nextauth]/route.ts` with NextAuth configuration using CredentialsProvider
2. Implement `src/features/auth/services/auth.service.ts` with: `register()` (validate email/password, hash with bcrypt cost 12, create user), `validateCredentials()`, `checkLoginAttempts()`, `recordFailedAttempt()`, `resetFailedAttempts()`
3. Create `src/app/api/auth/register/route.ts` POST endpoint for user registration
4. Implement login attempt tracking: increment `failedCount` on failure, set `lockedUntil` to now + 15 minutes after 5 consecutive failures, reset on successful login
5. Configure NextAuth session strategy with JWT, 24-hour session duration
6. Implement `src/middleware.ts` to protect all `/dashboard/*` routes, redirecting unauthenticated users to `/login`
7. Verify: registration creates user in DB, login returns session, invalid credentials return generic error, lockout triggers after 5 failures

- [x] Done

## Task 4: Authentication — UI (Login and Register Pages)

**Requirements:** 1.1, 1.2, 1.3, 1.4, 1.7

**Description:** Build the login and registration page components with form validation and error handling.

**Steps:**
1. Create `src/features/auth/components/LoginForm.tsx` with email/password fields, client-side validation, error display, and submit handler calling NextAuth `signIn()`
2. Create `src/features/auth/components/RegisterForm.tsx` with email/password/confirm-password fields, validation (email format, password 8-128 chars), and submit handler calling `/api/auth/register`
3. Create `src/app/(auth)/login/page.tsx` rendering LoginForm with link to register
4. Create `src/app/(auth)/register/page.tsx` rendering RegisterForm with link to login
5. Create `src/features/auth/hooks/useAuth.ts` custom hook for session state and logout
6. Style both forms with Tailwind CSS (centered card layout, responsive)
7. Display lockout message when account is locked (show remaining minutes)
8. Verify: can register, login, see errors for invalid input, redirect to dashboard on success

- [x] Done

## Task 5: Dashboard Layout and Navigation

**Requirements:** 8.1, 8.5, 8.6

**Description:** Create the authenticated dashboard layout with sidebar navigation, AI status indicator, and feature routing.

**Steps:**
1. Create `src/app/(dashboard)/layout.tsx` with sidebar navigation (Resume, Email Generator, ATS Scorer, Interview Prep, Settings)
2. Create `src/app/(dashboard)/page.tsx` as dashboard home with welcome message and feature cards
3. Create `src/shared/components/Sidebar.tsx` with navigation links and active state styling
4. Create `src/shared/components/AIStatusIndicator.tsx` that calls `/api/health` on mount and displays connected/disconnected badge
5. Create `src/app/api/health/route.ts` that checks Ollama Cloud API connectivity within 10 seconds and returns status
6. Implement degraded mode: if AI is disconnected, show warning banner but allow access to non-AI features (resume upload, SMTP config)
7. Style with Tailwind CSS (responsive sidebar, collapsible on mobile)
8. Verify: authenticated users see dashboard, unauthenticated get redirected, AI status shows correctly

- [x] Done

## Task 6: AI Service — Ollama Cloud API Integration

**Requirements:** 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7

**Description:** Implement the centralized AI service that communicates with Ollama Cloud API, including retry logic, timeout, and input sanitization.

**Steps:**
1. Create `src/features/ai-service/types.ts` with AIServiceConfig, AIRequestOptions, AIResponse interfaces
2. Implement `src/features/ai-service/services/ai.service.ts` with `generateCompletion()` method that sends POST requests to Ollama Cloud API
3. Add Bearer token authentication using `OLLAMA_API_KEY` in Authorization header
4. Implement 60-second request timeout using AbortController
5. Implement exponential backoff retry: on HTTP 429, retry after 1s, 2s, 4s (max 3 retries); timed-out requests count as failed attempts
6. Implement `sanitizeInput()`: strip prompt injection patterns ("ignore previous instructions", "system:", "you are now", etc.), truncate to 10,000 characters
7. Implement `checkHealth()` method that pings the API with a lightweight request and returns connected/latency
8. Add startup check: if `OLLAMA_API_KEY` is missing/empty, log error and mark service unavailable
9. Verify: successful completion returns content, retries on 429, times out after 60s, sanitizes dangerous input

- [x] Done

## Task 7: Resume Management — Upload, Parse, and Store

**Requirements:** 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7

**Description:** Implement PDF resume upload with text extraction, file storage, and validation (type, size, text content quality).

**Steps:**
1. Create `src/features/resume/types.ts` with ResumeResult, ResumeData interfaces
2. Implement `src/features/resume/services/pdf-parser.service.ts` using `pdf-parse` to extract text from PDF buffer
3. Implement `src/features/resume/services/resume.service.ts` with: `uploadResume()` (validate file type/size, extract text, store file + text in DB), `getResumeText()`, `deleteResume()`
4. Add validation: reject non-PDF files (check magic bytes `%PDF`), reject files > 5MB, flag extraction yielding < 50 chars as image-based/scanned
5. Create `src/app/api/resume/route.ts` with GET (retrieve resume text), POST (upload), DELETE (remove) handlers
6. Store PDF files in `./uploads/{userId}/` directory, store extracted text in Resume table
7. On re-upload: delete old file and DB record, replace with new one
8. Verify: upload valid PDF extracts text, rejects non-PDF, rejects > 5MB, flags low-text PDFs

- [x] Done

## Task 8: Resume Management — UI

**Requirements:** 2.1, 2.2, 2.3, 2.6, 2.7

**Description:** Build the resume upload page with drag-and-drop, upload progress, status display, and error messages.

**Steps:**
1. Create `src/features/resume/components/ResumeUploader.tsx` with drag-and-drop zone and file input (accept=".pdf")
2. Create `src/features/resume/components/ResumeStatus.tsx` showing current resume info (filename, upload date, character count) or "No resume uploaded" state
3. Create `src/features/resume/hooks/useResume.ts` custom hook for upload, fetch, and delete operations with loading/error states
4. Create `src/app/(dashboard)/resume/page.tsx` composing ResumeUploader and ResumeStatus
5. Display specific error messages: "File must be a PDF" for invalid type, "File exceeds 5MB limit" for size, "This appears to be a scanned PDF — please upload a text-based PDF" for low text content
6. Show upload progress indicator and success confirmation
7. Style with Tailwind CSS (card layout, drag-drop visual feedback)
8. Verify: can upload PDF, see extracted text preview, see appropriate errors, replace existing resume

- [x] Done

## Task 9: Email Generator — AI Email Generation Service

**Requirements:** 3.1, 3.2, 3.4, 3.5, 3.6

**Description:** Implement the email generation service that uses the AI service to create tailored job application emails from resume + JD.

**Steps:**
1. Create `src/features/email/types.ts` with GeneratedEmail, EmailGenerationParams interfaces
2. Implement `src/features/email/services/email-generator.service.ts` with `generateEmail()` that: validates inputs (JD >= 50 chars, valid HR email), fetches user's resume text, constructs prompt for Gemma 4, calls AI service, parses response into structured email (subject, greeting, body, closing)
3. Create the AI prompt template that instructs Gemma 4 to generate a professional job application email with subject (max 120 chars), greeting, body highlighting relevant experience from resume, and closing
4. Implement response parsing: extract subject, greeting, body, closing from AI response (handle various formatting)
5. Create `src/app/api/email/generate/route.ts` POST endpoint that validates input, checks resume exists, calls generator service, returns structured email
6. Handle edge cases: no resume (return 400 with prompt to upload), AI failure (return 503 with retry suggestion)
7. Verify: generates structured email with all fields, subject <= 120 chars, rejects short JD, rejects invalid email format

- [x] Done

## Task 10: Email Generator — UI

**Requirements:** 3.1, 3.2, 3.3, 3.5, 3.6

**Description:** Build the email generator page with JD input, HR email field, generate button, and editable email preview.

**Steps:**
1. Create `src/features/email/components/EmailGeneratorForm.tsx` with textarea for JD (with character count), HR email input, and Generate button
2. Create `src/features/email/components/EmailPreview.tsx` with editable fields for subject, greeting, body, closing, and Send/Copy buttons
3. Create `src/features/email/hooks/useEmailGenerator.ts` custom hook for generate API call with loading/error states
4. Create `src/app/(dashboard)/email-generator/page.tsx` composing form and preview
5. Add client-side validation: JD minimum 50 chars (show counter), valid email format (show inline error)
6. Show "Please upload a resume first" message with link to resume page if no resume exists
7. Display loading spinner during generation, error message with retry button on failure
8. Allow user to edit all email fields before sending
9. Style with Tailwind CSS (two-column layout on desktop: form left, preview right)
10. Verify: generates email on valid input, shows validation errors, editable preview works

- [x] Done

## Task 11: Email Sender — SMTP Configuration and Sending

**Requirements:** 4.1, 4.2, 4.3, 4.4, 4.5, 4.6

**Description:** Implement SMTP email sending via Nodemailer with Gmail support, credential encryption, and connection validation.

**Steps:**
1. Create `src/features/email/services/email-sender.service.ts` with: `sendEmail()` (create Nodemailer transport, send with TLS), `configureSmtp()` (encrypt credentials, save to DB), `validateSmtpConnection()` (test auth), `getSmtpConfig()` (decrypt and return)
2. Configure Nodemailer transport: host=smtp.gmail.com, port=587, secure=false (STARTTLS), auth with username + App Password
3. Encrypt SMTP password with AES-256-GCM before storing in SmtpConfig table
4. Create `src/app/api/email/send/route.ts` POST endpoint: check SMTP configured, decrypt credentials, send email, return success with timestamp
5. Create `src/app/api/email/smtp-config/route.ts` GET (return masked config) and POST (validate connection, encrypt, save)
6. Create `src/app/api/email/smtp-test/route.ts` POST endpoint to test SMTP connection without saving
7. Handle failures: SMTP connection error returns 502 with retry/copy option, missing config returns 400 with setup prompt
8. Verify: can configure SMTP, test connection, send email, credentials stored encrypted, errors handled gracefully

- [x] Done

## Task 12: Email Sender — SMTP Settings UI

**Requirements:** 4.4, 4.5, 4.6

**Description:** Build the SMTP configuration page in settings with form fields, connection test, and status display.

**Steps:**
1. Create `src/features/email/components/SmtpConfigForm.tsx` with fields: host (default smtp.gmail.com), port (default 587), username (email), password (App Password), and Test Connection / Save buttons
2. Create `src/app/(dashboard)/settings/page.tsx` with SMTP configuration section
3. Create `src/features/email/hooks/useSmtpConfig.ts` hook for load, save, and test operations
4. Show connection test result (success/failure) before allowing save
5. Display current config status: "Configured" with masked password or "Not configured" with setup prompt
6. Add help text explaining Gmail App Password setup (link to Google's guide)
7. Style with Tailwind CSS (form card with clear sections)
8. Verify: can enter SMTP settings, test connection, save, see masked config on reload

- [x] Done

## Task 13: ATS Scorer — Keyword/TF-IDF Analysis Service

**Requirements:** 5.1, 5.3, 5.4, 5.7

**Description:** Implement the keyword extraction and TF-IDF similarity analysis for the deterministic portion (40%) of ATS scoring.

**Steps:**
1. Create `src/features/ats/types.ts` with ATSResult, KeywordAnalysis interfaces
2. Implement `src/features/ats/services/keyword-analyzer.ts` using the `natural` library: `extractKeywords()` (tokenize, remove stopwords, extract noun phrases and technical terms), `calculateTfIdfSimilarity()` (compute cosine similarity between resume and JD term vectors)
3. Implement `findMatchedKeywords()` and `findMissingKeywords()` comparing resume keywords against JD keywords (case-insensitive, limit to 20 each)
4. Scale TF-IDF similarity (0-1) to a 0-100 keyword score
5. Add input validation: reject JD < 100 chars or > 10,000 chars
6. Verify: extracts meaningful keywords, calculates similarity score 0-100, finds matched/missing keywords correctly

- [x] Done

## Task 14: ATS Scorer — LLM Scoring and Combined Result

**Requirements:** 5.2, 5.3, 5.4, 5.5, 5.6

**Description:** Implement the LLM-based semantic scoring (60%) and combine with keyword score for the final ATS result.

**Steps:**
1. Implement `src/features/ats/services/ats-scorer.service.ts` with `calculateScore()` that orchestrates keyword analysis + LLM scoring
2. Create AI prompt for semantic scoring: instruct Gemma 4 to analyze resume-JD fit, return a score 0-100, identify skills gaps (up to 10), and provide 3-5 improvement suggestions
3. Parse LLM response to extract numeric score, skills gaps array, and suggestions array
4. Combine scores: `overallScore = round(0.4 * keywordScore + 0.6 * llmScore)`
5. Implement graceful degradation: if AI service fails, return keyword score alone (scaled to 0-100), set `aiUnavailable: true`
6. Create `src/app/api/ats/route.ts` POST endpoint: validate JD length, check resume exists, call scorer service, return ATSResult
7. Verify: combined score formula correct, graceful degradation works, output structure matches spec (max 20 keywords, max 10 gaps, 3-5 suggestions)

- [x] Done

## Task 15: ATS Scorer — UI

**Requirements:** 5.1, 5.4, 5.5, 5.7

**Description:** Build the ATS scorer page with JD input, score display (gauge/progress), keyword breakdown, and improvement suggestions.

**Steps:**
1. Create `src/features/ats/components/ATSForm.tsx` with textarea for JD (character count, min 100 chars indicator) and Analyze button
2. Create `src/features/ats/components/ScoreDisplay.tsx` with circular gauge showing overall score (0-100), color-coded (red < 40, yellow 40-70, green > 70)
3. Create `src/features/ats/components/KeywordBreakdown.tsx` showing matched keywords (green badges) and missing keywords (red badges)
4. Create `src/features/ats/components/Suggestions.tsx` showing skills gaps and improvement suggestions as a list
5. Create `src/features/ats/hooks/useATSScorer.ts` hook for API call with loading/error states
6. Create `src/app/(dashboard)/ats-scorer/page.tsx` composing all components
7. Show "AI analysis unavailable" notice when `aiUnavailable` is true, displaying keyword-only score
8. Show "Please upload a resume first" with link if no resume exists
9. Style with Tailwind CSS (score gauge prominent, keyword badges, suggestion cards)
10. Verify: displays score with breakdown, handles no-resume state, shows degraded mode notice

- [x] Done

## Task 16: Interview Prep — Generation Service

**Requirements:** 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7

**Description:** Implement the interview preparation generator service that produces categorized questions with answers and tips.

**Steps:**
1. Create `src/features/interview-prep/types.ts` with InterviewPrepResult, InterviewQuestion interfaces
2. Implement `src/features/interview-prep/services/interview-prep.service.ts` with `generatePrep()` that: validates JD (>= 50 chars), fetches resume text, constructs prompt, calls AI service, parses response
3. Create AI prompt template instructing Gemma 4 to generate: 5-15 interview questions categorized as technical/behavioral/role-specific (at least 2 per category), one suggested answer per question tailored to the resume, and at least 3 preparation tips
4. Implement response parsing: extract questions array with categories, answers, and tips from AI response (handle JSON or structured text output)
5. Add validation: ensure output has 5-15 questions, at least 2 per category, non-empty answers, at least 3 tips; re-prompt or trim if needed
6. Create `src/app/api/interview-prep/route.ts` POST endpoint: validate input, check resume, call service, return result
7. Handle edge cases: no resume (400), AI failure (503 with retry), JD too short (400 with message)
8. Verify: generates categorized questions with answers and tips, validates output structure, handles errors

- [ ] Done

## Task 17: Interview Prep — UI

**Requirements:** 6.1, 6.2, 6.3, 6.4, 6.5, 6.7

**Description:** Build the interview prep page with JD input, categorized question display, expandable answers, and tips section.

**Steps:**
1. Create `src/features/interview-prep/components/InterviewPrepForm.tsx` with textarea for JD (min 50 chars indicator) and Generate button
2. Create `src/features/interview-prep/components/QuestionCard.tsx` showing question text, category badge, and expandable/collapsible suggested answer
3. Create `src/features/interview-prep/components/QuestionList.tsx` grouping questions by category (Technical, Behavioral, Role-Specific) with section headers
4. Create `src/features/interview-prep/components/PrepTips.tsx` showing preparation tips as a numbered list or cards
5. Create `src/features/interview-prep/hooks/useInterviewPrep.ts` hook for API call with loading/error states
6. Create `src/app/(dashboard)/interview-prep/page.tsx` composing all components
7. Show "Please upload a resume first" with link if no resume exists
8. Add loading skeleton during generation, error message with retry on failure
9. Style with Tailwind CSS (accordion-style questions, category tabs or sections, tip cards)
10. Verify: displays categorized questions with expandable answers, shows tips, handles errors

- [ ] Done

## Task 18: Integration and Polish

**Requirements:** 8.5, 8.6

**Description:** Final integration testing, cross-feature navigation, error boundary setup, and production readiness.

**Steps:**
1. Add global error boundary component wrapping the app for unhandled React errors
2. Ensure all features check for resume existence and show consistent "upload resume" prompts with navigation links
3. Add loading states and skeleton UI across all pages for consistent UX
4. Verify full user flow: register → login → upload resume → generate email → send email → check ATS score → generate interview prep
5. Test degraded mode: disconnect AI (invalid API key) and verify non-AI features still work, AI features show appropriate errors
6. Add `.env.example` file documenting all required environment variables with descriptions
7. Create `README.md` with setup instructions (install deps, configure env, run migrations, start dev server)
8. Verify `npm run build` succeeds without errors
9. Test responsive design on mobile viewport sizes
10. Clean up any unused imports, console.logs, or placeholder code

- [ ] Done
