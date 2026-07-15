# Coding Standards Document
## Project: Healthcare Appointment & Follow-up Manager

This document defines the coding standards, structural conventions, naming rules, and checklists to be followed by all developers throughout the project lifecycle.

---

## 1. Naming Conventions

*   **Folder Naming**:
    *   *Frontend & Monorepo roots*: kebab-case (e.g., `/appointment-booking`, `/e2e-tests`).
    *   *Backend NestJS Modules*: kebab-case (e.g., `/symptom-analysis`).
*   **File Naming**:
    *   *React Components*: PascalCase (e.g., `PatientCard.tsx`).
    *   *TypeScript files (services, utilities, helpers)*: camelCase with suffix identifier (e.g., `appointmentService.ts`, `dateFormatter.ts`).
    *   *Styling (CSS Modules)*: PascalCase matching component name (e.g., `PatientCard.module.css`).
*   **Variable Naming**: camelCase (e.g., `doctorAvailabilitySlot`). Boolean variables must carry an active prefix (e.g., `isMfaEnabled`, `hasSymptomRecords`).
*   **Function Naming**: camelCase using a verb-noun prefix (e.g., `fetchAppointments()`, `createPrescriptionRecord()`).
*   **Class Naming**: PascalCase (e.g., `AppointmentController`, `PrismaService`).
*   **Environment Variables**: UPPER_SNAKE_CASE (e.g., `DATABASE_URL`, `JWT_ACCESS_SECRET`).

---

## 2. Framework Conventions

### 2.1 React & Next.js Conventions
*   **Component Structure**: Functional components only. Arrow functions with explicit type definitions:
    ```tsx
    interface PatientCardProps {
      patientId: string;
    }
    export const PatientCard: React.FC<PatientCardProps> = ({ patientId }) => { ... }
    ```
*   **Boundary Enforcement**: Mark Client Components explicitly at the top of the file using `"use client"` *only* when utilizing hook states (`useState`, `useEffect`), event handlers, or browser APIs. All other components default to Server Components.
*   **CSS Modules**: Standardize on CSS Modules (`*.module.css`) for localized component isolation. Global CSS styles are restricted to root styles.

### 2.2 Express & Node.js Conventions
*   **Controller Boundaries**: Controllers only parse HTTP parameter formats and delegate actual logic to the Service Layer immediately. No business database operations are allowed inside Controllers.
*   **Async Wrapper**: Every asynchronous controller handler must use an async-wrapper middleware or express-async-errors router wrapper to ensure uncaught rejections propagate to the global error filter.

---

## 3. Operations & API Protocols

### 3.1 Git Commit Message Format (Conventional Commits)
All commit messages must match the Angular / Conventional Commits layout:
`type(scope): description` (e.g., `feat(auth): implement argon2id password hashing validation`).
*   `feat`: A new user-facing feature.
*   `fix`: A bug fix.
*   `docs`: Documentation changes.
*   `style`: Formatting, missing semi-colons, CSS styling (no functional changes).
*   `refactor`: Code modification that neither fixes a bug nor adds a feature.
*   `test`: Adding missing tests or correcting existing tests.
*   `chore`: Updating build scripts, package dependencies, or tool configurations.

### 3.2 Error & Exception Standard
*   No standard `Error` instances are thrown from services. Always throw instances of custom `AppException` classes.
*   *Stack Traces*: Stack traces are strictly logged to stdout in development mode and parsed to Winston diagnostics in production. They must never be returned to the client API response body.

### 3.3 Logging Format
*   All logs are structured JSON files written to stdout:
    ```json
    {
      "timestamp": "2026-07-12T14:15:40.000Z",
      "level": "error",
      "correlationId": "req-1234-uuid",
      "message": "Failed to sync Google Calendar event",
      "context": "GoogleCalendarService",
      "error": { "code": "ERR_CALENDAR_SYNC_FAILED", "message": "API Limit reached" }
    }
    ```

### 3.4 API Response Design
Every HTTP endpoint must return a standardized JSON envelope:
*   **Success Payload**:
    ```json
    {
      "success": true,
      "data": { ... }
    }
    ```
*   **Error Payload**:
    ```json
    {
      "success": false,
      "errorCode": "ERR_DOMAIN_CODE",
      "message": "Readable explanation.",
      "details": []
    }
    ```

### 3.5 DTO (Data Transfer Object) & Validation Format
*   All incoming payloads are validated before controller execution.
*   Use Zod schemas to compile types and strip undocumented request attributes on ingress.

---

## 4. Testing & Documentation Conventions

### 4.1 Testing Protocol
*   **Structure**: Follow the AAA (Arrange-Act-Assert) pattern.
*   **Coverage Targets**: Focus on achieving 80% test coverage on critical business layers (Service and Repository layers), particularly scheduling transactions.
*   **Isolation**: Network operations must be mocked. Unit tests cannot access real database sockets.

### 4.2 Documentation
*   **JSDoc**: Exported functions, hooks, and services must feature JSDoc declarations outlining parameter behaviors and returns.
*   **Readability**: Avoid descriptive comments explaining *what* the code does. Write code that reads like documentation, using comments only to clarify *why* complex decisions were made.

---

## 5. Development Checklists

### 5.1 Code Review Checklist
*   [ ] **Security Check**: Are parameters passed via parameterized queries? (No raw string interpolations in SQL).
*   [ ] **Compliance Check**: Are medical fields or credentials stripped from logging statements?
*   [ ] **Dependency Check**: Does the directory structure follow the monorepo package rules? (e.g. no frontend imports inside backend code).
*   [ ] **Error Check**: Are exceptions mapped to semantic `AppException` types?

### 5.2 Performance Checklist
*   [ ] **Database Indexing**: Do search columns (like doctor specialties or scheduled slots) match a database lookup index?
*   [ ] **State Updates**: Do React state triggers avoid global re-renders?
*   [ ] **Cache Invalidation**: Do mutations to doctor schedules clear the Redis availability cache?

### 5.3 Accessibility (a11y) Checklist (WCAG 2.1 AA Target)
*   [ ] **Keyboard Friendly**: Can users navigate forms, calendars, and dashboards completely using `Tab` and `Enter` key bindings?
*   [ ] **Aria Elements**: Do buttons without clear visual text labels (like icons) carry an `aria-label` description?
*   [ ] **Color Contrast**: Do typography elements have a minimum contrast ratio of 4.5:1 against card backgrounds?
