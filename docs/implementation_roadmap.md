# Master Development Plan: Implementation Roadmap
## Project: Healthcare Appointment & Follow-up Manager

This document maps out the 25 incremental development phases for building the Healthcare Appointment & Follow-up Manager. It serves as the master checklist and dependency tree for developers executing the project.

---

## 1. Monorepo Dependency & Phase Tree

```
Phase 1 (Monorepo Config) ──> Phase 2 (DB Config) ──> Phase 3 (Logging & Exceptions)
                                    │
                                    ▼
Phase 4 (Shared schemas) ──> Phase 5 (Identity DB Schema) ──> Phase 6 (Register API)
                                                                    │
                                                                    ▼
Phase 9 (Patient UI skeleton) <── Phase 8 (MFA Verification) <── Phase 7 (Login & JWT)
       │
       ▼
Phase 10 (Doctor specialty directory search) ──> Phase 11 (Schedule Grid UI & Engine)
                                                      │
                                                      ▼
Phase 14 (Leave Requests Engine) <── Phase 13 (Booking UI) <── Phase 12 (Booking Lock API)
       │
       ▼
Phase 15 (BullMQ Queue Setup) ──> Phase 16 (Notification Workers) ──> Phase 17 (Medication Reminders)
                                                                           │
                                                                           ▼
Phase 20 (AI LLM Gateway) <── Phase 19 (Google Webhooks) <── Phase 18 (Google OAuth Sync)
       │
       ▼
Phase 21 (Symptom Chat) ──> Phase 22 (AI Notes Summary) ──> Phase 23 (Audit logs DB policy)
                                                                  │
                                                                  ▼
                                                      Phase 24 (Analytics & Admin UI)
                                                                  │
                                                                  ▼
                                                      Phase 25 (Docker & Deployment)
```

---

## 2. Phase-by-Phase Specifications

---

### Phase 1: Workspace & Monorepo Initialization
*   **Objective**: Establish the workspace root, configuring TypeScript monorepo build boundaries for `frontend`, `backend`, and `shared`.
*   **Files to create**:
    *   `/package.json` (Root package layout definition)
    *   `/tsconfig.json` (Shared compiler flags)
    *   `/backend/package.json`, `/backend/tsconfig.json`
    *   `/frontend/package.json`, `/frontend/tsconfig.json`
    *   `/shared/package.json`, `/shared/tsconfig.json`
*   **Files to modify**: None.
*   **Expected output**: A clean workspace structure compile-check verification success when running `npm run build` from root.
*   **Testing steps**: Run `npm install` and verify node_modules map correctly across packages using npm workspaces symlink layouts.
*   **Acceptance criteria**: Monorepo compilation succeeds with zero global TypeScript configurations leaking bounds.
*   **Dependencies**: None.
*   **Risk factors**: Symlink path mapping failures on local machines.
*   **Important notes for future phases**: Ensures all code packages can resolve the shared library workspace.

---

### Phase 2: Database Configuration & Migration setup
*   **Objective**: Configure the MySQL connection pool, instantiate the database configurations, and initialize the Prisma client schema.
*   **Files to create**:
    *   `backend/src/database/prisma.service.ts`
    *   `backend/src/database/schema.prisma`
    *   `backend/src/config/database.config.ts`
*   **Files to modify**: `backend/src/app.module.ts`.
*   **Expected output**: Prisma generates typings and connects to local MySQL.
*   **Testing steps**: Run `npx prisma migrate dev --name init` and verify database tables are created.
*   **Acceptance criteria**: Database tables match the design document definitions, and migrations history resolves cleanly.
*   **Dependencies**: Phase 1.
*   **Risk factors**: MySQL dialect connection latency or connection pool starvation under tests.
*   **Important notes**: Establish database indexing strategies here.

---

### Phase 3: Logging Integration & Global Exceptions Filter
*   **Objective**: Build the logging middleware (Winston) and global exception handler to normalize API error responses.
*   **Files to create**:
    *   `backend/src/common/filters/http-exception.filter.ts`
    *   `backend/src/common/interceptors/logging.interceptor.ts`
    *   `backend/src/common/utils/logger.ts`
*   **Files to modify**: `backend/main.ts`, `backend/src/app.module.ts`.
*   **Expected output**: Express requests generate correlation IDs and log structured JSON; exceptions yield standardized JSON errors.
*   **Testing steps**: Call an undefined API route and verify structure of the output JSON error payload.
*   **Acceptance criteria**: Logs output correlation IDs and strip basic credentials. Error responses match the standard API error payload schema.
*   **Dependencies**: Phase 2.
*   **Risk factors**: High disk write latency if file logging is enabled during performance tests.
*   **Important notes**: Logs must redact passwords.

