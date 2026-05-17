# Requirements Document

## Introduction

The AI Job Dashboard is a full-stack Next.js application that helps job seekers manage their application process using AI-powered tools. The system provides multi-user authentication with resume storage, AI-generated job application emails with auto-send capability, ATS (Applicant Tracking System) compatibility scoring using a hybrid keyword/LLM approach, and interview preparation content generation. The application uses Ollama Cloud API with the Gemma 4 (31b-cloud) model for all AI operations and follows a feature-based architecture pattern.

## Glossary

- **Dashboard**: The main authenticated interface providing access to all AI Job Dashboard features
- **Auth_System**: The authentication and user management subsystem built on NextAuth.js with credentials provider
- **Resume_Store**: The subsystem responsible for storing, parsing, and retrieving user resume data from uploaded PDF files
- **Email_Generator**: The subsystem that generates tailored job application emails using AI based on user resume and job description
- **Email_Sender**: The subsystem responsible for sending generated emails via SMTP/Gmail integration using Nodemailer
- **ATS_Scorer**: The subsystem that evaluates resume-to-job-description compatibility using hybrid keyword/TF-IDF and LLM analysis
- **Interview_Prep_Generator**: The subsystem that generates interview questions, suggested answers, and preparation tips based on job description and resume
- **AI_Service**: The integration layer communicating with Ollama Cloud API (Gemma 4 31b-cloud model) at https://ollama.com
- **User**: An authenticated individual using the AI Job Dashboard
- **Job_Description**: A text input provided by the user describing a job posting's requirements and responsibilities
- **ATS_Score**: A numerical compatibility score with breakdown showing keyword matches, skills gaps, and improvement suggestions
- **Resume_Text**: The extracted plain text content from a user's uploaded PDF resume

## Requirements

### Requirement 1: User Registration and Authentication

**User Story:** As a job seeker, I want to create an account and log in securely, so that I can access my personalized dashboard and stored data.

#### Acceptance Criteria

1. WHEN a new user submits a registration form with email and password, THE Auth_System SHALL validate that the password is between 8 and 128 characters in length, create a new user account, and return a session token
2. WHEN a registered user submits valid credentials, THE Auth_System SHALL authenticate the user and establish a session with a duration of 24 hours from the time of login
3. IF a user submits invalid credentials, THEN THE Auth_System SHALL return a generic authentication error without revealing which field is incorrect
4. IF a user attempts to register with an already-registered email, THEN THE Auth_System SHALL return an error indicating the email is already in use
5. WHILE a user session is active, THE Auth_System SHALL allow access to all authenticated routes
6. WHEN a user session expires or the user logs out, THE Auth_System SHALL revoke the session and redirect to the login page
7. IF a user submits a registration form with an email that does not conform to a valid email format, THEN THE Auth_System SHALL reject the registration and return an error indicating the email format is invalid
8. IF a user fails authentication 5 consecutive times for the same email, THEN THE Auth_System SHALL temporarily lock login attempts for that email for 15 minutes

### Requirement 2: User Profile and Resume Management

**User Story:** As a job seeker, I want to upload and manage my resume, so that the AI tools can use my professional background for generating personalized content.

#### Acceptance Criteria

1. WHEN a user uploads a PDF file not exceeding 5 MB, THE Resume_Store SHALL extract the text content and store both the original file and the extracted text
2. IF a user uploads a file that is not a valid PDF or exceeds 5 MB, THEN THE Resume_Store SHALL reject the upload and return an error message specifying whether the file type is invalid or the size limit was exceeded
3. WHEN a user requests their stored resume, THE Resume_Store SHALL return the extracted Resume_Text associated with that user
4. THE Resume_Store SHALL associate each resume exclusively with the authenticated user who uploaded it
5. WHEN a user uploads a new resume, THE Resume_Store SHALL replace the previously stored resume for that user
6. IF the PDF text extraction yields fewer than 50 characters of text, THEN THE Resume_Store SHALL notify the user that the file appears to be image-based or scanned and suggest uploading a text-based PDF
7. IF the PDF text extraction fails entirely, THEN THE Resume_Store SHALL notify the user that the file could not be processed and suggest re-uploading

