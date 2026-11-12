# INTENTLEDGER AI — ARCHITECTURAL DECISIONS LOG (ADR)

## ADR-001: Strict Separation of AI Reasoning from Financial Authorization Authority
- **Status:** Accepted
- **Context:** Large Language Models (LLMs) are probabilistic, prone to hallucination, and vulnerable to prompt injection. Allowing an LLM to decide whether a financial transaction proceeds violates basic fiduciary security.
- **Decision:** The AI Shopping Agent is strictly an advisory engine that generates structured purchase proposals. Financial authorization is governed exclusively by the backend `Deterministic Authorization Kernel` executing 18 code-enforced checks against signed mandates.
- **Consequences:** Eliminates prompt injection risks on transaction execution. Guarantees deterministic, reproducible, and legally defensible decisions.

## ADR-002: Dual-Mode Persistence Architecture (Prisma PostgreSQL + In-Memory Fallback)
- **Status:** Accepted
- **Context:** The application must support production deployment to cloud PostgreSQL (Neon) via Prisma ORM, while remaining immediately runnable, testable, and demonstrable in local development environments where Docker or local Postgres may not be active.
- **Decision:** Implement a clean Repository Pattern (`server/repositories/`) backed by Prisma when `DATABASE_URL` is configured, with an in-memory/isolated repository implementation for automated unit test execution and zero-setup demonstration.
- **Consequences:** Complete independence from external database hosting during automated CI/unit tests, with seamless zero-reconfiguration deployment when `DATABASE_URL` is supplied.

## ADR-003: Tamper-Evident Hash Chain for Transaction Passports
- **Status:** Accepted
- **Context:** A customer or auditor must be able to verify whether any record in a transaction lifecycle was altered post-execution.
- **Decision:** Implement an iterative SHA-256 hash chain:
  $$H_0 = \text{SHA256}(\text{CanonicalGenesis})$$
  $$H_n = \text{SHA256}(H_{n-1} \parallel \text{CanonicalJSON}(\text{Event}_n))$$
  Combined with Ed25519 digital signatures on the initial mandate and final passport summary.
- **Consequences:** We describe the ledger as *tamper-evident and cryptographically verifiable*, never claiming absolute immutability on standard relational storage. Any modification to past events breaks subsequent hashes and is instantly flagged as `TAMPERED_EVENT`.

## ADR-004: Proposal-Bound Human Approval with SHA-256 Fingerprinting
- **Status:** Accepted
- **Context:** A malicious or drifting agent could alter the product, price, or payee between when a user clicks "Approve" and when payment is created.
- **Decision:** Human approvals are cryptographically bound to the SHA-256 digest of the canonical proposal (`productId`, `merchantId`, `amount`, `currency`, `quantity`, `mandateId`). The token is single-use, expires within a configured window (default 15 minutes), and is revalidated server-side immediately before PayPal order creation and capture.
- **Consequences:** Parameter tampering or cart swapping immediately invalidates the approval token.

## ADR-005: Payee Identity Binding in PayPal Sandbox
- **Status:** Accepted
- **Context:** In sandbox testing, arbitrary multi-merchant routing without genuine merchant accounts creates fake payment routes.
- **Decision:** Map all approved catalogue purchases to a single verified demonstration seller ("Demo Electronics"), clearly mapped to the active PayPal Sandbox merchant payee. Catalogue merchant metadata is tracked separately from the payment gateway payee.
- **Consequences:** Complete transparency without fabricating multi-tenant PayPal settlements.

## ADR-006: Neon PostgreSQL Migration & Parallel Store Hydration
- **Status:** Accepted
- **Context:** Neon PostgreSQL uses serverless pooled and direct connection strings over TLS. Multi-entity sequential synchronization during store instantiation or restart across remote internet latency (e.g., AWS us-east-2) introduces latency overhead that can trigger test and cold-start timeouts.
- **Decision:** Configured Prisma with dual connection architecture (`DATABASE_URL` via connection pooler and `DIRECT_URL` for direct schema migrations). In `Store.syncFromDatabase()`, execute parallel data fetching across all eight entity types (`Promise.all`) with asynchronous write-through persistence.
- **Consequences:** Near-instantaneous memory read performance alongside complete, genuine persistence in Neon PostgreSQL, with zero test timeouts and resilient restart survivability.

## ADR-007: Groq Client Structured Output (`openai/gpt-oss-120b`) & Deterministic Fallback
- **Status:** Accepted
- **Context:** LLM provider tier access can vary across developer accounts, causing 404 model access errors when requesting default models like `llama-3.3-70b-versatile`.
- **Decision:** Implemented a centralized `GroqClient` (`src/server/ai/client.ts`) that dynamically resolves `GROQ_MODEL` from `.env` (defaulting to `openai/gpt-oss-120b`), utilizing OpenAI-compatible `response_format: { type: "json_object" }`. Preserved strict fallback to deterministic catalogue search (Scenario 9) if the API key is missing, network fails, or model rate limits occur.
- **Consequences:** Ensures zero dependency on any single proprietary model name, robust JSON parsing validated against Zod schemas, and guaranteed transaction proposal creation even during provider outages.



