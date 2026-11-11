# INTENTLEDGER AI — IMPLEMENTATION PLAN & CHECKPOINTS

**Objective:** Build, test, verify, and demonstrate INTENTLEDGER AI under strict production-grade fintech standards.

---

## Checkpoint Roadmap

### CHECKPOINT A: Foundation & Enterprise Design System (Current)
- [x] Inspect existing environment and dependencies.
- [x] Initialize Git repository and `.gitignore`.
- [x] Install core packages (Next.js 15, React 19, AG Grid 36.2, AG Studio 3.0, Prisma 6, Lucide, Tailwind, Vitest).
- [x] Configure Tailwind CSS design tokens (Deep Navy `#102A43`, Slate `#64748B`, Professional Blue `#1769AA`).
- [x] Configure TypeScript and path aliases (`@/*`).
- [x] Set up Vitest testing harness.
- [ ] Create core Application Shell (`/app`, sidebar, navigation, breadcrumbs, status indicators).
- [ ] Seed database-backed product catalogue (16 realistic products across electronics, audio, office, computing).

### CHECKPOINT B: Security Core & Deterministic Authorization Kernel
- [ ] Implement Prisma schema (`User`, `Merchant`, `Product`, `IntentMandate`, `PurchaseProposal`, `AuthorizationDecision`, `Approval`, `Payment`, `TransactionPassport`, `TransactionEvent`).
- [ ] Implement Ed25519 cryptographic key management (`lib/crypto/keys.ts`).
- [ ] Implement canonical JSON serialization (`lib/crypto/canonical.ts`).
- [ ] Implement Intent Mandate engine (Creation, validation, signing, expiry, revocation).
- [ ] Implement Deterministic Authorization Kernel (18 policy checks with deterministic reason codes).
- [ ] Implement Proposal Fingerprinting (`lib/crypto/fingerprint.ts`).
- [ ] Implement Proposal-bound Human Approval (Single-use, non-malleable, time-bounded).
- [ ] Write and pass unit tests for all authorization rejection reasons (Scenarios 2, 3, 4, 5).

### CHECKPOINT C: PayPal Sandbox Payment Orchestrator
- [ ] Implement PayPal REST client (`lib/paypal/client.ts`): OAuth 2.0 token management, retry logic, error handling.
- [ ] Implement Orders API v2 order creation (`lib/paypal/orders.ts`) with payee mapping and intent `CAPTURE`.
- [ ] Implement PayPal Sandbox Checkout redirect & approval handling.
- [ ] Implement pre-capture deterministic revalidation.
- [ ] Implement server-side order capture (`/v2/checkout/orders/{id}/capture`).
- [ ] Implement Financial Reconciler (Compare approved amount vs captured amount).
- [ ] Implement PayPal Webhook verification (`/v1/notifications/verify-webhook-signature`) and idempotent event ingestion.
- [ ] Build controlled test fixture runner for automated payment testing and offline resilience.

### CHECKPOINT D: Cryptographic Transaction Passport
- [ ] Implement SHA-256 hash chaining: $H_n = \text{SHA256}(H_{n-1} \parallel \text{CanonicalEvent}_n)$.
- [ ] Implement Transaction Event Ledger (`server/services/passport/event-ledger.ts`).
- [ ] Implement Transaction Passport generator connecting all 12 transaction lifecycle stages.
- [ ] Implement Independent Backend Integrity Verification Service (`server/services/passport/verifier.ts`).
- [ ] Implement Tamper Detection (Detect payload mutations, event omissions, broken links).
- [ ] Implement JSON Evidence Export.
- [ ] Build Transaction Passport UI (`/app/passports/[id]`) with interactive verification badge and audit timeline.

### CHECKPOINT E: Differentiation — AG Grid Workspace & Evidence Intelligence
- [ ] Implement Operational Transaction Workspace (`/app/transactions`) using AG Grid Community 36.2.
- [ ] Enable sorting, filtering, quick search, column definitions, and status badges in AG Grid.
- [ ] Implement Intent Drift Detection (Analyze drift between Mandate, Proposal, Approval, and Capture).
- [ ] Implement Evidence Completeness Assessment & Dispute Readiness report generator.
- [ ] Implement AG Studio reporting workspace with custom data sources and developer validations.
- [ ] Expose grounded domain-specific analysis tools.

### CHECKPOINT F: System Refinement & Quality Assurance
- [ ] Run full Vitest test suite covering all 9 mandatory demonstration scenarios.
- [ ] Run `npx tsc --noEmit` and verify zero TypeScript compiler errors.
- [ ] Verify light mode enterprise aesthetics, accessible focus states, and zero-emoji compliance.
- [ ] Verify error boundaries, loading skeletons, and empty states across all screens.

### CHECKPOINT G: Documentation, Production Build & Demo Readiness
- [ ] Run `npm run build` to verify production Next.js build.
- [ ] Generate comprehensive README with architecture diagram, test commands, and scenario walkthroughs.
- [ ] Prepare 3-minute hackathon demonstration script and video plan.
