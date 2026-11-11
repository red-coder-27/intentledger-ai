# INTENTLEDGER AI
### The Trust Infrastructure for Autonomous Commerce
> **Tagline:** *Every AI transaction deserves proof.*  
> **PayPal AI Hackathon Submission**

---

## Overview

INTENTLEDGER AI addresses the fundamental accountability gap in agentic commerce. While AI agents excel at discovering products and comparing offers, **probabilistic language models must never possess financial authorization authority**.

INTENTLEDGER introduces a deterministic enforcement and verifiable cryptographic proof layer between:
1. **Customer Intent Mandates** (Structured constraints with Ed25519 digital signatures)
2. **AI Shopping Agent** (Product discovery producing proposal fingerprints)
3. **Deterministic Authorization Kernel** (Backend engine executing 18 independent policy checks)
4. **Proposal-Bound Human Approval** (Single-use cryptographic approval gate)
5. **PayPal Payment Orchestrator** (Orders API v2 sandbox execution and capture)
6. **Financial Reconciler** (Approved vs captured amount verification)
7. **Transaction Passports** (Tamper-evident SHA-256 hash-linked event ledgers)

---

## Architectural Principles

- **Zero-LLM Authority:** The AI agent recommends; the deterministic kernel enforces policy; PayPal executes payment; cryptographic ledgers prove what occurred.
- **Proposal-Bound Approval:** Customer approvals bind cryptographically to the SHA-256 fingerprint of the proposal. Price, merchant, product, or quantity changes invalidate approval immediately.
- **Tamper-Evident Hash Chains:**
  $$H_0 = \text{SHA256}(\text{GenesisRecord})$$
  $$H_n = \text{SHA256}(H_{n-1} \parallel \text{CanonicalJSON}(\text{Event}_n))$$
  Any mutation to historical audit events causes subsequent hash recalculations to fail, flagging the exact sequence altered.
- **Payee Binding in Sandbox:** Catalogue products map to a verified demonstration merchant (`merchant-demo@intentledger.ai`) matching the PayPal Sandbox payee.

---

## Core System Modules

| Module | Route | Description |
| :--- | :--- | :--- |
| **Overview** | `/app` | Live database-derived operational metrics, security scenario runners, and recent activity stream |
| **Intent Studio** | `/app/intents` | Creation, structured extraction, Ed25519 signing, and revocation of purchasing mandates |
| **Shopping Agent** | `/app/agent` | Catalogue-backed product discovery, structured proposals, and constraint verification |
| **Authorization Center** | `/app/authorization` | 18 policy checks inspection, proposal fingerprint locking, and PayPal checkout trigger |
| **Transactions** | `/app/transactions` | AG Grid operational workspace with sorting, filtering, quick search, and drill-down |
| **Transaction Passports** | `/app/passports/[id]` | Cryptographic event timeline, SHA-256 linkage, Ed25519 verification, and JSON export |
| **Evidence Center** | `/app/evidence` | Evidence completeness scoring (7 core records), intent drift analysis, and dispute dossiers |
| **Intelligence & Analytics** | `/app/analytics` | AG Studio reporting workspace with grounded domain AI analysis tools |
| **Diagnostics** | `/app/settings` | Server diagnostics, PayPal Sandbox status, and signing key versions (secrets masked) |

---

## Automated Security Test Scenarios

The test suite validates the 9 mandatory scenarios:

1. **SC-01 (Valid Purchase Flow):** Budget $100, proposal $85, approved merchant $\rightarrow$ Authorization ALLOW $\rightarrow$ PayPal capture $\rightarrow$ Passport VERIFIED.
2. **SC-02 (Budget Violation):** Budget $100, proposal $160 $\rightarrow$ Kernel BLOCK with `BUDGET_EXCEEDED` $\rightarrow$ Zero PayPal calls.
3. **SC-03 (Merchant Restriction):** Unpermitted seller $\rightarrow$ Kernel BLOCK with `MERCHANT_NOT_ALLOWED`.
4. **SC-04 (Approval Tampering):** Approval bound to $85; cart changed to $95 $\rightarrow$ `PROPOSAL_FINGERPRINT_MISMATCH`.
5. **SC-05 (Expired Mandate):** Attempting purchase with expired mandate $\rightarrow$ BLOCK with `MANDATE_EXPIRED`.
6. **SC-06 (Reconciliation Variance):** Approved $85 vs captured $90 fixture $\rightarrow$ Flagged `RECONCILIATION_EXCEPTION`.
7. **SC-07 (Cryptographic Ledger Tampering):** Mutated audit event in hash chain $\rightarrow$ Verifier flags `INVALID` and pinpoints sequence.
8. **SC-08 (Webhook Deduplication):** Duplicate PayPal webhook transmissions processed idempotently with zero state duplication.
9. **SC-09 (AI Provider Fallback):** Unavailability of LLM API triggers deterministic catalogue rule engine without degrading financial authorization.

---

## Getting Started

### Prerequisites
- Node.js 20+ (tested on Node v24.18.0)
- npm 10+

### Installation
```bash
# Clone and install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Validate Prisma schema and generate types
npx prisma validate
npx prisma generate
```

### Running Tests
```bash
# Run the 18 automated unit and integration tests
npm test
```

### Production Build
```bash
# Verify TypeScript compilation and Next.js production build
npx tsc --noEmit
npm run build
```

### Local Development Server
```bash
npm run dev
# Open http://localhost:3000 in your browser
```

---

## License
MIT License — Copyright (c) 2026 INTENTLEDGER AI Contributors.