---

### Phase 4: Shared Monorepo Schemas & Constants
*   **Objective**: Setup the core TypeScript contract package holding Zod schemas and global enum definitions.
*   **Files to create**:
    *   `shared/src/constants/roles.ts`
    *   `shared/src/schemas/auth.schema.ts`
    *   `shared/src/types/index.ts`
*   **Files to modify**: None.
*   **Expected output**: Built TS assets exported to node_modules under the `@shared` workspace namespace.
*   **Testing steps**: Try importing a constant from `@shared` inside the backend project and trigger local compilation checks.
*   **Acceptance criteria**: Shared schemas resolve with autocomplete and type assertions in both workspaces.
*   **Dependencies**: Phase 1.
*   **Risk factors**: Hot reloading configurations in Next.js might fail to detect changes inside the shared folder path.
*   **Important notes**: Keeps validation patterns identical on client and server.

---

### Phase 5: Identity DB Modeling & Seeding
*   **Objective**: Deploy the database schemas for Users, Sessions, and Refresh Tokens. Seed the database with administrative configurations.
*   **Files to create**:
    *   `scripts/db-seed.ts`
*   **Files to modify**: `backend/src/database/schema.prisma`.
*   **Expected output**: PostgreSQL/MySQL tables populate with default roles.
*   **Testing steps**: Run db-seed scripts and check record contents using database explorer tools.
*   **Acceptance criteria**: Tables match design profiles. Seeding generates at least one Admin and one Doctor test user.
*   **Dependencies**: Phase 2, Phase 4.
*   **Risk factors**: Prisma schema relation matching issues.
*   **Important notes**: Soft-delete parameters must default to `is_deleted = 0`.

---

### Phase 6: Registration & Argon2id Hashing API
*   **Objective**: Build the user registration endpoint securing credentials with Argon2id.
*   **Files to create**:
    *   `backend/src/modules/auth/auth.controller.ts`
    *   `backend/src/modules/auth/auth.service.ts`
    *   `backend/src/modules/auth/dto/register.dto.ts`
*   **Files to modify**: `backend/src/app.module.ts`.
*   **Expected output**: `POST /api/v1/auth/register` creates user accounts.
*   **Testing steps**: Submit invalid/duplicate payloads and verify standard validation responses.
*   **Acceptance criteria**: Invalid email formatting yields HTTP 400. Password hash verified as Argon2 format in database entries.
*   **Dependencies**: Phase 5.
*   **Risk factors**: Argon2 compiler configurations might conflict with node target platform environments.
*   **Important notes**: Password length validations must enforce high-entropy standards.

---

### Phase 7: Login & Refresh Token Rotation (RTR) API
*   **Objective**: Deploy login routes issuing access tokens (JWT) and refresh cookies matching RTR policies.
*   **Files to create**:
    *   `backend/src/modules/auth/strategies/jwt.strategy.ts`
    *   `backend/src/modules/auth/guards/jwt-auth.guard.ts`
*   **Files to modify**: `backend/src/modules/auth/auth.service.ts`.
*   **Expected output**: `POST /api/v1/auth/login` yields JWT access tokens and HttpOnly secure cookies.
*   **Testing steps**: Replay an old refresh token and verify if active user sessions get revoked.
*   **Acceptance criteria**: Exchanged refresh tokens immediately invalidate the active token family. Cookies set to SameSite=Strict.
*   **Dependencies**: Phase 6.
*   **Risk factors**: Clock skew latency between servers causing immediate token expiry.
*   **Important notes**: JWT payload must not hold user identity details.

---

### Phase 8: Multi-Factor Authentication (MFA) API
*   **Objective**: Enable TOTP based MFA configurations (setup and verify API endpoints).
*   **Files to create**:
    *   `backend/src/modules/auth/auth.mfa.service.ts`
*   **Files to modify**: `backend/src/modules/auth/auth.controller.ts`.
*   **Expected output**: Users can activate TOTP, retrieve QR layouts, and submit verify tokens.
*   **Testing steps**: Test authentication paths with and without valid TOTP codes.
*   **Acceptance criteria**: Valid verification tokens unlock session flags; invalid tokens yield HTTP 401.
*   **Dependencies**: Phase 7.
*   **Risk factors**: Out of sync device clocks causing validation failures.
*   **Important notes**: Store backup emergency recovery keys.

