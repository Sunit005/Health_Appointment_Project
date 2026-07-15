# Technology Decision Document (TDD)
## Project: Healthcare Appointment & Follow-up Manager

This document records the architectural and technology choices for the Healthcare Appointment & Follow-up Manager. As the Engineering Manager, I have reviewed the requirements for scalability, compliance (HIPAA/GDPR), maintainability, learning curve, and deployment options. Below is our standardized technology stack.

---

## 1. Frontend Layer

### Frontend Framework: Next.js (App Router, React)
*   **Selected Technology**: Next.js 14+ (App Router)
*   **Alternatives Considered**: React SPA (Vite) + Express hosting, Remix
*   **Why Next.js?**
    *   *Scalability & SEO*: Unlike pure React SPAs, Next.js supports Server-Side Rendering (SSR) and Static Site Generation (SSG). This is critical for the public doctor search listings and the patient sign-up landing page.
    *   *Maintainability*: Next.js provides out-of-the-box optimization (images, scripts, fonts) and a highly structured directory structure, reducing configuration drift.
    *   *Deployment*: Natively optimized for serverless edge deployment on Vercel, reducing cold start latencies.

### Routing: Next.js File-system Routing
*   **Selected Technology**: Next.js App Router Routing
*   **Alternatives Considered**: React Router DOM
*   **Why?**
    *   It comes pre-configured with Next.js, eliminating third-party routing vulnerabilities. It supports nested layouts, loading states, and error boundaries per directory out of the box.

### State Management: Zustand
*   **Selected Technology**: Zustand
*   **Alternatives Considered**: Redux Toolkit, React Context API, Recoil
*   **Why Zustand?**
    *   *Learning Curve*: Zustand has practically zero boilerplate code, unlike Redux Toolkit.
    *   *Performance*: Zustand is a pub-sub state store that avoids rendering whole components unless specific state values change.
    *   *Server-Safety*: Unlike React Context, Zustand state is easily decoupled from components, making it safer to use in Next.js Server Components.

### Animations: Framer Motion
*   **Selected Technology**: Framer Motion
*   **Alternatives Considered**: React Spring, Tailwind Transitions
*   **Why Framer Motion?**
    *   *Developer Experience*: Framer Motion's declarative API makes implementing micro-interactions (e.g., loading spinners, slide-over sheets, dashboard transitions) extremely readable.
    *   *Exit Animations*: Supporting `<AnimatePresence>` allows elements (like error modals or toast notifications) to animate smoothly when unmounted.

### Forms: React Hook Form
*   **Selected Technology**: React Hook Form
*   **Alternatives Considered**: Formik, vanilla controlled components
*   **Why React Hook Form?**
    *   *Performance*: It uses uncontrolled inputs, preventing global page re-renders on every single keystroke. This is crucial for long medical forms.
    *   *Integration*: Standard integration with Zod schemas for validation.

### Validation (Frontend & Backend): Zod
*   **Selected Technology**: Zod
*   **Alternatives Considered**: Yup, Joi
*   **Why Zod?**
    *   *TypeScript Integration*: Zod is a TypeScript-first schema validation library. You define a schema once and infer the TypeScript type directly (`type User = z.infer<typeof userSchema>`).
    *   *Shared Schema*: Because we use a monorepo, we can share validation schemas between the Next.js frontend and NestJS backend, ensuring zero API drift.

### Charts: Recharts
*   **Selected Technology**: Recharts
*   **Alternatives Considered**: Chart.js, D3.js
*   **Why Recharts?**
    *   Recharts is built on React components and utilizes SVG paths under the hood. It allows us to build responsive analytics dashboards (appointment volumes, load factor) quickly, whereas D3 has a steep learning curve and excess configuration overhead.

---

## 2. Backend & Database Layer

### Backend Framework: NestJS (TypeScript)
*   **Selected Technology**: NestJS
*   **Alternatives Considered**: Express (raw), Fastify, Go/Gin
*   **Why NestJS?**
    *   *Maintainability*: NestJS forces developers to follow a strict module-controller-service pattern. This prevents modular monoliths from degrading into a "spaghetti" codebase over time.
    *   *Out-of-the-box features*: Inbuilt Dependency Injection (DI), exception filters, guards, and validation pipes.
    *   *Learning Curve*: Node-based, meaning frontend developers can read and contribute to backend code.

### Database: PostgreSQL
*   **Selected Technology**: PostgreSQL
*   **Alternatives Considered**: MongoDB, MySQL, DynamoDB
*   **Why PostgreSQL?**
    *   *Data Integrity*: A healthcare appointment system requires strict ACID transactions (to prevent double-booking slot anomalies). Relational databases are optimal here.
    *   *HIPAA Compliance support*: PostgreSQL supports Row-Level Security (RLS), allowing us to write rules like `WHERE patient_id = current_user_id()` directly on database views.
    *   *Extensibility*: Inbuilt JSONB columns allow semi-structured log or configuration storage when relational tables are too rigid.

### ORM: Prisma
*   **Selected Technology**: Prisma
*   **Alternatives Considered**: TypeORM, Sequelize
*   **Why Prisma?**
    *   *Type Safety*: Prisma generates a client compiled from your PostgreSQL schema. Every database query is fully typed, eliminating runtime query errors.
    *   *Migrations*: Prisma Migrations provides a clear history of schema transitions with zero manual SQL script overhead.

