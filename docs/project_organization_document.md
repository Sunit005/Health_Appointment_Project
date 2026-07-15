# Project Organization & Folder Structure Document (Exhaustive Specification)
## Project: Healthcare Appointment & Follow-up Manager

This document defines the strict, production-grade folder structure for the entire monorepo. It serves as the single source of truth for the codebase layout, ensuring ease of maintenance, clean separation of concerns, and robust architectural boundaries for a team of developers.

---

## 1. Monorepo Structural Blueprint

```
s:/Assignment_Unthinkable/
├── .github/                   # CI/CD Workflows folder
├── backend/                   # NestJS App Workspace
├── frontend/                  # Next.js App Workspace
├── shared/                    # Shared types and schemas Workspace
├── scripts/                   # System and setup script directory
├── documentation/             # Architecture, design and onboarding docs
└── e2e-tests/                 # Playwright test suite Workspace
```

---

## 2. Frontend Project Structure (`/frontend`)

The Next.js 14+ application workspace.

### 2.1 `/frontend/public`
*   **Purpose**: Stores public-facing static assets that do not require processing by Webpack or Turbo.
*   **Files inside**: `favicon.ico`, `logo.svg`, `og-image.png`, static illustrations.
*   **Responsibility**: Provide static, high-availability visual resources straight via root paths (e.g., `https://domain.com/logo.svg`).
*   **Dependency rules**: None. Files here do not import anything.
*   **Forbidden dependencies**: Cannot import any source code, JavaScript assets, or styles.
*   **Naming conventions**: kebab-case for file names (e.g., `health-check-illustration.svg`).

