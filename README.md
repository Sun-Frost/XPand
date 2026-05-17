# XPand

> **Skill-verified hiring.** Job seekers earn verified badges by passing skill tests. Companies receive a ranked, pre-screened applicant list — no unverifiable CVs, no guesswork.

Built for **CSIS290 – Senior Project** by **Farah Amer & Rana Shayya**

---

## What Is XPand?

XPand bridges the gap between job seekers and companies by replacing self-reported skills with evidence. Candidates take timed, proctored skill tests to earn **BRONZE / SILVER / GOLD** badges. When they apply to a job, companies see a ranked list of verified candidates — ordered by match score, with optional priority slots for applicants who invest in standing out.

---

## Monorepo Structure

```
xpand/
├── frontend/     # React + TypeScript
└── backend/      # Spring Boot + PostgreSQL
```

Each sub-project has its own README with full setup instructions:

- [`frontend/README.md`](./frontend/README.md)
- [`backend/README.md`](./backend/README.md)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, React Router v6, Axios |
| Backend | Spring Boot 4, Java 21, Maven, PostgreSQL 14+ |
| Auth | JWT, Google OAuth2 |
| AI – Interviews | Google Gemini (question generation, readiness reports) |
| AI – Feedback | Claude / Anthropic API (per-answer coaching, session summaries) |
| Face Analysis | face-api.js (TinyFaceDetector + FaceExpressionNet) |
| Styling | CSS Modules + global theme variables |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Java 21+
- Maven 3.9+ (or use the included `./mvnw` wrapper)
- PostgreSQL 14+

### 1 — Database

```sql
CREATE DATABASE xpand_db;
```

### 2 — Backend

```bash
cd backend

# Copy the example config and fill in your values
cp src/main/resources/application.properties.example \
   src/main/resources/application.properties

./mvnw spring-boot:run
# Server starts on http://localhost:8080
```

See [Backend Configuration](#backend-configuration) below for every required property.

### 3 — Frontend

```bash
cd frontend

npm install

# Optional: create a .env.local if your backend runs on a different port
echo "VITE_API_URL=http://localhost:8080/api" > .env.local

npm run dev
# Dev server starts on http://localhost:5173
```

---

## Backend Configuration

`application.properties` is **not committed** to the repository. Copy the example file and supply the following values:

```properties
# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/xpand_db
spring.datasource.username=YOUR_DB_USERNAME
spring.datasource.password=YOUR_DB_PASSWORD

# JWT
jwt.secret=YOUR_HMAC_SHA256_SECRET_MIN_32_CHARS
jwt.expiration=86400000

# Email (Gmail + App Password)
spring.mail.username=YOUR_GMAIL_ADDRESS
spring.mail.password=YOUR_GMAIL_APP_PASSWORD

# Google OAuth2
spring.security.oauth2.client.registration.google.client-id=YOUR_GOOGLE_CLIENT_ID
spring.security.oauth2.client.registration.google.client-secret=YOUR_GOOGLE_CLIENT_SECRET

# AI
gemini.api.key=YOUR_GEMINI_API_KEY
gemini.api.url=YOUR_GEMINI_ENDPOINT_URL

# CORS / OAuth redirect target
app.frontend-url=http://localhost:5173
```

> **Gmail App Password** — generate one at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords). Do not use your regular account password.

---

## Key Features

### Skill Verification & Badge System
Timed multiple-choice tests (5 EASY + 5 MEDIUM + 5 HARD questions, randomly drawn). Up to 3 attempts per skill per month. Gold badges are permanent — no further attempts once achieved. Badge level only ever upgrades, never downgrades.

### Match Scoring
Jobs are scored against a candidate's verified badges. MAJOR skills carry 80% of the weight; MINOR skills carry 20%. A badge for every MAJOR skill is required before a candidate can submit an application.

### XP Economy
XP is earned through skill tests and gamified challenges, and spent in the store on AI-powered products and priority application slots. All balance mutations are recorded in a dedicated `xp_transaction` ledger.

### Adaptive AI Mock Interview
5-question sessions combining Gemini (question generation) and Claude (per-answer coaching and a post-session summary). face-api.js reads the candidate's facial expressions in real time and adjusts the interviewer's tone — warmer when the candidate appears nervous, more challenging when confident.

### AI Readiness Reports
Purchased reports trigger Gemini to produce a prose skill-gap analysis against a specific job's requirements. Reports can be exported as a PDF.

### Priority Application Slots
Candidates can spend XP on FIRST / SECOND / THIRD priority slots, which surface them at the top of a company's applicant list ahead of all standard applicants.

### Deadline Gate
Companies cannot view or act on applications until the job's deadline has passed. This prevents early-applicant bias and ensures the full candidate pool is collected before any decisions are made.

---

## Roles

| Role | Access |
|------|--------|
| `USER` | Profile, skill tests, job applications, store, AI features |
| `COMPANY` | Job postings, applicant management, market insights |
| `ADMIN` | Platform-wide user/company management, skills, challenges, store items |

---

## API at a Glance

| Prefix | Auth Required | Description |
|--------|--------------|-------------|
| `/api/auth/**` | No | Register, login, email verification, password reset |
| `/api/skills/**` (GET) | No | Browse active skills |
| `/api/jobs/**` (GET) | No | Browse active job listings |
| `/api/user/**` | `ROLE_USER` | Profile, tests, applications, store, AI |
| `/api/company/**` | `ROLE_COMPANY` | Job postings, applicants |
| `/api/admin/**` | `ROLE_ADMIN` | Platform administration |
| `/oauth2/**` | No | Google OAuth2 redirect flow |

All protected endpoints require `Authorization: Bearer <token>`.

---

## Architecture Note

XPand uses a **monolithic Spring Boot** architecture by design. XP deductions, badge awards, and application submissions need to occur within a single ACID transaction. A distributed approach would require a saga pattern — significant added complexity for a project at this scale.

---

## Authors

**Farah Amer & Rana Shayya**  
CSIS290 – Senior Project