---

### Phase 9: Patient Portal UI & Dashboard Skeleton
*   **Objective**: Initialize frontend dashboard screens featuring navigation bars and loading states.
*   **Files to create**:
    *   `frontend/src/app/(patient)/dashboard/page.tsx`
    *   `frontend/src/components/ui/Button.tsx`
    *   `frontend/src/styles/variables.css`
*   **Files to modify**: `frontend/src/app/layout.tsx`.
*   **Expected output**: Responsive patient portal loading skeleton using variable design tokens.
*   **Testing steps**: Resize screen and check responsive mobile breakpoint styling.
*   **Acceptance criteria**: WCAG 2.1 AA compliant color checks. Shift layouts avoid flashing content layout shifts (CLS).
*   **Dependencies**: Phase 1, Phase 8.
*   **Risk factors**: CSS Module class clashes.
*   **Important notes**: Establish the visual layout and CSS variables here.

---

### Phase 10: Doctor Directory Search API
*   **Objective**: Build doctor directory searches with specialties, pagination, and sorting capabilities.
*   **Files to create**:
    *   `backend/src/modules/user/doctor.controller.ts`
    *   `backend/src/modules/user/doctor.service.ts`
*   **Files to modify**: `backend/src/app.module.ts`.
*   **Expected output**: `GET /api/v1/doctors` handles paginated queries.
*   **Testing steps**: Submit request queries targeting specific specialties.
*   **Acceptance criteria**: Search indexes optimize response latencies below 100ms.
*   **Dependencies**: Phase 5.
*   **Risk factors**: Slow searches if indexes on specialties are missing.
*   **Important notes**: Expose only public info; omit private IDs.

---

### Phase 11: Schedule Engine & Availability UI
*   **Objective**: Implement schedule rules configuration APIs and render the availability grid UI.
*   **Files to create**:
    *   `backend/src/modules/schedule/schedule.service.ts`
    *   `frontend/src/components/shared/ScheduleGrid.tsx`
*   **Files to modify**: `backend/src/database/schema.prisma`.
*   **Expected output**: Doctors can define standard availability patterns.
*   **Testing steps**: Input overlapping availability patterns and verify validation failures.
*   **Acceptance criteria**: Schedule rules block duplicate overlaps and render cleanly on the frontend.
*   **Dependencies**: Phase 9, Phase 10.
*   **Risk factors**: Complex day-of-week transformations between user local time zones.
*   **Important notes**: Persist schedules relative to doctor local time zones.

---

### Phase 12: Appointment Booking & Database Locking API
*   **Objective**: Create the booking transaction engine, applying pessimistic locks to prevent double bookings.
*   **Files to create**:
    *   `backend/src/modules/appointment/appointment.controller.ts`
    *   `backend/src/modules/appointment/appointment.service.ts`
*   **Files to modify**: `backend/src/database/schema.prisma`.
*   **Expected output**: Safe booking execution even under high concurrent volumes.
*   **Testing steps**: Run concurrent mock client bookings against the exact same doctor slot.
*   **Acceptance criteria**: One booking transaction succeeds; the concurrent bookings fail with HTTP 409 slot booked errors.
*   **Dependencies**: Phase 11.
*   **Risk factors**: Database locks causing table thread locks if queries hang.
*   **Important notes**: Encapsulate logic inside database transactions.

---

### Phase 13: Patient Booking Dashboard UI
*   **Objective**: Build the patient interface to search, book, and cancel appointments.
*   **Files to create**:
    *   `frontend/src/app/(patient)/dashboard/book/page.tsx`
    *   `frontend/src/hooks/useAppointments.ts`
*   **Files to modify**: `frontend/src/app/(patient)/dashboard/page.tsx`.
*   **Expected output**: Operational booking flow from doctor search to confirmation screen.
*   **Testing steps**: Book an appointment, verify the record in the database, then cancel it.
*   **Acceptance criteria**: State transitions trigger toast alerts. Cancel requests update the database immediately.
*   **Dependencies**: Phase 9, Phase 12.
*   **Risk factors**: Handling state mismatches when API calls latency is high.
*   **Important notes**: Animate transitions using Framer Motion.

---

### Phase 14: Doctor Leave Engine & Rescheduling Jobs
*   **Objective**: Allow doctors to submit leaves, automatically canceling conflicting appointments.
*   **Files to create**:
    *   `backend/src/modules/schedule/leave.controller.ts`
    *   `backend/src/modules/schedule/leave.service.ts`
