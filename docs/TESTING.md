# INTENTLEDGER AI — TESTING MATRIX & DEMONSTRATION SCENARIOS

## Mandatory Test Scenarios (Section 19)

| Scenario ID | Test Name | Key Condition | Expected Outcome | Test Module |
| :--- | :--- | :--- | :--- | :--- |
| **SC-01** | Valid Purchase Flow | Budget $100, Proposal $85, Approved Merchant, Exact Approval | Authorization ALLOW, PayPal Order & Capture success, Passport generated, Chain VERIFIED | `tests/unit/authorization-kernel.test.ts`, `tests/integration/payment-flow.test.ts` |
| **SC-02** | Budget Violation Block | Budget $100, Proposal $160 | Kernel BLOCK with `BUDGET_EXCEEDED`. No PayPal call initiated. | `tests/unit/authorization-kernel.test.ts` |
| **SC-03** | Merchant Violation Block | Permitted: Demo Electronics; Proposed: ShadyDeals LLC | Kernel BLOCK with `MERCHANT_NOT_ALLOWED`. No payment created. | `tests/unit/authorization-kernel.test.ts` |
| **SC-04** | Proposal Fingerprint Tampering | Approval bound to $85.00 proposal; Cart mutated to $95.00 | Fingerprint mismatch triggers `PROPOSAL_FINGERPRINT_MISMATCH`. Approval invalidated. | `tests/unit/fingerprint-tampering.test.ts` |
| **SC-05** | Expired Mandate Enforcement | Mandate `expiresAt` < `now()` | Kernel BLOCK with `MANDATE_EXPIRED`. | `tests/unit/authorization-kernel.test.ts` |
| **SC-06** | Financial Reconciliation Variance | Approved $85.00, Simulated Capture $90.00 | Reconciler flags `RECONCILIATION_EXCEPTION`. Status held, never marked reconciled. | `tests/unit/reconciliation.test.ts` |
| **SC-07** | Cryptographic Ledger Tampering | Mutation of an audit event payload in hash chain | Passport verifier recalculates $H_n \ne \text{SHA256}(...)$ and fails with `INVALID`. | `tests/unit/hash-chain-verification.test.ts` |
| **SC-08** | Webhook Deduplication / Idempotency | Duplicate transmission of identical PayPal capture event | Deduplicated; single event persisted, zero duplicate financial state modification. | `tests/unit/webhook-idempotency.test.ts` |
| **SC-09** | AI Provider Fallback Resilience | Groq API network outage / 500 error | Deterministic catalogue search fallback activated; financial authorization unaffected. | `tests/unit/agent-fallback.test.ts` |
| **SC-10** | Neon PostgreSQL Persistence | Connection, CRUD, Restart & Foreign Key Integrity | Live queries to Neon PostgreSQL succeed, writes persist across store re-instantiations. | `tests/integration/neon-persistence.test.ts` |