### Caching: Redis
*   **Selected Technology**: Redis
*   **Alternatives Considered**: Memcached, In-Memory Node Cache
*   **Why Redis?**
    *   *Data Structures*: Beyond key-value storage, Redis provides sorted sets and hashes, useful for managing sliding rate limiters and session invalidations.
    *   *BullMQ Integration*: Redis serves as the message broker powering our async job queues (reminders/notifications).

---

## 3. Integration & Middleware Services

### Authentication: Auth.js / NextAuth.js
*   **Selected Technology**: NextAuth.js
*   **Alternatives Considered**: Custom JWT & Cookie Middleware, Firebase Auth, Auth0
*   **Why NextAuth.js?**
    *   *Security*: NextAuth handles cookie encryption, CSRF tokens, and session renewal mechanisms securely.
    *   *Social Identity*: Easy out-of-the-box integration with Google SSO (required for Google Calendar auth sync).
    *   *Compliance*: Running auth internally avoids sending sensitive patient data to third-party identity providers.

### Authorization: CASL
*   **Selected Technology**: CASL
*   **Alternatives Considered**: Simple switch-case role checking
*   **Why CASL?**
    *   *Ability-Based*: Enables checking dynamic rules rather than static roles.
    *   *Example*: Instead of checking `if (user.role === 'Doctor')`, CASL allows checking `if (ability.can('read', 'MedicalRecord', { doctorId: user.id }))`, ensuring compliance with HIPAA guidelines of "least privilege" access.

### Email Service: SendGrid API
*   **Selected Technology**: SendGrid
*   **Alternatives Considered**: Amazon SES, Nodemailer
*   **Why SendGrid?**
    *   *Deliverability*: High reputation IP routing ensures transactional emails (such as MFA codes or leave notifications) land in inboxes, not spam.
    *   *Template Builder*: Non-technical staff can edit email layouts in SendGrid without requiring code updates.

### AI Service: Google Gemini / OpenAI APIs via LangChain / Vercel AI SDK
*   **Selected Technology**: Vercel AI SDK + LangChain
*   **Alternatives Considered**: Direct API wrapper calls
*   **Why?**
    *   *Vendor Independence*: LangChain / Vercel AI SDK allows swapping between OpenAI GPT-4o (highly precise clinical summary reasoning) and Google Gemini (large context windows, cost-effective triage conversations) with a simple config change.
    *   *Structured Outputs*: Libraries like Instructor or native SDK schemas guarantee JSON parsing, preventing AI parsing crash loops.

### Google Calendar Integration: Google APIs Client Library (`googleapis`)
*   **Selected Technology**: `googleapis`
*   **Alternatives Considered**: Third-party integration (Zapier, Make)
*   **Why?**
    *   *Granularity*: In a HIPAA-compliant app, you cannot channel PHI through standard third-party webhook aggregators. Handshaking directly with Google's API secures communication end-to-end.

### Scheduler: BullMQ + Redis
*   **Selected Technology**: BullMQ
*   **Alternatives Considered**: Agenda, Node-Cron, AWS EventBridge
*   **Why BullMQ?**
    *   *Reliability*: Node-Cron runs in-process; if the Node server crashes, scheduled reminders are lost. BullMQ persists jobs in Redis.
    *   *Scalability*: Workers can scale horizontally to handle spike reminder loads at peak hours (e.g., 9:00 AM medication alerts).

---

## 4. Diagnostics, Security & Verification

### Logging: Winston + Morgan
*   **Selected Technology**: Winston
*   **Alternatives Considered**: Pino, Bunyan
*   **Why Winston?**
    *   *Transports*: Winston supports sending logs to console, local files, and third-party aggregation APIs (like Datadog or AWS CloudWatch) simultaneously.
    *   *Redaction*: It allows custom formatting plugins to strip out patterns resembling Credit Cards or SSNs/Patient IDs before writing to persistent storage.

### Testing: Vitest (Unit/Integration) & Playwright (E2E)
*   **Selected Technology**: Vitest & Playwright
*   **Alternatives Considered**: Jest, Cypress
*   **Why?**
    *   *Vitest*: Matches Jest's API but runs up to 10x faster due to native Vite module loading.
    *   *Playwright*: Playwright provides headless browser E2E test suites with built-in auto-waiting, preventing test flakiness commonly found in Cypress.

---

## 5. Infrastructure & Deployment Layer

### Infrastructure Engine: Docker + AWS ECS/Fargate (Backend) & Vercel (Frontend)
*   **Selected Technology**: Docker + ECS/Fargate (NestJS) & Vercel (Next.js)
*   **Alternatives Considered**: Kubernetes (EKS), single EC2 VMs
*   **Why?**
    *   *Vercel*: Next.js features (Image Optimization, ISR, Serverless edge functions) work natively on Vercel without manual cloud setup.
    *   *AWS ECS/Fargate*: Serverless container orchestration. It removes the operational complexity of managing Kubernetes control planes while ensuring containers scale horizontally under heavy traffic.
    *   *Database*: AWS RDS PostgreSQL (Multi-AZ) ensures reliable data backups and automatic point-in-time recovery options.
