# Healthcare Appointment & Follow-up Manager

A production-grade healthcare SaaS platform for scheduling appointments, managing prescriptions, generating AI-powered clinical summaries, and sending medication reminders.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Detailed Setup Guide](#detailed-setup-guide)
- [Docker & Infrastructure Instructions](#docker--infrastructure-instructions)
- [Environment Variables (.env.example Explanation)](#environment-variables-envexample-explanation)
- [API Documentation](#api-documentation)
- [Database Schema Details](#database-schema-details)
- [LLM Prompts & AI Integration](#llm-prompts--ai-integration)
- [Queue Architecture](#queue-architecture)
- [Google Calendar Setup](#google-calendar-setup)
- [Email Configuration](#email-configuration)
- [Production Deployment Guide](#production-deployment-guide)
- [Security & HIPAA Compliance](#security--hipaa-compliance)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    Frontend (Vite + React 19)         │
│  Patient Portal │ Doctor Portal │ Admin Portal        │
└──────────────────────┬───────────────────────────────┘
                       │ REST API (Axios + TanStack Query)
┌──────────────────────▼───────────────────────────────┐
│               Backend (Node.js + Express)             │
│  Auth │ Doctor │ Appointment │ Prescription │ AI      │
│  Notification │ Calendar │ Admin                      │
└──────────────────────┬───────────────────────────────┘
           ┌───────────┴──────────┐
    ┌──────▼──────┐        ┌─────▼─────┐
    │    MySQL     │        │   Redis   │
    │  (Prisma)   │        │ (BullMQ)  │
    └─────────────┘        └───────────┘
```

**Modular Monolith** — modules communicate through typed service interfaces. Each domain (auth, doctor, appointment, etc.) is self-contained with its own controllers, service repositories, and routes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Framer Motion, TanStack Query, React Hook Form, Zod, Zustand, Axios |
| **Backend** | Node.js 20, Express 4, TypeScript, Prisma ORM |
| **Database** | MySQL 8.0 |
| **Queue** | BullMQ + Redis 7 |
| **AI** | OpenAI GPT-4o-mini (with background retry queues and graceful degradation if unavailable) |
| **Email** | SendGrid integration (with graceful fallback to dev logs) |
| **Calendar** | Google Calendar API (OAuth2 with auto token-refreshes and fetch-retries) |
| **Auth** | JWT (HS256) + Argon2id + Refresh Token Rotation (RTR) |
| **Containers** | Docker + Docker Compose |

---

## Project Structure

```
healthcare-appointment-manager/
├── backend/                    # Express API
│   ├── prisma/
│   │   ├── schema.prisma       # Full database schema
│   │   └── seed.ts             # Dev seed data
│   └── src/
│       ├── common/             # Middleware, errors, utils
│       ├── config/             # Env validation
│       ├── database/           # Prisma client + repositories
│       ├── modules/
│       │   ├── auth/           # Register, login, logout, refresh
│       │   ├── doctor/         # Search, slots, working hours, leaves
│       │   ├── appointment/    # Book, cancel, reschedule, history
│       │   ├── prescription/   # Clinical notes, medications
│       │   ├── notification/   # BullMQ email + reminder workers
│       │   ├── calendar/       # Google Calendar OAuth2
│       │   ├── admin/          # Metrics, audit logs, user management
│       │   ├── user/           # Profile, medical records
│       │   └── ai/             # Triage, pre/post-visit summaries, background queues
│       ├── app.ts              # Express factory
│       └── index.ts            # Server entry + workers
├── frontend/                   # React SPA
│   └── src/
│       ├── components/         # UI components (auth, shared, ui)
│       ├── pages/              # Patient, Doctor, Admin dashboards
│       ├── services/api/       # Axios API clients
│       ├── store/              # Zustand auth store
│       ├── hooks/              # useAuth, usePasswordStrength
│       ├── routes/             # PublicRoute, ProtectedRoute, RoleBasedRoute
│       └── providers/          # ThemeProvider, AppProviders
├── shared/                     # Shared Zod schemas + TypeScript types
├── docs/                       # Architecture documentation
├── docker-compose.yml          # MySQL + Redis config
└── .env.example                # Environment variable template
```

---

## Detailed Setup Guide

### 1. Clone and Install
First, clone the repository and install all dependencies for frontend, backend, and shared workspaces:
```bash
git clone <repo-url>
cd healthcare-appointment-manager
npm install
```

### 2. Configure Environment Variables
Copy the template files to configure your environments:
```bash
cp .env.example backend/.env
cp frontend/.env.template frontend/.env
```
Ensure you customize local secrets in `backend/.env`. Refer to the [Environment Variables](#environment-variables-envexample-explanation) section below for detailed definitions of all keys.

### 3. Initialize the Database & Seed
Configure your database and populate default developer profiles:
```bash
cd backend
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
cd ..
```

### 4. Running the Development Servers
Launch both workspaces concurrently:
```bash
# Terminal 1 — Backend API Server
npm run dev:backend

# Terminal 2 — Frontend App
npm run dev:frontend
```
- **Backend API**: `http://localhost:5000`
- **Frontend Dashboard**: `http://localhost:3000`
- **Health Endpoint**: `http://localhost:5000/health`

### Default Test Accounts

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@healthcare.dev` | `Admin123!` |
| **Doctor** | `aarav.sharma@healthcare.dev` | `Doctor123!` |
| **Patient** | `patient@healthcare.dev` | `Patient123!` |

---

## Docker & Infrastructure Instructions

The platform relies on MySQL and Redis services. You can spin them up easily using Docker Compose:

### Spin Up Services
```bash
docker-compose up -d
```
- **MySQL**: Bound to `localhost:3306` with username `healthcare_user` and database `healthcare_db`. Data is stored persistently in the docker volume `db_data`.
- **Redis**: Bound to `localhost:6380`. Handles BullMQ job caching and metadata.

### View Logs
```bash
docker-compose logs -f
```

### Reset & Clear Volume Data
To perform a clean wipe of database states and volumes:
```bash
docker-compose down -v
```

---

## Environment Variables (.env.example Explanation)

The following parameters must be specified in the `backend/.env` file:

| Variable | Required | Default Value | Description |
|---|---|---|---|
| `PORT` | ❌ | `5000` | Port for the Express backend server. |
| `NODE_ENV` | ❌ | `development` | Server run mode (`development`, `test`, `production`). |
| `DATABASE_URL` | ✅ | `mysql://...` | Connection URI pointing to your MySQL database. |
| `JWT_ACCESS_SECRET` | ✅ | `default_access...` | Secret key used to sign short-lived access JWT tokens. |
| `JWT_REFRESH_SECRET` | ✅ | `default_refresh...` | Secret key used to sign long-lived refresh JWT tokens. |
| `JWT_ACCESS_EXPIRES_IN` | ❌ | `15m` | Lifetime duration of JWT access tokens. |
| `JWT_REFRESH_EXPIRES_IN` | ❌ | `7d` | Lifetime duration of JWT refresh tokens. |
| `REDIS_HOST` | ✅ | `localhost` | Redis container/server host address. |
| `REDIS_PORT` | ✅ | `6380` | Redis port (default local instance is on 6380). |
| `REDIS_PASSWORD` | ❌ | `""` | Optional connection password for Redis. |
| `OPENAI_API_KEY` | ❌ | `""` | OpenAI credential. Falls back to mock responses if blank. |
| `SENDGRID_API_KEY` | ❌ | `""` | SendGrid credential. Falls back to console output if blank. |
| `EMAIL_FROM_ADDRESS` | ❌ | `no-reply@...` | Source sender address for outgoing notifications. |
| `GOOGLE_CLIENT_ID` | ❌ | `""` | Google GCP client ID for Calendar integrations. |
| `GOOGLE_CLIENT_SECRET` | ❌ | `""` | Google GCP client secret key. |
| `GOOGLE_REDIRECT_URI` | ❌ | `http://...` | Authorized Redirect URI for Google OAuth callback. |
| `FRONTEND_URL` | ❌ | `http://localhost:3000` | Whitelisted client Origin for CORS security filters. |

---

## API Documentation

All endpoints are prefixed with `/api/v1`.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Register new patient accounts |
| POST | `/auth/login` | ❌ | Login + issue access & refresh tokens |
| POST | `/auth/logout` | ✅ | Invalidate current session and cookies |
| POST | `/auth/refresh` | ❌ | Exchange refresh tokens (HttpOnly Cookie) |

### Doctors

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/doctors` | ✅ | Search public doctors list |
| GET | `/doctors/:id` | ✅ | Fetch specific doctor profile |
| GET | `/doctors/:id/slots` | ✅ | Fetch available time slots for a given date |
| PUT | `/doctors/me/working-hours` | DOCTOR | Define daily slot schedules |
| POST | `/doctors/me/leaves` | DOCTOR | Request time off (triggering auto approvals if clear) |

### Appointments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/appointments/hold` | PATIENT | Request 5-minute temporary slot hold |
| POST | `/appointments/:id/confirm` | PATIENT | Finalize symptom notes and complete booking |
| GET | `/appointments/my` | PATIENT | Load appointment history |
| PUT | `/appointments/:id/reschedule` | PATIENT | Reschedule appointment to a different slot |
| POST | `/appointments/:id/cancel` | ✅ | Cancel appointment and free slots |

### Prescriptions & Medication Reminders

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/prescriptions` | DOCTOR | Log visit details, diagnosis, and medications |
| GET | `/prescriptions/my` | PATIENT | Load patient prescription summaries |
| GET | `/prescriptions/reminders` | PATIENT | Load active reminders and compliance logs |
| POST | `/prescriptions/reminders/logs/:id/complete` | PATIENT | Mark a specific medication dose as taken |

### AI Integration

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/ai/triage` | PATIENT | stand-alone symptom triage assessment |
| POST | `/ai/pre-visit/:appointmentId` | ✅ | Generate clinical pre-visit complaints |
| POST | `/ai/post-visit/:appointmentId` | DOCTOR | Simplify complex clinical notes |

---

## Database Schema Details

The platform uses Prisma ORM to map definitions onto the MySQL database. 

### Key Relations & Concurrency Safety
- **uq_doctor_slot Unique Constraint**: The `uq_doctor_slot` constraint on `Appointment` covers `[doctorId, scheduledStart, active]`. The `active` column holds a string `"true"` when active (held or booked) and `null` if cancelled or expired. This allows MySQL to permit multiple cancelled records for the exact same slot while strictly preventing overlapping bookings or holds.
- **MedicationReminderLog Relationship**: Each `MedicationReminder` maps onto multiple `MedicationReminderLog` records. When a reminder fires, a log record is created in a `PENDING` state. A user completing the action transitions the status to `COMPLETED` and sets the `takenAt` timestamp.

```
Appointment (1) ──── (0..1) PreVisitSummary
Appointment (1) ──── (0..1) VisitNote
Appointment (1) ──── (*) Prescription
Appointment (1) ──── (0..1) SymptomSubmission

MedicationReminder (1) ──── (*) MedicationReminderLog
```

---

## LLM Prompts & AI Integration

The platform integrates OpenAI chat completions to assist triage and medical note interpretation. If the API key is not set, or the service encounters an error, the backend degrades gracefully without blocking the appointment or visit note booking loops.

### Prompts

1. **Symptom Triage**:
   ```
   You are a clinical triage assistant. 
   Assess the symptoms and respond ONLY with JSON:
   { "urgencyLevel": "ROUTINE"|"URGENT"|"CRITICAL",
     "suggestedSpecialty": "string",
     "disclaimer": "AI suggestion only. Dial 911 if experiencing an emergency." }
   ```
2. **Pre-Visit Summarization**:
   ```
   You are a clinical triage assistant. Given patient-reported symptoms, 
   respond ONLY with a JSON object: 
   { "urgencyLevel": "ROUTINE"|"URGENT"|"CRITICAL", 
     "chiefComplaint": "one sentence summary", 
     "suggestedQuestions": ["question1","question2","question3"] }
   Never include PII. Be concise and clinically accurate.
   ```
3. **Post-Visit Summarization**:
   ```
   You are a patient-facing medical interpreter. 
   Convert clinical notes into an 8th-grade reading level patient summary.
   Respond ONLY with JSON: 
   { "patientSummary": "...", 
     "glossaryMappings": { "medical_term": "plain_english_explanation" } }
   Never include PII. Be empathetic and clear.
   ```

### Fallback Retry Logic
If a call to the LLM fails during triage, pre-visit summary, or post-visit summary creation:
- The appointment booking or note saving completes successfully.
- A placeholder value `"Pending AI generation..."` is saved to the database.
- An asynchronous BullMQ job is added to the `ai-queue` to retry generating the summary in the background with exponential backoff up to 5 times.

---

## Queue Architecture

Background tasks are managed using Redis-backed BullMQ queues:

1. **`email-queue`**:
   - Handles patient notification dispatches.
   - Configured with `attempts: 5` and `backoff: { type: 'exponential', delay: 2000 }`.
2. **`reminder-queue`**:
   - Manages recurring cron-based medication schedules.
3. **`dead-letter-queue`**:
   - If an email job fails permanently after 5 attempts, it is caught in the worker's `.on('failed')` callback and moved to the dead letter queue to ensure messages are never lost.
4. **`ai-queue`**:
   - Retries failed pre-visit and post-visit summaries in the background up to 5 times with exponential backoff.

---

## Google Calendar Setup

To connect Google Calendar integration for doctors:

### 1. GCP OAuth Credentials
Create an OAuth 2.0 Client ID in the Google Cloud Console:
- Set application type to **Web Application**.
- Add the redirect URI to the whitelist: `http://localhost:5000/api/v1/calendar/callback`.

### 2. Configure Environment Keys
Add your credentials to the backend configuration:
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/calendar/callback
```

### 3. Sync Sequence
- When an appointment is booked, a Google Calendar event is created with the patient email added as an attendee.
- Rescheduling an appointment issues a `PUT` request to update the Google Calendar event in-place.
- Cancellations send a `DELETE` request.
- Expired access tokens (401 responses) are intercepted and refreshed automatically using the doctor's stored Google refresh token before retrying.
- Transient errors are caught and retried up to 3 times via `fetchWithRetry()`.

---

## Email Configuration

Outgoing emails are sent using SendGrid.

### 1. Configure Credentials
Add the SendGrid key and default email address in the backend config:
```env
SENDGRID_API_KEY=SG.your_sendgrid_key_string
EMAIL_FROM_ADDRESS=notifications@yourdomain.com
```

### 2. Graceful Degradation
If no SendGrid API Key is configured (or if it is set to `mock-sendgrid-api-key`), the worker bypasses the SendGrid API call and logs the email content to the console in development mode, ensuring the app remains fully functional in local sandboxes.

---

## Production Deployment Guide

### Deployment Checklist
1. **Container Builds**: Build the production backend Docker image:
   ```bash
   docker build -f backend/Dockerfile -t healthcare-backend:latest .
   ```
2. **Frontend Builds**: Compile frontend assets to static files:
   ```bash
   npm run build:frontend
   ```
3. **Secrets**: Replace default development secrets with production-grade strings:
   - Generate secure access/refresh token keys: `openssl rand -hex 32`
4. **Database Migrations**: Run migrations on your production database host:
   ```bash
   npx prisma migrate deploy
   ```

### Recommended Infrastructure Layout
- **Frontend App**: Deploy compiled static assets to AWS S3 and distribute via CloudFront CDN.
- **Backend API**: Run backend Docker containers on AWS ECS Fargate behind an Application Load Balancer (ALB).
- **Database**: Run a managed MySQL instance on AWS RDS with Multi-AZ replication enabled.
- **Redis Cache**: Run a managed Redis instance on AWS ElastiCache.

---

## Security & HIPAA Compliance

The platform includes safeguards for patient data (PHI) protection:

- **Audit Trails**: Every access to patient records, prescription creation, and reminder updates is logged to an immutable `audit_logs` database table.
- **PII Sanitization**: Outgoing prompts are passed through a regex-based PII filter before sending data to OpenAI APIs, stripping names, SSNs, phone numbers, and email patterns.
- **Argon2id Hashing**: User passwords are encrypted using Argon2id before storage.
- **Rotation Access Tokens**: Short-lived JWT tokens expire in 15 minutes, while refresh tokens rotatively self-destruct upon use to prevent session hijacking.
- **Security Headers**: Standard Express Helmet middleware configurations are active to prevent scripting injection attacks.
"# Health_Appointment_Project" 
# Health_Appointment_Project
