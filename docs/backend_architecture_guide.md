# Backend Architecture Guide
## Project: Healthcare Appointment & Follow-up Manager

This document defines the backend architectural patterns, layer interactions, data flow pathways, and external service integration designs using **Node.js**, **Express**, **TypeScript**, **Prisma**, and **MySQL**.

---

## 1. Architectural Layers & Blueprint

```
[ HTTP Request ]
       │
       ▼
 1. [ Middleware Layer ] ── (Auth Check, Rate Limiting, Logging)
       │
       ▼
 2. [ Validation Layer ] ── (Zod Schema Validation)
       │
       ▼
 3. [ Controller Layer ] ── (Parses Request parameters, maps HTTP status codes)
       │
       ▼
 4. [ Service Layer ]    ── (Business Rules, transaction orchestrations)
       │
 ┌─────┴────────────────────────────────────────┐
 │                                              │
 ▼                                              ▼
5. [ Repository Layer ]                6. [ Infrastructure Integration ]
(Prisma/MySQL CRUD Operations)         (BullMQ, OpenAI/Gemini, Google APIs)
```

---

## 2. Structural Layer Responsibilities

1.  **Configuration Layer (`/config`)**: Declares validated environment profiles. Ensures server environment configs are strictly typed.
2.  **Middleware Layer (`/middleware`)**: Pre-processes incoming HTTP requests (extracts JWTs, rates limits requests, establishes request correlation IDs).
3.  **Validation Layer (`/validation`)**: Enforces input payload schemas before passing data to Controllers.
4.  **Controller Layer (`/controllers`)**: Translates HTTP transport protocol parameters (query params, body data, headers) into service payloads and maps return values to clean HTTP responses.
5.  **Service Layer (`/services`)**: Contains core healthcare business logic (e.g., booking rules, leave conflict checks). Fully decoupled from Express HTTP requests.
6.  **Repository Layer (`/repositories`)**: Abstracts the database operations. Interfaces directly with the Prisma client, translating business models to MySQL database transactions.
7.  **Utility Layer (`/utils`)**: Provides stateless general helper functions (date parsing, calculation utilities).
8.  **Logging Layer (`/logging`)**: Winston-powered structured logger supporting telemetry correlation tracking.
9.  **Background Jobs Layer (`/jobs`)**: BullMQ job processors executing tasks asynchronously.

---

## 3. Operational Mechanics & Core Workflows

### 3.1 Request Lifecycle Flow
1.  **Ingress**: The client sends an HTTP request. Morgan middleware intercepts it, injecting a unique `x-correlation-id` header for request tracing.
2.  **Security Filtering**: Authentication middleware verifies the session JWT cookie. If the token is valid, it injects the User payload onto the `req.user` context.
3.  **Data Validation**: Route-specific Zod validation middleware intercepts the payload. If parameters fail schema checks, validation terminates the request early and returns an HTTP 400 response.
4.  **Routing**: The Controller receives the clean, parsed request object. It calls the necessary Service function.
5.  **Business Execution**: The Service executes logic, coordinates repositories, and raises exceptions if rule violations occur.
6.  **Egress**: The Controller captures the Service response and outputs a standardized JSON payload along with appropriate HTTP headers.

### 3.2 Service-to-Service Communication
*   **Direct Inversion of Control**: Services interact through Dependency Injection (DI) of interfaces.
*   **Event-Driven Decoupling**: For non-blocking workflows (e.g., "appointment scheduled" triggering a calendar invite sync and email reminder registration), Services emit internal events using `EventEmitter2`. This keeps services independent and avoids bloated monolithic controller files.

### 3.3 Error Propagation Mechanism
*   **Centralized Exception Engine**: The Service layer throws custom domain exceptions (e.g., `ScheduleConflictError`, `DatabaseTransactionError`) deriving from a base `AppError` class containing semantic error codes and HTTP mapping data.
*   **Middleware Boundary**: An Express global error handling middleware sits at the outermost ring. It intercepts uncaught exceptions, logs the detailed stack trace to stdout along with the tracking `correlation-id`, and strips sensitive database details before returning a clean JSON error template to the client.

### 3.4 Repository Pattern Execution
*   **Decoupled Database layer**: Services never communicate directly with Prisma query syntax. Instead, they reference custom Repositories (e.g., `AppointmentRepository`).
*   **Benefits**:
    *   *Mockability*: Allows mocking database responses easily during unit testing without spinning up actual MySQL tables.
    *   *Portability*: If database query interfaces change, only the repository code changes; the service layers remain completely unaffected.

### 3.5 Database Transaction Management
*   **Prisma Client Transactions**: Handled within the Service layer via Prisma’s interactive transactions client (`prisma.$transaction`).
*   **Isolation Level**: Configured to `SERIALIZABLE` or `REPEATABLE READ` at the MySQL level for booking transactions.
*   **Operational Execution**: When booking an appointment, the service initiates a transaction block:
    1. Locks the Doctor Availability record row (`SELECT ... FOR UPDATE`).
    2. Verifies the slot state.
    3. Writes the Appointment record.
    4. Marks the availability slot as booked.
    5. Commits the transaction. If any step fails, MySQL rolls back the entire transaction block.

---

## 4. Integration Specifications

### 4.1 AI Symptom Analyzer & Note Summarizer Integration
*   **Gateways Pattern**: An isolated `AiGatewayService` encapsulates all LLM calls (OpenAI, Gemini).
*   **Data Sanitation (PII Masking)**: Before payloads leave the server bounds, a local utility sanitizes names, phone numbers, and addresses, replacing them with metadata tokens (e.g., `[PATIENT_ID_1]`).
*   **Prompt Management**: Prompts are stored in external template directories as markdown assets, enabling version tracking and decoupling prompt adjustments from operational code deployments.

### 4.2 Email Notification Delivery
*   **Async Dispatch**: The Service layer registers an email task onto the BullMQ `email-queue`.
*   **Worker Execution**: A background worker thread picks up the job, compiles HTML parameters into standard templates, and posts requests to the SendGrid/SES API with exponential backoff retry algorithms.

### 4.3 Google Calendar Bidirectional Sync
*   **OAuth Lifecycle**: Doctor Google tokens are securely encrypted using application keys before storing in MySQL.
*   **Sync Listener**: The system listens to local schedule changes and uses Google API clients to patch calendar events.
*   **Incoming Sync Webhook**: An API endpoint catches push notification webhooks from Google Calendar, queues them as sync jobs, and checks for doctor availabilities or leaves within the schedule engine.

### 4.4 Medication Reminder & Cron Jobs
*   **Queue Engine**: BullMQ parses reminder frequencies into delayed jobs.
*   **Job Creation**: A nightly CRON schedule identifies reminders scheduled for the next 24 hours and queues them onto Redis.
*   **Worker Trigger**: At the designated time, the BullMQ worker retrieves the job and alerts the patient via SMS or web push.

### 4.5 User Authentication & Session Security
*   **JWT Handshake**: Auth routes issue dual JSON Web Tokens:
    1. An access token (short lifetime: 15 minutes, stored in memory).
    2. A refresh token (long lifetime: 7 days, encrypted and stored in MySQL with an HttpOnly cookie).
*   **Step-Up Auth**: Accessing high-security paths (such as downloading complete medical records) prompts authentication validation checks requiring MFA validation codes.