*   **Files to modify**: `backend/src/modules/appointment/appointment.service.ts`.
*   **Expected output**: Leaves are blocked, and affected appointments are set to cancelled.
*   **Testing steps**: Create conflicting appointments, register leave, and check affected appointment statuses.
*   **Acceptance criteria**: Overlapping appointments are cancelled; email notification alerts are queued.
*   **Dependencies**: Phase 12.
*   **Risk factors**: Cascading rescheduling jobs timing out.
*   **Important notes**: Decouple rescheduling loops using async events.

---

### Phase 15: Background queues (Redis & BullMQ Setup)
*   **Objective**: Configure Redis connection wrappers and initialize BullMQ queues.
*   **Files to create**:
    *   `backend/src/config/redis.config.ts`
    *   `backend/src/common/services/queue.service.ts`
*   **Files to modify**: `backend/src/app.module.ts`.
*   **Expected output**: BullMQ establishes robust connection pools with Redis.
*   **Testing steps**: Push dummy jobs to Redis and verify execution logging output.
*   **Acceptance criteria**: Workers reconnect after dropouts; jobs persist across system restarts.
*   **Dependencies**: Phase 3.
*   **Risk factors**: Redis memory limit exceptions under high job volume.
*   **Important notes**: Secure the Redis connection using TLS.

---

### Phase 16: Notification Dispatcher (Email & Web Push)
*   **Objective**: Build SendGrid email and web push notification dispatchers.
*   **Files to create**:
    *   `backend/src/modules/notification/notification.worker.ts`
    *   `backend/src/modules/notification/notification.service.ts`
*   **Files to modify**: `backend/src/app.module.ts`.
*   **Expected output**: Real-time email notifications dispatched to users.
*   **Testing steps**: Trigger an event and verify email delivery using a mock SMTP client.
*   **Acceptance criteria**: Emails render HTML templates. Failed deliveries trigger up to 5 automatic retries.
*   **Dependencies**: Phase 15.
*   **Risk factors**: API key limits blocking outgoing notification payloads.
*   **Important notes**: Never include PII/PHI in email subject headings.

---

### Phase 17: Medication Reminder Scheduler
*   **Objective**: Build the medication reminder cron scheduler.
*   **Files to create**:
    *   `backend/src/modules/notification/reminder.scheduler.ts`
    *   `backend/src/modules/notification/reminder.worker.ts`
*   **Files to modify**: `backend/src/database/schema.prisma`.
*   **Expected output**: System scans DB hourly, staging reminders for upcoming doses.
*   **Testing steps**: Set user reminder records and verify worker trigger times.
*   **Acceptance criteria**: Reminders fire within 60 seconds of scheduled target times.
*   **Dependencies**: Phase 16.
*   **Risk factors**: Scheduling errors when timezone updates occur.
*   **Important notes**: Translate user-defined schedules into UTC times.

---

### Phase 18: Google Calendar Sync Engine
*   **Objective**: Implement Google Calendar sync for doctor schedules.
*   **Files to create**:
    *   `backend/src/modules/schedule/calendar-sync.service.ts`
    *   `backend/src/modules/schedule/strategies/google-calendar.strategy.ts`
*   **Files to modify**: `backend/src/modules/appointment/appointment.service.ts`.
*   **Expected output**: Local bookings automatically sync to doctor Google Calendars.
*   **Testing steps**: Book an appointment, check doctor Google Calendar entries.
*   **Acceptance criteria**: Calendar entries reflect scheduling updates within 5 seconds.
*   **Dependencies**: Phase 12, Phase 16.
*   **Risk factors**: Token expiry and handling refresh credential storage.
*   **Important notes**: Encrypt refresh tokens at rest.

---

### Phase 19: Google Calendar Webhook Receiver
*   **Objective**: Create a webhook endpoint that processes updates from Google Calendar.
*   **Files to create**:
    *   `backend/src/modules/schedule/webhook.controller.ts`
*   **Files to modify**: `backend/src/modules/schedule/calendar-sync.service.ts`.
*   **Expected output**: Changes in Google Calendar block local availabilities.
*   **Testing steps**: Block a slot in Google Calendar, verify local DB slot status.
*   **Acceptance criteria**: Local schedule database updates dynamically on Google Webhook notifications.
*   **Dependencies**: Phase 18.
*   **Risk factors**: Malicious webhooks targeting the endpoint (validate signatures).
*   **Important notes**: Webhook handler must acknowledge Google requests instantly.

---