### 2.2 `/frontend/src/app`
*   **Purpose**: Implements the Next.js App Router layout and page hierarchy.
*   **Files inside**: `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `route.ts`.
*   **Responsibility**: Route routing, defining nested HTML layouts, triggering Route Handlers, and applying React Suspense boundaries.
*   **Dependency rules**: Can import from `src/components`, `src/hooks`, `src/store`, `src/services`, `src/utils`, and `shared/`.
*   **Forbidden dependencies**:
    *   No direct database access or ORM calls (Prisma/Postgres is strictly backend).
    *   No inline CSS definitions. Must use global styles or CSS modules.
*   **Naming conventions**: Route folders must be kebab-case (e.g., `/appointment-booking`). Auth/Dashboard route grouping folders must be wrapped in parentheses (e.g., `(patient)`). Route handler files must be `route.ts`, and pages must be `page.tsx`.

### 2.3 `/frontend/src/components`
*   **Purpose**: Contains modular, reusable UI components split by granularity.
*   **Files inside**:
    *   `src/components/ui/Button.tsx`, `src/components/ui/Button.module.css` (atomic components).
    *   `src/components/shared/Navbar.tsx`, `src/components/shared/Sidebar.tsx` (structural layout templates).
*   **Responsibility**: Rendering UI elements, encapsulating CSS styling, and executing local state transitions (e.g., toggling a modal).
*   **Dependency rules**: UI atoms (under `/ui`) must be generic and can only import basic UI helpers (like class merging utils) or React APIs. Structural components (under `/shared`) can import stores, hooks, and services.
*   **Forbidden dependencies**:
    *   UI components must never directly reference page router routes or page-level context hooks.
    *   `components/ui` components cannot depend on `components/shared` components.
*   **Naming conventions**: PascalCase for components (`CustomModal.tsx`), matching name for CSS Modules (`CustomModal.module.css`).

### 2.4 `/frontend/src/hooks`
*   **Purpose**: Encapsulates custom React hooks for reactive logic and state sharing.
*   **Files inside**: `useAuth.ts`, `useWindowDimensions.ts`.
*   **Responsibility**: Hook state triggers, listener setups, and lifecycle syncs.
*   **Dependency rules**: Can depend on `src/services` (fetchers) and `src/store` (Zustand state).
*   **Forbidden dependencies**:
    *   Must not render JSX/TSX elements.
    *   Must not perform direct DOM manipulations without React safety hooks (e.g. `useEffect`).
*   **Naming conventions**: camelCase prefixed with `use` (e.g., `useSymptomForm.ts`).

### 2.5 `/frontend/src/services`
*   **Purpose**: Manages HTTP outbound request configurations and remote resources fetchers.
*   **Files inside**: `apiClient.ts` (base Fetch engine), `appointmentService.ts`.
*   **Responsibility**: Communicate with the Backend REST API, handle status-code headers, and refresh tokens.
*   **Dependency rules**: Can import type structures and validation schemas from `shared/`.
*   **Forbidden dependencies**:
    *   Cannot import UI components, global stores, or React hooks (with the exception of custom network hook bindings).
    *   Strictly stateless helper layers.
*   **Naming conventions**: camelCase with a `Service` suffix (e.g., `doctorScheduleService.ts`).

### 2.6 `/frontend/src/store`
*   **Purpose**: Zustand-backed global client state management files.
*   **Files inside**: `useAuthStore.ts`, `useBookingStore.ts`.
*   **Responsibility**: Track active patient booking parameters, authenticate state flags, and cache simple client properties.
*   **Dependency rules**: Imports types from `shared/` and endpoints from `src/services`.
*   **Forbidden dependencies**:
    *   Cannot import UI components.
    *   Cannot import page-level React Hooks.
*   **Naming conventions**: camelCase prefixed with `use` and suffixed with `Store` (e.g., `useNotificationStore.ts`).

### 2.7 `/frontend/src/styles`
*   **Purpose**: Houses global stylesheets and CSS variables.
*   **Files inside**: `variables.css` (theme/color design system), `globals.css` (reset CSS styles).
*   **Responsibility**: Standardize fonts, layout layouts, scroll configurations, and color tokens.
*   **Dependency rules**: Can be imported by Next.js layouts (`layout.tsx`).
*   **Forbidden dependencies**: Must not contain inline components or JS imports.
*   **Naming conventions**: lowercase kebab-case (e.g., `variables.css`).

### 2.8 `/frontend/src/utils`
*   **Purpose**: Houses stateless utility functions.
*   **Files inside**: `dateFormatter.ts`, `currencyParser.ts`.
*   **Responsibility**: Data mutations, math helpers, and date formatting.
*   **Dependency rules**: Standard library files only.
*   **Forbidden dependencies**: Cannot import components, stores, hooks, or service layers.
*   **Naming conventions**: camelCase (e.g., `timezoneHelper.ts`).

---

## 3. Backend Project Structure (`/backend`)

The NestJS application workspace.

### 3.1 `/backend/src/common`
*   **Purpose**: Standardized cross-cutting framework files (filters, guards, interceptors, pipes).
*   **Files inside**: `httpException.filter.ts`, `validation.pipe.ts`, `roles.guard.ts`.
*   **Responsibility**: Global logging formats, converting validation schemas, resolving route-level auth checks.
*   **Dependency rules**: Framework utilities only.
*   **Forbidden dependencies**: Cannot import business logic services (e.g., `AppointmentService`) or entity tables.
*   **Naming conventions**: camelCase matching class suffix type (e.g., `logging.interceptor.ts`).

### 3.2 `/backend/src/config`
*   **Purpose**: Loads and validates environment variables.
*   **Files inside**: `app.config.ts`, `database.config.ts`, `ai.config.ts`.
*   **Responsibility**: Ensure server crashes immediately at startup if critical keys (like database passwords or API secrets) are missing or misconfigured.
*   **Dependency rules**: Imports Zod schemas from `shared/` for runtime env validation.
*   **Forbidden dependencies**: Modules and services.
*   **Naming conventions**: camelCase ending in `.config.ts` (e.g., `jwt.config.ts`).

### 3.3 `/backend/src/database`
*   **Purpose**: Prisma client exports, configuration hooks, and schema definition files.
*   **Files inside**: `prisma.service.ts`, `schema.prisma`.
*   **Responsibility**: Establish and pool connection threads to PostgreSQL database.
*   **Dependency rules**: NestJS modules can import `PrismaService` to talk to tables.
*   **Forbidden dependencies**: No business modules may be imported.
*   **Naming conventions**: camelCase naming (e.g., `prisma.service.ts`).

### 3.4 `/backend/src/modules`
*   **Purpose**: Business domains encapsulating API logic.
*   **Sub-folders inside**: `/auth`, `/user`, `/appointment`, `/schedule`, `/ai`, `/notification`, `/audit`.
*   **Files inside each sub-folder**:
    *   `*.module.ts`: NestJS Module config.
    *   `*.controller.ts`: Routing handler endpoints.
    *   `*.service.ts`: Core business algorithms.
    *   `dto/*.dto.ts`: Data Transfer Objects.
*   **Responsibility**: Separate and resolve domain business needs (e.g. appointment updates).
*   **Dependency rules**: Can only access outside domains through imported module providers. Imports Zod structures from `shared/`.
*   **Forbidden dependencies**:
    *   Circular dependencies.
    *   Cross-module direct database imports (all DB interactions must go through the respective domain's Service).
*   **Naming conventions**: Kebab-case directory, class names and file prefixes match NestJS standards (e.g., `symptom-analysis.service.ts`).

---

## 4. Shared Project Structure (`/shared`)

### 4.1 `/shared/src/constants`
*   **Purpose**: Immutable global constants.
*   **Files inside**: `appointmentStatus.ts` (Enums), `userRoles.ts`.
*   **Responsibility**: Prevent magic strings in checks across frontend and backend.
*   **Dependency rules**: Zero internal repository dependencies.
*   **Forbidden dependencies**: Cannot import any files from `/frontend` or `/backend`.
*   **Naming conventions**: camelCase filenames.

### 4.2 `/shared/src/schemas`
*   **Purpose**: Shared Zod schemas for payload checks.
*   **Files inside**: `bookingRequest.schema.ts`, `authCredentials.schema.ts`.
*   **Responsibility**: Standardize validation contracts.
*   **Dependency rules**: Pure Zod imports.
*   **Forbidden dependencies**: No framework or framework engine imports.
*   **Naming conventions**: camelCase with a `.schema.ts` suffix.

### 4.3 `/shared/src/types`
*   **Purpose**: Shared TypeScript interfaces and utility types.
*   **Files inside**: `apiResponse.ts`, `consultationPayload.ts`.
*   **Responsibility**: Enforce compilation type safety.
*   **Dependency rules**: Generic TypeScript only.
*   **Forbidden dependencies**: No operational code. Strictly definitions files.
*   **Naming conventions**: camelCase ending in `.ts` or `.d.ts`.

---

## 5. Documentation Component (`/documentation`)

### 5.1 `/documentation/adr`
*   **Purpose**: Architectural Decision Records (ADRs) tracking historical changes.
*   **Files inside**: `0001-modular-monolith.md`, `0002-zod-schemas.md`.
*   **Responsibility**: Log technical architecture decisions, alternatives considered, and why decisions were made.
*   **Naming conventions**: Four-digit prefix, kebab-case (e.g., `0003-prisma-encryption.md`).

### 5.2 `/documentation/api`
*   **Purpose**: API contracts and OpenApi/Swagger specification documents.
*   **Files inside**: `openapi-spec.json`, `postman-collection.json`.
*   **Responsibility**: Help frontend engineers mock responses and assist API integrations.
*   **Naming conventions**: kebab-case filenames.

### 5.3 `/documentation/guides`
*   **Purpose**: Onboarding materials and workspace guidelines.
*   **Files inside**: `local-setup.md`, `hipaa-standards.md`, `deployment-flow.md`.
*   **Responsibility**: Reduce development onboarding setup timelines.
*   **Naming conventions**: kebab-case.

---

## 6. Scripts Component (`/scripts`)

### 6.1 `/scripts`
*   **Purpose**: Utility shell commands and database management pipelines.
*   **Files inside**: `db-seed.ts`, `generate-mfa-secrets.sh`, `vault-encrypt.sh`.
*   **Responsibility**: Automate tasks like seeding databases or backing up keys.
*   **Dependency rules**: Can import database schema files and config assets.
*   **Forbidden dependencies**: Cannot import any visual or UI components.
*   **Naming conventions**: kebab-case filenames (e.g., `postgres-restore.sh`).

---

## 7. CI/CD Component (`/.github`)

### 7.1 `/.github/workflows`
*   **Purpose**: Pipeline execution templates for GitHub Actions.
*   **Files inside**: `lint-test.yml` (triggered on Pull Requests), `deploy-prod.yml` (triggered on release tag).
*   **Responsibility**: Automate tests, checks, image builds, and cloud deployments.
*   **Dependency rules**: Declared in GitHub Runner scripts.
*   **Forbidden dependencies**: Standard source imports.
*   **Naming conventions**: kebab-case (e.g., `e2e-suite.yml`).

---

## 8. Testing Component (`/e2e-tests`)

### 8.1 `/e2e-tests/tests`
*   **Purpose**: Playwright integration test specs.
*   **Files inside**: `patientBooking.spec.ts`, `doctorLeaveRequest.spec.ts`.
*   **Responsibility**: Test scenarios from a patient or doctor's web browser perspective.
*   **Dependency rules**: Imports configuration variables and URL routers.
*   **Forbidden dependencies**:
    *   No direct backend class or service imports.
    *   No direct database driver queries (must test actions solely via Web interface APIs).
*   **Naming conventions**: camelCase ending in `.spec.ts` (e.g., `authenticationFlow.spec.ts`).

### 8.2 `/e2e-tests/utils`
*   **Purpose**: Page Object Models (POMs) and login test setups.
*   **Files inside**: `PatientDashboardPage.ts`, `testFixtures.ts`.
*   **Responsibility**: Encapsulate browser DOM selector queries (e.g., finding the appointment booking button).
*   **Dependency rules**: Playwright library APIs.
*   **Forbidden dependencies**: Domain backend models.
*   **Naming conventions**: PascalCase for Page Objects (`LoginPage.ts`), camelCase for general helpers.
