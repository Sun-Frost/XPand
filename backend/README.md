# XPand – Backend

> Skill-verified hiring platform. Job seekers earn verified badges by passing skill tests. Companies receive a ranked, verified applicant list — no unverifiable CVs, no guesswork.

Built with **Spring Boot 4 · PostgreSQL · JWT · Google OAuth2 · Gemini AI**

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Key Design Decisions](#key-design-decisions)
- [Authors](#authors)

---

## Prerequisites

| Tool | Version |
|------|---------|
| Java | 21+ |
| Maven | 3.9+ (or use the included `./mvnw` wrapper) |
| PostgreSQL | 14+ |

---

## Getting Started

**1. Clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/xpand-backend.git
cd xpand-backend/backend
```

**2. Create the database**

```sql
CREATE DATABASE xpand_db;
```

**3. Configure the application**

```bash
cp src/main/resources/application.properties.example \
   src/main/resources/application.properties
```

Open `application.properties` and fill in every value marked `YOUR_*`. See [Environment Variables](#environment-variables) for details.

**4. Run**

```bash
./mvnw spring-boot:run
```

The server starts on `http://localhost:8080`.

---

## Project Structure

```
src/main/java/com/example/xpandbackend/
│
├── config/          # Security, CORS, scheduling, bean configuration
├── controller/      # REST endpoints — thin layer, delegates to services
├── dto/
│   ├── request/     # Inbound JSON payloads
│   └── response/    # Outbound JSON shapes
├── exception/       # Custom exceptions + global error handler
├── models/          # JPA entities and enums
├── repository/      # Spring Data JPA interfaces
├── security/        # JWT filter, JWT utility, OAuth2 success handler
└── service/         # All business logic lives here
```

---

## API Overview

| Prefix | Role required | Description |
|--------|--------------|-------------|
| `/api/auth/**` | Public | Register, login, email verification, password reset |
| `/api/skills/**` (GET) | Public | Browse active skills |
| `/api/jobs/**` (GET) | Public | Browse active job listings |
| `/api/user/**` | `ROLE_USER` | Profile, skill tests, applications, store, AI features |
| `/api/company/**` | `ROLE_COMPANY` | Job postings, applicant management |
| `/api/admin/**` | `ROLE_ADMIN` | User/company management, skills, challenges, store items |
| `/oauth2/**` | Public | Google OAuth2 redirect flow |

All protected endpoints require an `Authorization: Bearer <token>` header.

---

## Environment Variables

All configuration lives in `application.properties` (not committed — see `.gitignore`).
Use `application.properties.example` as a template.

| Key | Description |
|-----|-------------|
| `spring.datasource.url` | PostgreSQL JDBC URL |
| `spring.datasource.username` | Database username |
| `spring.datasource.password` | Database password |
| `jwt.secret` | HMAC-SHA256 signing secret (min 32 characters) |
| `jwt.expiration` | Token lifetime in milliseconds (e.g. `86400000` = 24 h) |
| `spring.mail.username` | Gmail address used to send verification and reset emails |
| `spring.mail.password` | Gmail App Password (not your account password) |
| `spring.security.oauth2.client.registration.google.client-id` | Google OAuth2 client ID |
| `spring.security.oauth2.client.registration.google.client-secret` | Google OAuth2 client secret |
| `gemini.api.key` | Google Gemini API key |
| `gemini.api.url` | Gemini endpoint URL |
| `app.frontend-url` | Frontend origin for CORS and OAuth redirects (e.g. `http://localhost:5173`) |

---

## Running the Application

**Development**
```bash
./mvnw spring-boot:run
```

---

## Key Design Decisions

**Monolithic architecture**
XPand uses a single Spring Boot application rather than microservices. This was a deliberate choice: XP deductions, badge awards, and application submissions need to happen in a single ACID transaction. A distributed system would require a saga pattern to maintain consistency — significant added complexity for a project at this scale.

**Role-based access control (RBAC)**
Three distinct roles — `USER`, `COMPANY`, `ADMIN` — each with their own endpoint namespace. Enforced at the filter level via JWT claims and at the method level via `@EnableMethodSecurity`.

**Deadline gate**
Company decisions on applications (status changes, CV access) are locked until the job deadline passes. This ensures all applicants are collected before any are reviewed, preventing early-applicant bias.

**Skill verification**
Tests draw 5 EASY + 5 MEDIUM + 5 HARD questions randomly per attempt. Users get 3 attempts per month per skill. Gold badges are permanent — no further attempts needed. Badge level only ever upgrades, never downgrades.

**XP economy**
All XP mutations go through `ChallengeEvaluationService.awardXp` / `deductXp`. This is the single source of truth for balance changes and ensures every credit and debit is recorded in `xp_transaction`.

**Gemini AI integration**
Two AI features: AI Readiness Report (text generation) and AI Mock Interview (multimodal — accepts a webcam snapshot for sentiment-aware adaptive questioning). Both are gated behind XP store purchases to keep usage intentional.

---

## Authors

**Farah Amer & Rana Shayya**
CSIS290 – Senior Project