### Phase 20: AI Gateway Service & PII Filter
*   **Objective**: Build the AI engine gateway with PII sanitization capabilities.
*   **Files to create**:
    *   `backend/src/modules/ai/ai.gateway.ts`
    *   `backend/src/modules/ai/utils/pii-filter.ts`
*   **Files to modify**: `backend/src/app.module.ts`.
*   **Expected output**: Clear message inputs stripped of PII prior to calling remote APIs.
*   **Testing steps**: Input dummy notes containing names/SSNs, verify sanitized outputs.
*   **Acceptance criteria**: PII is redacted, and templates are maintained for response rehydration.
*   **Dependencies**: Phase 3.
*   **Risk factors**: Regex failures on non-standard formatting.
*   **Important notes**: Perform sanitization locally on the server.

---

### Phase 21: AI Symptom Triage Parser & UI
*   **Objective**: Deploy the triage chatbot parser UI.
*   **Files to create**:
    *   `frontend/src/components/shared/SymptomChat.tsx`
    *   `backend/src/modules/ai/ai.triage.service.ts`
*   **Files to modify**: `frontend/src/app/(patient)/dashboard/page.tsx`.
*   **Expected output**: Conversational symptom parser providing triage suggestions.
*   **Testing steps**: Run triage chat flows and check structured triage results.
*   **Acceptance criteria**: Urgency levels map cleanly to one of the predefined ENUM options.
*   **Dependencies**: Phase 9, Phase 20.
*   **Risk factors**: AI hallucinations advising users incorrectly on emergencies.
*   **Important notes**: Display medical disclaimers prominently in the UI.

---

### Phase 22: AI Consultation Summaries
*   **Objective**: Build the translation processor creating patient summaries from doctor notes.
*   **Files to create**:
    *   `backend/src/modules/ai/ai.summary.worker.ts`
*   **Files to modify**: `backend/src/modules/appointment/appointment.service.ts`.
*   **Expected output**: Jargon-free translations of medical summaries generated on consultation ends.
*   **Testing steps**: Seed complex medical notes, verify simplified outputs.
*   **Acceptance criteria**: Output meets standard readability scores.
*   **Dependencies**: Phase 17, Phase 20.
*   **Risk factors**: AI translation changes critical diagnostic meanings.
*   **Important notes**: Save summaries to database for audit history.

---

### Phase 23: Admin Operations & Immutable Audit Logs
*   **Objective**: Enforce write-once audit log schema rules.
*   **Files to create**:
    *   `backend/src/modules/audit/audit.service.ts`
    *   `backend/src/modules/audit/audit.middleware.ts`
*   **Files to modify**: `backend/src/app.module.ts`.
*   **Expected output**: Access logs recorded on all PHI lookups.
*   **Testing steps**: Access patient records, verify audit log database entries.
*   **Acceptance criteria**: Log records are created. Database rejects all update/delete queries on audit tables.
*   **Dependencies**: Phase 5.
*   **Risk factors**: Audit logs bloating database size over time.
*   **Important notes**: Partition database tables by year.

---

### Phase 24: Admin Analytics & Live Logs UI
*   **Objective**: Build the admin dashboard UI showing real-time metrics and compliance logs.
*   **Files to create**:
    *   `frontend/src/app/(admin)/dashboard/page.tsx`
    *   `frontend/src/components/charts/MetricsChart.tsx`
*   **Files to modify**: `frontend/src/app/layout.tsx`.
*   **Expected output**: Dashboard displaying system metrics, read latencies, and logs.
*   **Testing steps**: Run user actions and observe the real-time compliance feed update.
*   **Acceptance criteria**: Charts render cleanly and update data dynamically.
*   **Dependencies**: Phase 23.
*   **Risk factors**: Dashboard queries impacting database read performance.
*   **Important notes**: Run aggregations against database read replicas.

---

### Phase 25: Dockerization & Cloud CI/CD
*   **Objective**: Create Docker containers and configure CI/CD pipelines.
*   **Files to create**:
    *   `/Dockerfile.backend`
    *   `/Dockerfile.frontend`
    *   `/.github/workflows/deploy.yml`
*   **Files to modify**: None.
*   **Expected output**: Containers build and pass health check criteria.
*   **Testing steps**: Build local containers and run E2E Playwright test suites.
*   **Acceptance criteria**: Pipeline builds and deploys packages automatically on release tag triggers.
*   **Dependencies**: All previous phases.
*   **Risk factors**: Container build failure due to platform dependency mismatch.
*   **Important notes**: Secrets are injected at runtime, never hardcoded in files.
