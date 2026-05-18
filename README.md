# AI Job Dashboard

A full-stack Next.js application that helps job seekers manage their application process through AI-powered tools. Upload your resume, generate tailored application emails, check ATS compatibility scores, and prepare for interviews — all in one place.

## Features

- **Authentication** — Secure registration and login with account lockout protection
- **Resume Management** — Upload PDF resumes with automatic text extraction
- **Email Generator** — AI-generated job application emails tailored to your resume and the job description
- **Email Sending** — Send emails directly via Gmail SMTP with encrypted credential storage
- **ATS Scorer** — Hybrid keyword/AI analysis to check resume-job description compatibility (0-100 score)
- **Interview Prep** — AI-generated interview questions categorized by type with suggested answers
- **Degraded Mode** — Non-AI features remain accessible when the AI service is unavailable

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS 4 (dark mode)
- **Database:** SQLite via Prisma ORM (PostgreSQL-compatible)
- **Auth:** NextAuth.js with credentials provider
- **AI:** Ollama Cloud API (Gemma 4 31b-cloud)
- **Email:** Nodemailer with Gmail SMTP
- **PDF Parsing:** pdf-parse
- **Testing:** Vitest + fast-check (property-based testing)

## Prerequisites

- Node.js 18+
- npm

## Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd EmailAutomation
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and fill in your values:
   - `NEXTAUTH_SECRET` — Generate with `openssl rand -base64 32`
   - `OLLAMA_API_KEY` — Your Ollama Cloud API key
   - `ENCRYPTION_KEY` — Generate with `openssl rand -hex 32`

4. **Initialize the database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
├── features/         # Feature-based modules (auth, resume, email, ats, interview-prep, ai-service)
├── shared/           # Shared components, utilities, and types
└── middleware.ts     # Route protection
```

## Gmail SMTP Setup

To send emails, configure Gmail SMTP in the Settings page:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Use your Gmail address as the username and the App Password as the password

## License

Private