### Requirement 3: AI-Powered Job Application Email Generation

**User Story:** As a job seeker, I want to generate a tailored job application email using my resume and a job description, so that I can send professional, personalized applications efficiently.

#### Acceptance Criteria

1. WHEN a user provides a Job_Description of at least 50 characters and a valid HR email address, THE Email_Generator SHALL generate a tailored job application email using the user's stored Resume_Text and the provided Job_Description via the AI_Service
2. IF the user has no stored resume, THEN THE Email_Generator SHALL prompt the user to upload a resume before generating an email
3. WHEN the AI_Service returns a generated email, THE Email_Generator SHALL display the email content in an editable form for the user to review and modify before sending
4. THE Email_Generator SHALL include a subject line of no more than 120 characters, a greeting, a body, and a closing in the generated email
5. IF the AI_Service fails to respond or returns an error, THEN THE Email_Generator SHALL display an error message indicating the generation failed and allow the user to retry
6. IF the user submits a Job_Description shorter than 50 characters or an HR email address that does not conform to a valid email format, THEN THE Email_Generator SHALL display a validation error identifying the invalid field and SHALL NOT invoke the AI_Service

### Requirement 4: Email Auto-Send via SMTP

**User Story:** As a job seeker, I want to send the generated application email directly from the dashboard, so that I can apply to jobs without switching to a separate email client.

#### Acceptance Criteria

1. WHEN a user confirms sending a generated email, THE Email_Sender SHALL send the email to the specified HR email address via the configured SMTP/Gmail integration using TLS encryption
2. WHEN the email is sent successfully, THE Email_Sender SHALL display a confirmation message including the recipient email address and timestamp
3. IF the SMTP connection fails, THEN THE Email_Sender SHALL display an error message indicating the send failure and allow the user to retry or copy the email content to clipboard
4. WHEN a user configures SMTP settings (host, port, username, password), THE Email_Sender SHALL validate the connection by sending a test authentication request before saving the configuration
5. THE Email_Sender SHALL store SMTP credentials encrypted at rest and associate them with the authenticated user
6. IF the user has not configured SMTP settings, THEN THE Email_Sender SHALL prompt the user to configure SMTP before allowing email sending

### Requirement 5: ATS Compatibility Score Checker

**User Story:** As a job seeker, I want to check how well my resume matches a job description, so that I can identify gaps and improve my application before submitting.

#### Acceptance Criteria

1. WHEN a user provides a Job_Description between 100 and 10,000 characters in length, THE ATS_Scorer SHALL compare the Job_Description against the user's stored Resume_Text using keyword extraction and TF-IDF similarity analysis
2. WHEN the keyword analysis is complete, THE ATS_Scorer SHALL send the Job_Description and Resume_Text to the AI_Service for LLM-based semantic scoring
3. THE ATS_Scorer SHALL combine the keyword/TF-IDF score (weighted 40%) and the LLM-based score (weighted 60%) into a single ATS_Score with a numerical value between 0 and 100, rounded to the nearest integer
4. WHEN the ATS_Score is calculated, THE ATS_Scorer SHALL provide a breakdown including: up to 20 matched keywords, up to 20 missing keywords, up to 10 skills gaps, and 3 to 5 improvement suggestions
5. IF the user has no stored resume, THEN THE ATS_Scorer SHALL prompt the user to upload a resume before performing the analysis
6. IF the AI_Service fails during LLM scoring, THEN THE ATS_Scorer SHALL return the keyword/TF-IDF score alone (scaled to 0–100) with a notice that the AI analysis is unavailable
7. IF the user provides a Job_Description that is empty or fewer than 100 characters, THEN THE ATS_Scorer SHALL display an error message indicating the minimum length requirement and not perform the analysis

