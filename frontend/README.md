# XPand — Frontend

React + TypeScript client for **XPand**, a skill-verified hiring platform that connects job seekers (who earn verified badges through skill tests) with companies that receive ranked, pre-screened candidates.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Roles & Route Guards](#roles--route-guards)
4. [Route Map](#route-map)
5. [Pages](#pages)
   - [Public Pages](#public-pages)
   - [User Pages](#user-pages)
   - [Company Pages](#company-pages)
   - [Admin Pages](#admin-pages)
6. [Hooks](#hooks)
   - [Auth Hooks](#auth-hooks)
   - [User Hooks](#user-hooks)
   - [Company Hooks](#company-hooks)
7. [API Layer](#api-layer)
8. [Key Features](#key-features)
9. [Auth Flow](#auth-flow)
10. [Getting Started](#getting-started)
11. [Environment](#environment)
12. [Backend](#backend)

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 |
| Language | TypeScript |
| Routing | React Router v6 |
| HTTP | Axios (custom instance with JWT interceptor) |
| AI — Interviews | Google Gemini via Spring Boot proxy |
| AI — Feedback | Claude (Anthropic API via Spring Boot proxy) |
| Face Analysis | face-api.js (CDN, TinyFaceDetector + FaceExpressionNet) |
| Styling | CSS Modules + global theme variables |
| Build | Vite |

---

## Project Structure

```
src/
├── api/
│   ├── axios.ts              # Axios instance, interceptors, typed helpers (get/post/put/patch/del)
│   └── Adminapi.ts           # Admin-specific API functions + DTOs
│
├── components/               # Shared UI components (nav bars, modals, badges, icons, etc.)
│
├── hooks/
│   ├── useLogin.ts           # Multi-endpoint login with definitive-block detection
│   ├── useRegister.ts        # User + company registration, email verification resend
│   ├── user/
│   │   ├── useApplications.ts  # User's job applications + withdraw
│   │   ├── useChallenges.ts    # Challenges, XP stats, player rank
│   │   ├── useDashboard.ts     # Dashboard aggregate data
│   │   ├── useJobs.ts          # Job listing, filtering, match scoring, job detail, apply
│   │   ├── useProfile.ts       # Full profile CRUD (education, work, certs, projects)
│   │   ├── useSkills.ts        # Skills library + user verification data
│   │   ├── useSkillTest.ts     # Skill test flow (start, submit, results)
│   │   ├── useSentiment.ts     # Camera access + face-api.js sentiment analysis
│   │   └── useStore.ts         # XP store, purchases, mock interview, readiness report
│   └── company/
│       └── useCompany.ts       # Company profile, jobs CRUD, applicants, market insights
│
├── pages/
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ForgotPasswordPage.tsx
│   ├── VerifyEmailPage.tsx
│   ├── OAuthCallbackPage.tsx
│   ├── user/
│   │   ├── DashboardPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── SkillsLibraryPage.tsx
│   │   ├── SkillTestPage.tsx
│   │   ├── TestResultPage.tsx
│   │   ├── JobsPage.tsx
│   │   ├── JobDetailsPage.tsx
│   │   ├── ApplicationPage.tsx
│   │   ├── ChallengesPage.tsx
│   │   ├── StorePage.tsx
│   │   ├── CollectionPage.tsx
│   │   ├── MockInterviewPage.tsx
│   │   └── ReadinessReportPage.tsx
│   ├── company/
│   │   ├── CompanyDashboardPage.tsx
│   │   ├── CompanyProfilePage.tsx
│   │   ├── ManageJobsPage.tsx
│   │   ├── CreateEditJobs.tsx
│   │   ├── JobApplicantsPage.tsx
│   │   └── MarketInsightsPage.tsx
│   └── admin/
│       ├── AdminOverviewPage.tsx
│       ├── AdminUsersPage.tsx
│       ├── AdminCompaniesPage.tsx
│       ├── AdminChallengesPage.tsx
│       ├── AdminStorePage.tsx
│       └── AdminSkillsPage.tsx
│
├── utils/
│   └── pdfExport.ts          # PDF generation for readiness reports
│
└── App.tsx                   # BrowserRouter, route guards, full route tree
```

---

## Roles & Route Guards

The app has three roles, each enforced by a route guard component defined in `App.tsx`.

| Guard | Component | Logic |
|-------|-----------|-------|
| `UserRoute` | Wraps all `/dashboard`, `/skills`, `/jobs`, etc. | Redirects unauthenticated users to `/login`; redirects company accounts to `/company/dashboard` |
| `CompanyRoute` | Wraps all `/company/*` routes | Redirects unauthenticated users to `/login`; redirects non-company accounts to `/dashboard` |
| `AdminGuard` | Outlet-style guard for all `/admin/*` routes | Redirects to `/login` if no token or if role is not `admin` |

Role and token are read from `localStorage` (`role`, `access_token`). The catch-all `*` route redirects to the correct dashboard based on role.

---

## Route Map

### Public
| Path | Page |
|------|------|
| `/` | `AppEntry` — role-aware first-load redirect |
| `/landing` | `LandingPage` |
| `/login` | `LoginPage` |
| `/register` | `RegisterPage` |
| `/forgot-password` | `ForgotPasswordPage` |
| `/verify` | `VerifyEmailPage` |
| `/oauth-callback` | `OAuthCallbackPage` |

### User (requires `UserRoute`)
| Path | Page |
|------|------|
| `/dashboard` | `DashboardPage` |
| `/profile` | `ProfilePage` |
| `/skills` | `SkillsLibraryPage` |
| `/skills/test/:skillId` | `SkillTestPage` |
| `/skills/result` | `TestResultPage` |
| `/jobs` | `JobsPage` |
| `/jobs/:jobId` | `JobDetailsPage` |
| `/applications` | `ApplicationPage` |
| `/challenges` | `ChallengesPage` |
| `/store` | `StorePage` |
| `/store/purchases` | `CollectionPage` |
| `/store/mock-interview/:purchaseId` | `MockInterviewPage` |
| `/store/readiness-report/:purchaseId` | `ReadinessReportPage` |

### Company (requires `CompanyRoute`)
| Path | Page |
|------|------|
| `/company/dashboard` | `CompanyDashboardPage` |
| `/company/profile` | `CompanyProfilePage` |
| `/company/jobs` | `ManageJobsPage` |
| `/company/jobs/create` | `CreateEditJobs` (create mode) |
| `/company/jobs/:jobId/edit` | `CreateEditJobs` (edit mode) |
| `/company/jobs/:jobId/applicants` | `JobApplicantsPage` |
| `/company/insights` | `MarketInsightsPage` |

### Admin (requires `AdminGuard`)
| Path | Page |
|------|------|
| `/admin/overview` | `AdminOverviewPage` |
| `/admin/users` | `AdminUsersPage` |
| `/admin/companies` | `AdminCompaniesPage` |
| `/admin/challenges` | `AdminChallengesPage` |
| `/admin/store` | `AdminStorePage` |
| `/admin/skills` | `AdminSkillsPage` |

---

## Pages

### Public Pages

#### `LandingPage`
Marketing landing page for unauthenticated visitors. Entry point with links to `/login` and `/register`.

#### `LoginPage`
Email + password login form backed by `useLogin`. The hook tries three endpoints in order — `/auth/company/login`, `/auth/user/login`, `/auth/admin/login` — and stops on the first success or a definitive block message (e.g. "verify your email", "suspended", "pending approval"). On success, stores `access_token`, `role`, and `user` in `localStorage` and redirects based on role.

#### `RegisterPage`
Tabbed form supporting two registration modes: **User** (first name, last name, email, password, phone, location) and **Company** (company name, email, password, industry, description, location, website). Uses `useRegister`. After user registration, shows a "check your email" screen rather than auto-logging in, since the account must be verified first. Company registrations require admin approval before login is possible.

#### `ForgotPasswordPage`
Email input that triggers a password reset email via the backend. Displays a confirmation state after submission.

#### `VerifyEmailPage`
Reads a token from the URL query string and calls the backend email verification endpoint. Displays success or error feedback.

#### `OAuthCallbackPage`
Receives the backend's OAuth redirect after Google SSO. Extracts the JWT and role from URL query params, stores them in `localStorage`, and redirects to the appropriate dashboard.

---

### User Pages

#### `DashboardPage`
The main landing page for job seekers after login. Aggregated from a single `GET /user/dashboard` call via `useDashboard`. Displays:
- XP balance, current level, XP progress bar to next level
- Badge counts (Gold / Silver / Bronze / Total)
- Active and completed challenge counts
- Application summary (pending, accepted, total)
- Top verified skills
- Recent XP activity feed
- Market skill recommendations (in-demand skills the user hasn't verified yet)

#### `ProfilePage`
Full profile management page using `useProfile`. Allows editing of:
- Personal info: name, professional title, bio, location, social links (LinkedIn, GitHub, portfolio), profile picture
- Education entries (institution, degree, field, dates, description)
- Work experience entries (title, company, location, dates, description)
- Certifications (name, issuing organisation, issue/expiry dates)
- Projects (title, description, technologies, project URL, GitHub URL, dates)

Client-side duplicate detection runs before every POST — duplicate project titles, project URLs, or certification name + issuer combinations are rejected with a user-facing error message before the network request is made.

#### `SkillsLibraryPage`
Lists all active platform skills grouped by category, powered by `useSkills`. Each skill card shows:
- Current badge level (BRONZE / SILVER / GOLD) if earned, or "Not Verified"
- Remaining monthly attempts (max 3 per skill)
- Lock status and expiry if the monthly limit has been hit
- Gold badge indicator (no re-attempts once Gold is achieved)

On first load, checks for pending onboarding skills (skill IDs saved during registration) and shows a nudge popup prompting the user to take a test for skills they self-reported knowing.

#### `SkillTestPage`
Timed multiple-choice test for a single skill, powered by `useSkillTest`. Fetches questions from `GET /user/skills/:skillId/test`. Tracks answers in a keyed map (`{ [questionId]: "A" | "B" | "C" | "D" }`). Displays a countdown timer. Auto-submits when the timer reaches zero. On completion, navigates to `TestResultPage`.

#### `TestResultPage`
Displays the outcome of a completed skill test:
- Animated score dial (0–100%, normalised from raw backend points)
- Badge earned (BRONZE / SILVER / GOLD) or "No Badge" if below threshold
- XP awarded
- Correct answer count vs. total questions
- Per-question breakdown: user's answer, correct answer, and pass/fail indicator

#### `JobsPage`
Browsable job board powered by `useJobs`, which loads jobs, skill verifications, and existing applications in parallel and merges them client-side. Client-side filters include:
- Keyword search (job title, company name, location, skill names)
- Job type (FULL_TIME / PART_TIME / CONTRACT / REMOTE / ALL)
- Location string match
- "Matched jobs only" toggle — hides jobs where match score < 50%

Each job card shows the computed match score, required skills with the user's badge status, and an apply button that is disabled if any MAJOR skill badge is missing.

#### `JobDetailsPage`
Full single-job view powered by `useJobDetail`. Shows:
- Complete skill requirements with MAJOR / MINOR importance and the user's badge status per skill
- List of missing MAJOR skills (if any) that block the application
- Priority slot selector — if the user owns unused PRIORITY_SLOT purchases, they can optionally attach one to bump their application to the top of the list
- Apply button with enforced eligibility — a badge for every MAJOR skill is required to apply

#### `ApplicationPage`
Lists all of the user's job applications via `useApplications`. Shows current status (PENDING / SHORTLISTED / REJECTED / WITHDRAWN) and the applied-at date. Allows withdrawal of PENDING applications via `DELETE /user/applications/:id`, which optimistically updates the status in the local list.

#### `ChallengesPage`
Gamified challenge tracker powered by `useChallenges`, which loads challenges, user progress, profile XP, and weekly XP transactions in one `Promise.all`. Displays:
- Active challenges grouped by category (Daily, Weekly, Milestone, Skill, Streak) with progress bars
- Countdown timers for time-limited challenges
- Completed challenges archive
- Player stats panel: total XP, XP earned this week, current level, rank title, login streak

Rank progression: RECRUIT → APPRENTICE → JOURNEYMAN → EXPERT → MASTER → LEGEND.

XP level thresholds:
```
[0, 500, 1200, 2200, 3500, 5000, 7000, 9500, 12500, 16000, 20000]
```

#### `StorePage`
XP-powered store backed by `useStore`. Three item types are available:

| Type | Description |
|------|-------------|
| `READINESS_REPORT` | AI-generated skill-gap analysis vs. a specific job's requirements |
| `MOCK_INTERVIEW` | Adaptive AI interview session (Gemini questions + Claude feedback, sentiment-driven) |
| `PRIORITY_SLOT` | Move to the top of an applicant list (FIRST / SECOND / THIRD rank) |

Displays the user's current XP balance. Purchase is blocked client-side if the balance is insufficient.

#### `CollectionPage`
Lists all of the user's store purchases split into **unused** and **used**. Provides launch buttons for READINESS_REPORT (→ `/store/readiness-report/:purchaseId`) and MOCK_INTERVIEW (→ `/store/mock-interview/:purchaseId`) items. Displays slot rank and associated job title for PRIORITY_SLOT purchases.

#### `MockInterviewPage`
Full AI mock interview experience backed by `useMockInterview` and `useSentiment`. Session flow:

1. **Camera permission** — requests webcam access; face-api.js (TinyFaceDetector + FaceExpressionNet) analyses facial expressions throughout the session
2. **Question delivery** — 5 questions per session, fetched one at a time from Gemini via the Spring Boot backend; a mix of technical and personal/behavioural questions
3. **Parallel processing** — after each answer is submitted, Claude feedback and the next Gemini question are fetched simultaneously via `Promise.allSettled`; the next question is pre-cached so the "Next →" button is instant
4. **Sentiment-driven tone** — `good_cop` (warm, encouraging) when the user appears nervous; `bad_cop` (direct, challenging) when the user appears confident
5. **Per-answer coaching** — Claude provides 3–5 sentence feedback on each answer immediately after submission
6. **Session summary** — after all 5 answers, Claude generates a structured post-session report covering overall performance, technical vs. personal question handling, strongest/weakest answers, sentiment journey, and three action items

State machine phases: `idle → starting → answering → fetching_next → submitting → completed`.

#### `ReadinessReportPage`
Displays a Gemini-generated readiness report for a purchased `READINESS_REPORT` item. If no report exists yet, shows a "Generate Report" button (calls `POST /user/ai/report/:purchaseId`, 90s timeout). The returned prose is parsed into structured display blocks. Completed reports can be exported as a PDF via `pdfExport.ts`.

---

### Company Pages

#### `CompanyDashboardPage`
Overview dashboard for company accounts. Shows active job count, total applicants across all postings, recent applications, and quick navigation links to job management and applicant views.

#### `CompanyProfilePage`
Edit form for company details: name, description, website URL, industry, and location. Backed by `useCompanyProfile` (`PUT /company/profile`).

#### `ManageJobsPage`
Job management table via `useCompanyJobs`. Lists all company job postings with status (ACTIVE / CLOSED / EXPIRED), deadline, required skill count, and applicant count. Provides create, edit, and close actions. Closing a job calls `DELETE /company/jobs/:jobId` — the backend sets status to CLOSED and the UI updates optimistically.

#### `CreateEditJobs`
Shared form for creating and editing job postings, operating in two modes based on route:
- **Create mode** (`/company/jobs/create`) — blank form, calls `POST /company/jobs`
- **Edit mode** (`/company/jobs/:jobId/edit`) — pre-fills with existing data, calls `PUT /company/jobs/:jobId`

Fields: title, description, location, job type, salary range, deadline (date picker), and a dynamic skill requirements builder where each skill is assigned MAJOR or MINOR importance.

#### `JobApplicantsPage`
Ranked applicant list for a specific job via `useJobApplicants`. Each applicant row is expandable to show their full profile fetched from `GET /company/user/:userId?jobId=:jobId`, including education, work experience, certifications, projects, verified skill badges, and XP balance. Priority-slot applicants are highlighted with their slot rank. Admins can shortlist or reject individual applications via status update.

#### `MarketInsightsPage`
Platform-wide hiring trend data derived entirely client-side from `GET /jobs` via `useMarketInsights`. Aggregates:
- Top demanded skills by job count with MAJOR / MINOR breakdown
- Job type distribution (Full-time / Part-time / Contract / Remote)
- Top hiring locations

No dedicated backend insights endpoint — all computation happens in the hook.

---

### Admin Pages

All admin pages are protected by `AdminGuard` and call typed functions from `src/api/Adminapi.ts`.

#### `AdminOverviewPage`
Platform summary dashboard: total registered users, companies (approved and pending), active skills, and active challenges.

#### `AdminUsersPage`
Searchable user table. Admins can suspend accounts (`PATCH /admin/users/:id/suspend`) or permanently delete them (`DELETE /admin/users/:id`).

#### `AdminCompaniesPage`
Company management table. Admins can approve pending companies (`PATCH /admin/companies/:id/approve`) or suspend active ones (`PATCH /admin/companies/:id/suspend`). Pending companies are surfaced in a separate list.

#### `AdminChallengesPage`
Full challenge CRUD. Create and edit form fields: title, description, challenge type (from the `ChallengeType` enum), condition value, XP reward, repeatability toggle, and optional start/end dates. Inactive challenges are hidden from users but remain in the admin list.

#### `AdminStorePage`
Full store item CRUD. Create and edit form fields: name, description, XP cost, and item type (READINESS_REPORT / MOCK_INTERVIEW / PRIORITY_SLOT).

#### `AdminSkillsPage`
Skill and question management. Admins can create new skills, activate or deactivate existing ones, and add multiple-choice questions to each skill (question text, four options A–D, correct answer, difficulty level, and point value).

---

## Hooks

### Auth Hooks

#### `useLogin`
Tries `/auth/company/login`, `/auth/user/login`, and `/auth/admin/login` in order. Company is tried first so company credentials don't accidentally receive a user-role token. Stops on the first success or when a 401 response contains a definitive-block phrase (`"verify your email"`, `"pending approval"`, `"suspended"`, `"google sign-in"`). 403 responses also stop the loop immediately. On success, writes `access_token`, `role`, and `user` to `localStorage`.

#### `useRegister`
Handles user and company registration via separate endpoints. Does **not** store the JWT on success — unverified users must confirm their email before accessing protected routes. Exposes `resendVerification(email)` for triggering a new verification email.

---

### User Hooks

#### `useSkills`
Parallel fetch of the full skills list, user verification records, and onboarding skill IDs. Merges them into `SkillWithVerification[]`, computing `remainingAttempts`, `attemptsExhausted`, `isVerified`, and `isGoldVerified` per skill. Merges backend onboarding IDs with any stored in `localStorage` (fallback for pre-onboarding registrations).

Key exported type:
```ts
export type BadgeLevel = "BRONZE" | "SILVER" | "GOLD";
```

#### `useSkillTest`
Manages the full test lifecycle. `startTest(skillId)` fetches questions and caches them in a ref. `submitTest(answers)` posts the answer map, normalises the raw score to a 0–100% percentage, enriches questions with correct answers from `questionResults`, and computes XP earned from a fallback table (BRONZE: 100 XP, SILVER: 250 XP, GOLD: 500 XP).

#### `useJobs` / `useJobDetail`
Both hooks load jobs, verifications, and applications in parallel and merge them client-side via `buildJobWithMeta`. Match score formula: MAJOR skills collectively worth 80%, MINOR collectively worth 20%; each group's share is proportional to how many skills the user has verified. `canApply` is `true` only if the user holds a badge for every MAJOR skill.

#### `useApplications`
Fetches the user's application list. `withdraw(applicationId)` calls `DELETE /user/applications/:id` and sets local status to `WITHDRAWN` optimistically.

#### `useChallenges`
Loads challenges, user progress, profile, and XP transactions in one `Promise.all`. Derives category, icon, and difficulty from challenge type server-side. Computes level and rank from total XP using fixed thresholds. Returns `challenges` (active/in-progress) and `completedChallenges` as separate arrays.

#### `useProfile`
All profile mutation operations share a `withSave` wrapper that handles loading state, error capture, and a 3-second success flash. `projectsRef` and `certificationsRef` mirror their state counterparts so that `assertUniqueProject` and `assertUniqueCertification` can read the current list synchronously from inside async callbacks without stale-closure risk.

#### `useSentiment`
Manages webcam access and real-time sentiment analysis. face-api.js is loaded from CDN once per page session via a singleton state machine (`idle → loading → ready → failed`). `captureAndAnalyse()` draws the current video frame to an offscreen canvas and runs face detection + expression classification. Maps detected expressions to `confident` (happy > 0.4) or `nervous` (everything else). Stream attachment is handled outside the `getUserMedia` try/catch to prevent autoplay errors from being misidentified as permission denials.

#### `useStore` / `useReadinessReport` / `useMockInterview`
`useStore` — manages store items, purchases, and XP balance. After a purchase, fetches the updated XP balance and falls back to optimistic subtraction if the profile fetch fails.

`useReadinessReport` — checks for an existing report on mount; exposes `generate()` for triggering AI generation with the 90s AI timeout.

`useMockInterview` — the most complex hook in the codebase. Manages a 5-question adaptive session. After each answer, Claude feedback and the next Gemini question are fetched with `Promise.allSettled` (so a failed next-question fetch doesn't block feedback). The next question is stored in `queuedNextQuestion` so `goToNextQuestion()` is synchronous. A final session summary is requested from Claude in parallel with the backend submit call.

---

### Company Hooks

#### `useCompanyProfile`
Fetch and update the company profile. `tick` counter triggers a refetch when incremented.

#### `useCompanyJobs`
Full CRUD for company job postings. All mutations throw errors up to the caller rather than setting local error state, so pages can handle feedback in their own UI context.

#### `useJobApplicants`
Fetches all applications for a given `jobId`. `updateStatus(applicationId, status)` calls `PATCH /company/applications/:id/status?status=:status` and updates the local list optimistically.

#### `useMarketInsights`
Derives all market data client-side from `GET /jobs`. Aggregates skill demand, job type breakdown, and location breakdown from active jobs only. No dedicated backend endpoint required.

---

## API Layer

### `src/api/axios.ts`

Axios instance configured with:
- **Base URL**: `VITE_API_URL` env variable, falls back to `http://localhost:8080/api`
- **Timeouts**: 30s default; `AI_TIMEOUT_MS = 90_000` exported for AI calls
- **Request interceptor**: attaches `Authorization: Bearer <token>` from `localStorage`
- **Response interceptor**: logs 401 / 403 / 500; on 401 warns that the session may have expired

Typed helper functions unwrap the Axios response envelope so callers receive plain data:

```ts
get<T>(url, config?)          → Promise<T>
post<T>(url, data?, config?)  → Promise<T>
put<T>(url, data?, config?)   → Promise<T>
patch<T>(url, data?, config?) → Promise<T>
del<T>(url, config?)          → Promise<T>
```

### `src/api/Adminapi.ts`

Typed wrapper functions for every admin endpoint, co-located with their DTO types. Covers users, companies, skills, questions, challenges, and store items. All functions return typed promises via the shared Axios helpers.

---

## Key Features

### Skill Verification & Badge System
Users earn BRONZE, SILVER, or GOLD badges per skill by taking multiple-choice tests. Maximum 3 attempts per skill per month. Gold is permanent — no further re-attempts once achieved.

### Match Scoring
Each job receives a match score (0–100%) based on the user's verified badges vs. the job's required skills. MAJOR skills carry 80% of the weight; MINOR skills carry 20%. Users must hold a badge for every MAJOR skill to submit an application.

### XP Economy & Levels
XP is earned from skill tests and challenges. It maps to a level (1–11+) and rank title. XP can be spent in the store on AI-powered products and priority application slots.

### Adaptive AI Mock Interview
5-question sessions driven by Gemini (question generation) and Claude (per-answer coaching feedback). Facial sentiment from face-api.js adjusts the interviewer's tone in real time — supportive when the candidate appears nervous, challenging when confident. Ends with a Claude-generated comprehensive session summary.

### Priority Application Slots
Purchasing a PRIORITY_SLOT item and attaching it to a job application places the user at FIRST, SECOND, or THIRD position in the applicant list, ahead of all standard applicants.

### AI Readiness Reports
A purchased READINESS_REPORT for a specific job triggers Gemini to generate a prose skill-gap analysis. The report is parsed into structured display blocks and can be exported as a PDF.

---

## Auth Flow

1. User submits credentials → `useLogin` tries endpoints in order
2. On success: `access_token`, `role`, and `user` written to `localStorage`
3. All API calls: Axios request interceptor injects `Authorization: Bearer <token>`
4. On 401 response: interceptor logs a warning; user is redirected to `/login`
5. Google OAuth: backend handles the OAuth exchange and redirects to `/oauth-callback` with token + role in query params; `OAuthCallbackPage` stores them and redirects to the appropriate dashboard

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (proxies API calls to Spring Boot on :8080)
npm run dev

```

Update `vite.config.ts` proxy target if your backend runs on a port other than `8080`.

---

## Environment

Create a `.env.local` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:8080/api
```

For production deployment:

```env
VITE_API_URL=https://your-production-backend.com/api
```

The variable is read in `src/api/axios.ts`. If not set, it falls back to `http://localhost:8080/api`.

---

## Backend

Spring Boot + PostgreSQL. All frontend API calls map 1-to-1 to backend REST controller endpoints under `/api`. The backend also acts as a proxy for Gemini (interview questions, readiness reports) and Claude (per-answer feedback, session summaries). See the backend repository for full API documentation, entity schema, and AI proxy configuration.

---

## Authors

**Farah Amer & Rana Shayya**
CSIS290 – Senior Project