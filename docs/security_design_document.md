# Security Design Document
## Project: Healthcare Appointment & Follow-up Manager

This document defines the security architecture and defensive controls for the application, with specific focus on HIPAA and GDPR compliance requirements for protecting Patient Health Information (PHI) and Personally Identifiable Information (PII).

---

## 1. Authentication & Session Strategy

### 1.1 Secure Authentication Flow
*   **Dual-factor Authentication (MFA)**: Users must verify their credentials via a multi-factor handshake (TOTP using Google Authenticator or SMS codes).
*   **Step-Up Authentication**: Triggered when a user performs high-risk activities (e.g., editing medical records, modifying configuration keys, or updating payment profiles). The system prompts for MFA confirmation even if the session is already authenticated.

### 1.2 Access & Refresh Token Architecture
*   **Access Tokens (JWT)**:
    *   *Signature Algorithm*: `RS256` (Asymmetric signature using a private key on the authentication server and a public key on resource servers).
    *   *Expiration*: 15 minutes.
    *   *Payload*: Subject (user ID), role, standard JWT claims (`iss`, `sub`, `exp`, `iat`, `nbf`). Does *not* contain PII or PHI.
*   **Refresh Tokens**:
    *   *Token Structure*: High-entropy cryptographically secure random strings stored as SHA-256 hashes in the MySQL database.
    *   *Storage*: Dispatched to clients via HttpOnly, Secure, SameSite=Strict cookies.
    *   *Refresh Token Rotation (RTR)*: Every time a refresh token is exchanged, the old token is invalidated, and a new one is issued. If a client attempts to reuse an old refresh token, the server immediately marks the entire token family as compromised, revoking all active sessions for that user to prevent session hijacking.
*   **Session Revocation**: Storing active sessions in a Redis cache allows immediate session invalidation when a user logs out, resets their password, or is terminated by an administrator.

---

## 2. Authorization & Access Control

### 2.1 Role-Based Access Control (RBAC) & Context Guards
*   **Declarative Rules**: Custom NestJS guards enforce resource accessibility rules.
*   **Dynamic Context Filtering**: In addition to checking static roles, the system validates row-level relationships (e.g., a doctor can only retrieve patient profiles if there is an active or upcoming appointment linking them, satisfying the HIPAA "minimum necessary" disclosure rule).

### 2.2 Password Security
*   **Hashing Algorithm**: `Argon2id` (specifically profile `Argon2id v=19`) is selected over standard bcrypt for superior memory-hard defense against GPU/ASIC brute-force attacks.
*   **Configuration**: Memory parameter: 64MB, time cost: 3 iterations, parallelism: 4 threads.

---

## 3. Web Application Defenses

### 3.1 CSRF (Cross-Site Request Forgery) Prevention
*   **SameSite Cookie Configuration**: All authentication cookies carry the `SameSite=Strict` attribute, preventing browsers from appending tokens to cross-site requests.
*   **Double-Submit Cookie Pattern**: For state-mutating requests (`POST`, `PUT`, `DELETE`), the frontend generates a cryptographically random token, attaches it to custom headers (`X-CSRF-Token`), and validates it against a cookie value at the API gateway layer.

### 3.2 CORS (Cross-Origin Resource Sharing) Policies
*   **Explicit Whitelist**: Wildcard origins (`*`) are strictly forbidden. Access is restricted to explicit frontend domains configuration parameters.
*   **Credential Limits**: `Access-Control-Allow-Credentials` is set to `true` only for whitelisted origins.

### 3.3 HTTP Headers Security (Helmet)
Express endpoints execute `Helmet` middleware to set essential security headers:
*   `Content-Security-Policy (CSP)`: Disables inline scripts and limits execution to trusted local scripts and whitelisted API endpoints.
*   `Strict-Transport-Security (HSTS)`: Forces SSL connection requirements (`max-age=63072000; includeSubDomains; preload`).
*   `X-Frame-Options`: Set to `DENY` to prevent clickjacking.
*   `X-Content-Type-Options`: Set to `nosniff` to prevent mime-sniffing exploits.

### 3.4 API Rate Limiting
*   **Distributed Rate Limiting**: Managed by a Redis token bucket algorithm.
*   **Thresholds**:
    *   *Authentication Endpoints* (`/login`, `/register`, `/mfa`): 5 attempts per IP address per 15-minute window.
    *   *AI Triage Endpoint*: 10 requests per user per hour to prevent API exploitation.
    *   *General API Routes*: 100 requests per minute.

---

## 4. Input Sanitation & Injection Defenses

### 4.1 Input Validation Schema
*   **Type Constraints**: Every API payload is validated against a schema using **Zod**. Input is sanitized, and any undocumented fields are immediately discarded before reaching service layers.

### 4.2 SQL Injection Prevention
*   **Prisma Parameterized Queries**: Prisma ORM executes parameterized queries under the hood, neutralizing SQL injection vectors by treating all input parameters as literal values rather than executable code.
*   **Raw Query Ban**: Manual raw SQL calls (`prisma.$queryRaw`) are forbidden unless approved through an Architectural Review Board. If raw queries are necessary, parameters must be passed using typed placeholder structures, never raw string interpolations.

### 4.3 XSS (Cross-Site Scripting) Defense
*   **Sanitization Pipelines**: Input containing markdown or rich-text data (e.g., patient descriptions or clinical notes) is sanitized using `DOMPurify` on the client side before rendering, and parsed via server-side filters.
*   **Output Encoding**: Next.js automatically escapes variable context values rendered in TSX page scopes, preventing DOM-based XSS injections.

---

## 5. Security Audits & Compliance Logs

### 5.1 Immutable Audit Trail
To satisfy HIPAA compliance, every access to Patient Health Information (PHI) generates an entry in our audit logging system:
*   **Log Data**: User ID, IP address, Action, Target ID, Correlation ID, and Timestamp.
*   **Security Control**: Audit records are stored in a dedicated, insert-only database table. Updates and deletes are blocked at the database layer.

### 5.2 Log Sanitization
*   **Winston Filter Interceptors**: Winston logs run through a sanitization pipeline that uses regex patterns to strip sensitive fields (like credit card numbers, passwords, SSNs, and medical notes) before writing to disk, ensuring no PHI/PII leaks into diagnostic log files.