### Requirement 6: Interview Preparation Generator

**User Story:** As a job seeker, I want to generate interview preparation materials based on a job description and my resume, so that I can prepare effectively for upcoming interviews.

#### Acceptance Criteria

1. WHEN a user provides a Job_Description, THE Interview_Prep_Generator SHALL generate a minimum of 5 and a maximum of 15 interview questions based on the Job_Description and the user's stored Resume_Text via the AI_Service
2. WHEN interview questions are generated, THE Interview_Prep_Generator SHALL categorize generated questions into technical, behavioral, and role-specific sections with at least 2 questions per section
3. WHEN interview questions are generated, THE Interview_Prep_Generator SHALL provide one suggested answer for each generated question, tailored to the user's Resume_Text
4. WHEN interview questions are generated, THE Interview_Prep_Generator SHALL provide at least 3 preparation tips relevant to the job role described in the Job_Description
5. IF the user has no stored resume, THEN THE Interview_Prep_Generator SHALL prompt the user to upload a resume before generating preparation materials
6. IF the AI_Service fails to respond, THEN THE Interview_Prep_Generator SHALL display an error message and allow the user to retry
7. IF the user provides a Job_Description with fewer than 50 characters, THEN THE Interview_Prep_Generator SHALL display an error message indicating the job description is too short and not proceed with generation

### Requirement 7: AI Service Integration

**User Story:** As a system operator, I want the application to communicate reliably with the Ollama Cloud API, so that all AI-powered features function correctly.

#### Acceptance Criteria

1. THE AI_Service SHALL authenticate all requests to the Ollama Cloud API by including the configured API key in the Authorization header as a Bearer token
2. THE AI_Service SHALL send requests to the Ollama Cloud API at the base URL https://ollama.com using the gemma4:31b-cloud model
3. IF the Ollama Cloud API returns a rate limit error (HTTP 429), THEN THE AI_Service SHALL retry the request with exponential backoff (initial delay 1 second, doubling each attempt) up to 3 attempts
4. IF the Ollama Cloud API is unreachable after all retry attempts, THEN THE AI_Service SHALL return a descriptive error to the calling feature including the failure reason
5. THE AI_Service SHALL enforce a request timeout of 60 seconds for each API call; timed-out requests SHALL count as a failed attempt for retry purposes
6. THE AI_Service SHALL sanitize user-provided input by stripping prompt injection patterns and limiting input length to 10,000 characters before including it in prompts sent to the Ollama Cloud API
7. IF the configured API key is missing or empty at startup, THEN THE AI_Service SHALL log an error and report the service as unavailable

### Requirement 8: Feature-Based Architecture and Local Execution

**User Story:** As a developer, I want the application to follow a feature-based architecture and run locally, so that the codebase is maintainable and development is straightforward.

#### Acceptance Criteria

1. THE Dashboard SHALL organize source code into feature-based directories where each feature contains its own components, hooks, API routes, and services, with each glossary-defined subsystem (Auth_System, Resume_Store, Email_Generator, Email_Sender, ATS_Scorer, Interview_Prep_Generator, AI_Service) mapped to its own feature directory
2. THE Dashboard SHALL run locally without requiring external hosting or cloud deployment for the application itself, while permitting outbound connections to third-party APIs such as the Ollama Cloud API
3. THE Dashboard SHALL use Next.js App Router with TypeScript and Tailwind CSS
4. THE Dashboard SHALL support both SQLite and PostgreSQL as database options for local development, selectable via an environment variable without requiring code changes
5. WHEN the application starts, THE Dashboard SHALL verify connectivity to the Ollama Cloud API within 10 seconds and display a visible status indicator showing either a connected or disconnected state
6. IF the Ollama Cloud API is unreachable at startup, THEN THE Dashboard SHALL start successfully in a degraded mode and display the disconnected status, allowing access to non-AI features
