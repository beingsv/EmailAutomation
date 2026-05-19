<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
</p>

<h1 align="center">🚀 AI Job Application Dashboard</h1>

<p align="center">
  <strong>Your AI-powered job hunting companion — generate tailored emails, find HR contacts, score your resume, and prep for interviews.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#demo">Demo</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#environment-variables">Environment Variables</a>
</p>

---

## ✨ Features

### 📧 AI Email Generator
Paste a job description and get a professionally crafted application email in seconds. The AI analyzes your resume and tailors the email to match the job requirements.

### 🔍 HR Contact Finder
Automatically discovers HR and recruiting contacts at target companies using the Hunter.io API. Finds real email addresses with confidence scores so you can send directly to decision-makers.

### 📨 Bulk Email Sending
Select multiple HR contacts and send your application email to all of them with one click. Real-time progress tracking shows delivery status for each recipient.

### 📊 ATS Resume Scorer
Score your resume against any job description. Get keyword match analysis, missing skills breakdown, and actionable suggestions to improve your ATS compatibility.

### 🎤 Interview Prep
AI-generated interview questions based on the job description and your resume. Practice with role-specific technical and behavioral questions.

### 📄 Resume Management
Upload and manage your resume. The system extracts text for AI analysis and attaches it automatically to outgoing emails.

### ⚙️ SMTP Configuration
Configure your own email sending (Gmail, Outlook, custom SMTP). Encrypted credential storage with connection testing.

---

## 🎯 How It Works

```
┌─────────────────────────────────────────────────────────┐
│  1. Paste Job Description                               │
│     ↓                                                   │
│  2. Click "Generate Email" → AI crafts your email       │
│     ↓                                                   │
│  3. HR contacts auto-discovered from company name       │
│     ↓                                                   │
│  4. Select contacts → "Send to Selected" → Done! 🎉    │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (or [Supabase](https://supabase.com) free tier)
- [Hunter.io](https://hunter.io) free API key (25 searches/month)
- [Ollama Cloud](https://ollama.com) API key for AI features

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/email-automation.git
cd email-automation

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Push database schema
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start applying to jobs!

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 6 |
| **UI** | React 19, Tailwind CSS 4 |
| **Database** | PostgreSQL via Prisma ORM |
| **Auth** | NextAuth.js (credentials provider) |
| **AI** | Ollama Cloud API (Gemma 4) |
| **Contact Discovery** | Hunter.io Domain Search API |
| **Email Sending** | Nodemailer (SMTP) |
| **Testing** | Vitest + fast-check (property-based) |
| **Deployment** | Vercel |

---

## 🏗 Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login & Register pages
│   ├── (dashboard)/              # Protected dashboard pages
│   │   ├── ats-scorer/           # ATS resume scoring
│   │   ├── dashboard/            # Main dashboard
│   │   ├── email-generator/      # Email generation + HR finder
│   │   ├── interview-prep/       # Interview preparation
│   │   ├── resume/               # Resume management
│   │   └── settings/             # SMTP configuration
│   └── api/                      # API routes
│       ├── auth/                  # NextAuth endpoints
│       ├── ats/                   # ATS scoring
│       ├── contacts/search/      # HR contact discovery
│       ├── email/                 # Generate, send, bulk send
│       ├── interview-prep/       # Interview questions
│       └── resume/               # Resume upload/retrieval
├── features/                     # Feature-based modules
│   ├── ai-service/               # Ollama Cloud integration
│   ├── ats/                      # ATS scoring logic
│   ├── email/                    # Email generation & sending
│   ├── hr-contact-finder/        # Hunter.io + caching + bulk send
│   └── interview-prep/           # Interview question generation
└── shared/                       # Shared utilities
    ├── components/               # Toast, UI primitives
    └── lib/                      # DB client, validation, errors
```

### Key Design Decisions

- **Feature-based architecture** — each feature is self-contained with its own services, hooks, components, and types
- **Cache-first contact lookup** — contacts are cached in PostgreSQL to minimize API credit usage
- **Graceful degradation** — if Hunter.io fails, pattern-based emails (hr@, careers@, etc.) are generated as fallback
- **Sequential bulk sending** — emails sent one-at-a-time to respect SMTP rate limits
- **Real-time progress** — bulk send uses streaming (ReadableStream) for live progress updates

---

## 🔐 Environment Variables

Create a `.env.local` file with:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# NextAuth
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000

# AI Service (Ollama Cloud)
OLLAMA_API_KEY=your-ollama-api-key
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_MODEL=gemma4:31b-cloud

# Encryption (for SMTP credentials)
ENCRYPTION_KEY=your-64-char-hex-string

# Hunter.io (free: 25 searches/month)
HUNTER_API_KEY=your-hunter-api-key
```

---

## 📝 Available Scripts

```bash
npm run dev        # Start dev server (Turbopack)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
npm run test       # Run tests (Vitest)
npm run test:watch # Run tests in watch mode
```

---

## 🗄 Database

The app uses Prisma with PostgreSQL. Models include:

- **User** — authentication & profile
- **Resume** — uploaded resume with extracted text
- **SmtpConfig** — encrypted SMTP credentials
- **Company** — cached company records for contact lookup
- **CompanyContact** — cached HR contacts with source & confidence

```bash
# Push schema changes
npx prisma db push

# Generate Prisma client
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio
```

---

## 🌐 Deployment

The app is optimized for **Vercel**:

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

Make sure to set `NEXTAUTH_URL` to your production URL (e.g., `https://your-app.vercel.app`).

---

## 📄 License

MIT

---

<p align="center">
  Built with ❤️ for job seekers who want to stand out
</p>
