# INTENTLEDGER AI
## The Trust Infrastructure for Autonomous Commerce

Every AI transaction deserves proof.

[![Next.js](https://img.shields.io/badge/Next.js-15.2.1-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PayPal Sandbox](https://img.shields.io/badge/PayPal_Developer-Sandbox_v2-003087?style=flat-square&logo=paypal&logoColor=white)](https://developer.paypal.com)
[![Neon PostgreSQL](https://img.shields.io/badge/Neon_Serverless-PostgreSQL_16-00E599?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech)
[![AG Grid Community](https://img.shields.io/badge/AG_Grid_Community-v36.2.0-E0234F?style=flat-square&logo=ag-grid&logoColor=white)](https://www.ag-grid.com)
[![Cryptography](https://img.shields.io/badge/Cryptography-Ed25519_%26_SHA--256-4A5568?style=flat-square)](#10-cryptographic-security-architecture)
[![Test Suite](https://img.shields.io/badge/Test_Suite-54%2F54_Passing-16835D?style=flat-square&logo=vitest&logoColor=white)](#22-testing-and-verification)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)

---

## 1. Executive Summary

Autonomous artificial intelligence agents are transitioning from conversational assistants to delegated economic actors capable of browsing catalogues, comparing offers, and initiating commercial checkout. However, autonomous commerce introduces an architectural trust vulnerability: probabilistic language models are inherently non-deterministic and must never possess financial authorization authority.

INTENTLEDGER AI provides a deterministic authorization and cryptographic proof layer for autonomous commerce. It ensures that an AI agent cannot execute payments without satisfying mathematically verifiable human intent constraints, clearing an independent 18-rule deterministic authorization kernel, binding to a tamper-evident proposal fingerprint, routing strictly to verified PayPal merchants, and producing an audit-ready Transaction Passport backed by a sequential SHA-256 hash chain.

> Central Architectural Principle:  
> AI can recommend a purchase. It cannot authorize the money.

---

## 2. Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Table of Contents](#2-table-of-contents)
- [3. Problem Statement: The Trust Gap in Agentic Commerce](#3-problem-statement-the-trust-gap-in-agentic-commerce)
- [4. Proposed Solution](#4-proposed-solution)
- [5. Core Innovations](#5-core-innovations)
- [6. End-to-End Transaction Lifecycle](#6-end-to-end-transaction-lifecycle)
- [7. System Architecture](#7-system-architecture)
- [8. Authorization Kernel and Policy Enforcement](#8-authorization-kernel-and-policy-enforcement)
- [9. Cryptographic Security Architecture](#9-cryptographic-security-architecture)
- [10. PayPal Payment Integration](#10-paypal-payment-integration)
- [11. Transaction Passport and Evidence Verification](#11-transaction-passport-and-evidence-verification)
- [12. Verified PayPal Sandbox Transaction](#12-verified-paypal-sandbox-transaction)
- [13. Security and Failure Scenario Matrix](#13-security-and-failure-scenario-matrix)
- [14. Technology Stack](#14-technology-stack)
- [15. Application Modules and Screenshots](#15-application-modules-and-screenshots)
- [16. Installation and Local Setup](#16-installation-and-local-setup)
- [17. Environment Variables](#17-environment-variables)
- [18. Database Setup](#18-database-setup)
- [19. API Reference](#19-api-reference)
- [20. Repository Structure](#20-repository-structure)
- [21. Testing and Verification](#21-testing-and-verification)
- [22. Known Limitations](#22-known-limitations)
- [23. Future Roadmap](#23-future-roadmap)
- [24. License and Acknowledgements](#24-license-and-acknowledgements)

---

## 3. Problem Statement: The Trust Gap in Agentic Commerce

Conventional e-commerce security assumes a human operator actively reviews items in a browser cart before clicking a payment button. In agentic workflows, autonomous programs act asynchronously on behalf of the customer.

When an autonomous purchase is processed, traditional payment gateways merely confirm that valid credentials or tokens were presented. They cannot answer whether the transaction adhered to the customer original instructions.

This creates an unaddressed trust gap between four distinct commercial transaction states:

| Transaction State | Technical Definition | Typical Autonomous Commerce Vulnerability |
| :--- | :--- | :--- |
| Recommended | Items proposed by an AI model following inventory search. | Hallucination, model drift, prompt injection, or affiliate bias selecting an unauthorized vendor. |
| Authorized | Specific commercial terms formally permitted by policy and human consent. | Gateway blindly assumes AI output represents customer consent. |
| Executed | Funds transferred through the payment network. | Price drift between recommendation and checkout; seller cart mutation; hidden handling fees. |
| Verifiable | Cryptographic proof reconciling original instruction against executed settlement. | Merchant, customer, and AI agent maintain disparate logs; chargeback disputes cannot be resolved. |

INTENTLEDGER AI addresses this gap by decoupling product discovery from financial authorization and sealing every execution milestone into a verifiable ledger.

---

## 4. Proposed Solution

INTENTLEDGER AI inserts an authorization, enforcement, and evidence infrastructure between human intent and payment processing:

1. Customers define commercial constraints in digitally signed Intent Mandates.
2. AI shopping assistants discover products constrained strictly by catalogue inventory.
3. Every recommendation generates a canonical SHA-256 Proposal Fingerprint.
4. An independent 18-rule Authorization Kernel evaluates the proposal deterministically.
5. Human approval binds immutably to the proposal fingerprint; any parameter mutation invalidates approval.
6. Payments are orchestrated through the PayPal Orders API v2 under discrete CAPTURE intent.
7. Post-capture reconciliation verifies captured funds against approved amounts.
8. A 9-event Transaction Passport seals the entire operational history in a SHA-256 hash chain with Ed25519 digital signatures.

---

## 5. Core Innovations

### 5.1 Cryptographically Signed Intent Mandates
Customers declare commercial policies before any agent activity begins:
- Spending caps: Hard budgetary limits and required currency codes.
- Merchant filtering: Explicit lists of permitted and restricted merchants.
- Product constraints: Mandatory product attributes and excluded categories.
- Temporal bounds: Definite expiration timestamps after which execution is rejected.
- Digital signatures: Canonical serialization according to RFC 8785 signed using Ed25519 keypairs.

### 5.2 Catalogue-Grounded Agent with Deterministic Fallback
Product search is executed through Groq Cloud language models (OpenAI GPT-OSS 120B or LLaMA 3.3 70B) constrained to trusted database records:
- Zero fabrication: The model selects exclusively from active catalogue inventory in PostgreSQL.
- Resilient fallback: If the external language model provider experiences downtime, rate limits, or network timeouts, the system immediately switches to an internal deterministic search engine without service disruption or authorization degradation.

### 5.3 Intent Drift Detection
The platform continuously detects divergence between customer intent and proposed purchases:
- Budget drift: Proposed amounts exceeding mandate limits.
- Vendor drift: Unapproved sellers or affiliate substitutions.
- Attribute drift: Proposals missing required features.
- Scope drift: Proposed items matching excluded categories.

### 5.4 Deterministic Authorization Kernel
Authorization is completely isolated from language model outputs. The kernel evaluates 18 non-bypassable backend rules synchronously. If any policy check fails, transaction execution is immediately blocked.

### 5.5 Proposal-Bound Human Approval Gate
Human approval is locked to transaction parameters through cryptographic hashing:
$$\text{ProposalFingerprint} = \text{SHA256}\Big(\text{CanonicalJSON}\big(\text{mandateId}, \text{productId}, \text{merchantId}, \text{amount}, \text{currency}, \text{quantity}\big)\Big)$$
If any cart variable changes prior to payment capture, the approval token becomes invalid. Approvals enforce single-use consumption to eliminate replay attacks.

### 5.6 PayPal Orders API Orchestration
Payment processing uses the PayPal Orders API v2:
- Strict payee assignment: Directs funds exclusively to verified merchant emails.
- CAPTURE intent: Separates order creation from payment capture.
- Automated reconciliation: Verifies captured amounts against authorized proposals.
- Webhook deduplication: Enforces idempotency on webhook event IDs.

### 5.7 Cryptographic Transaction Passports
Every completed transaction produces a 9-event hash chain:
$$H_0 = \text{SHA256}(\text{GenesisRecord})$$
$$H_n = \text{SHA256}(H_{n-1} \parallel \text{CanonicalJSON}(\text{Event}_n))$$
Any retrospective modification to intermediate database records breaks hash chain recalculation and identifies the exact sequence compromised.

### 5.8 Operational Ledger Workspace
The transactions interface is built on AG Grid Community v36.2.0:
- Theme Alpine styling through the AG Grid Theming API.
- Live client-side sorting, column filtering, full-text quick search, and pagination.
- Explicit visual separation between uncaptured orders and settled reconciliations.

---

## 6. End-to-End Transaction Lifecycle

```mermaid
flowchart LR
    Intent[Human Intent] --> Mandate[Signed Intent Mandate]
    Mandate --> Agent[AI Shopping Agent]
    Agent --> Proposal[Structured Purchase Proposal]
    Proposal --> Fingerprint[SHA-256 Proposal Fingerprint]
    Fingerprint --> Kernel[Authorization Kernel]
    Kernel --> Approval[Human Approval Gate]
    Approval --> Order[PayPal Order Creation]
    Order --> Checkout[Buyer Checkout]
    Checkout --> Capture[Payment Capture]
    Capture --> Reconcile[Financial Reconciliation]
    Reconcile --> Passport[Transaction Passport]

    Kernel -.->|Policy Violation| Block[Transaction Blocked]
    Approval -.->|Rejected / Expired| Cancel[Approval Terminated]
    Reconcile -.->|Variance Detected| Exception[Reconciliation Exception]
```

---

## 7. System Architecture

```mermaid
flowchart TD
    subgraph ClientInteraction ["Client Interaction Layer"]
        Shopper[Shopper / Enterprise User]
        IntentUI[Intent Studio /app/intents]
        AuthUI[Authorization Center /app/authorization]
        LedgerUI[Transaction Workspace /app/transactions]
        PassportUI[Passport Explorer /app/passports]
    end

    subgraph IntelligenceLayer ["Intelligence and Catalogue Layer"]
        GroqClient[Groq AI Client / Open LLM]
        RuleEngine[Deterministic Catalogue Fallback]
        ProductCatalogue[Product & Merchant Catalog]
    end

    subgraph AuthorizationLayer ["Deterministic Authorization Layer"]
        PolicyKernel[Authorization Kernel - 18 Rules]
        FingerprintEngine[SHA-256 Fingerprint Engine]
        ConsentService[Single-Use Human Approval Service]
    end

    subgraph PaymentLayer ["PayPal Payment Orchestration Layer"]
        PayPalClient[PayPal SDK & REST Client v2]
        PayPalOrdersAPI[PayPal Orders API - Sandbox]
        CaptureEngine[Capture & Re-evaluation Engine]
        WebhookHandler[Webhook Idempotency Handler]
    end

    subgraph CryptographicLayer ["Cryptographic Evidence Layer"]
        Ed25519Engine[Ed25519 Signature Service]
        HashChainService[Iterative SHA-256 Event Chain]
        PassportVerifier[Cryptographic Passport Verifier]
    end

    subgraph PersistenceLayer ["Neon PostgreSQL Persistence Layer"]
        NeonDB[(Neon Serverless PostgreSQL)]
        PrismaORM[Prisma ORM Client]
    end

    Shopper --> IntentUI
    Shopper --> AuthUI
    Shopper --> LedgerUI
    Shopper --> PassportUI

    IntentUI --> Ed25519Engine
    IntentUI --> PrismaORM
    IntentUI --> GroqClient

    GroqClient -.->|Fallback on Outage| RuleEngine
    GroqClient --> ProductCatalogue
    RuleEngine --> ProductCatalogue

    GroqClient --> FingerprintEngine
    FingerprintEngine --> PolicyKernel
    AuthUI --> PolicyKernel
    PolicyKernel --> ConsentService

    ConsentService --> PayPalClient
    PayPalClient --> PayPalOrdersAPI
    PayPalOrdersAPI --> CaptureEngine
    CaptureEngine --> HashChainService
    WebhookHandler --> HashChainService

    HashChainService --> PassportVerifier
    PassportVerifier --> PrismaORM

    PrismaORM --> NeonDB
```

---

## 8. Authorization Kernel and Policy Enforcement

The Authorization Kernel (`src/server/services/authorization/kernel.ts`) executes 18 deterministic checks. Language models have zero financial authorization authority.

```mermaid
flowchart TD
    Start[Purchase Proposal Submitted] --> CheckMandate{Mandate Exists & Active?}
    CheckMandate -->|No| BlockMandate[BLOCK: Mandate Inactive / Not Found]
    CheckMandate -->|Yes| CheckExpiry{Mandate Expired or Revoked?}
    
    CheckExpiry -->|Yes| BlockExpiry[BLOCK: Mandate Expired / Revoked]
    CheckExpiry -->|No| CheckProduct{Product in Stock & Valid?}
    
    CheckProduct -->|No| BlockProduct[BLOCK: Product Unavailable / Invalid]
    CheckProduct -->|Yes| CheckMerchant{Merchant Permitted & Not Restricted?}
    
    CheckMerchant -->|No| BlockMerchant[BLOCK: Merchant Prohibited]
    CheckMerchant -->|Yes| CheckAttributes{Category & Attributes Satisfied?}
    
    CheckAttributes -->|No| BlockAttributes[BLOCK: Attribute / Exclusion Violation]
    CheckAttributes -->|Yes| CheckBudget{Amount <= Budget & Currency Match?}
    
    CheckBudget -->|No| BlockBudget[BLOCK: Budget Exceeded / Currency Mismatch]
    CheckBudget -->|Yes| CheckApprovalReq{Human Approval Required?}
    
    CheckApprovalReq -->|Yes| CheckApprovalPresent{Valid Approval Present?}
    CheckApprovalReq -->|No| ConcludeAllow[ALLOW: All Constraints Met]
    
    CheckApprovalPresent -->|No| RequireApproval[REQUIRE_APPROVAL: Action Required]
    CheckApprovalPresent -->|Yes| CheckFingerprint{Proposal Fingerprint Matches?}
    
    CheckFingerprint -->|No| BlockFingerprint[BLOCK: Proposal Tampering Detected]
    CheckFingerprint -->|Yes| CheckSingleUse{Approval Unused & Not Expired?}
    
    CheckSingleUse -->|No| BlockSingleUse[BLOCK: Approval Expired / Already Used]
    CheckSingleUse -->|Yes| CheckCompleted{Payment Not Already Completed?}
    
    CheckCompleted -->|No| BlockCompleted[BLOCK: Payment Already Captured]
    CheckCompleted -->|Yes| ConcludeAllow
```

### The 18 Policy Rules

| Rule Index | Policy Check | Verification Condition | Failure Reason Code |
| :---: | :--- | :--- | :--- |
| 1 | Mandate Existence | Mandate record found in database. | `MANDATE_NOT_FOUND` |
| 2 | Mandate Active Status | Mandate status equals `ACTIVE`. | `MANDATE_INACTIVE` |
| 3 | Mandate Expiration | Current timestamp earlier than `expiresAt`. | `MANDATE_EXPIRED` |
| 4 | Mandate Revocation | Mandate status not set to `REVOKED`. | `MANDATE_REVOKED` |
| 5 | Product Inventory | Product exists in catalogue and `inStock` is true. | `PRODUCT_NOT_FOUND` / `PRODUCT_OUT_OF_STOCK` |
| 6 | Permitted Merchant | Merchant present in `permittedMerchants` allowlist. | `MERCHANT_NOT_ALLOWED` |
| 7 | Restricted Merchant | Merchant absent from `restrictedMerchants` denylist. | `MERCHANT_RESTRICTED` |
| 8 | Required Attributes | Product attributes contain all required mandate tags. | `PRODUCT_CONSTRAINT_VIOLATION` |
| 9 | Category Exclusions | Product category and attributes avoid excluded tags. | `EXCLUDED_CATEGORY_VIOLATION` |
| 10 | Quantity Ceiling | Proposed quantity between 1 and `maxQuantity`. | `QUANTITY_EXCEEDED` |
| 11 | Currency Alignment | Proposed currency matches mandate currency exactly. | `CURRENCY_MISMATCH` |
| 12 | Budget Limit | Proposed amount does not exceed `budgetLimit`. | `BUDGET_EXCEEDED` |
| 13 | Approval Requirement | Approval record present when required by mandate. | `APPROVAL_REQUIRED` |
| 14 | Proposal Identity | Approval references the exact proposal and mandate ID. | `APPROVAL_NOT_FOUND` |
| 15 | Approval Validity | Current timestamp earlier than approval `expiresAt`. | `APPROVAL_EXPIRED` |
| 16 | Single-Use Enforcement | Approval status not `USED` and `usedAt` is null. | `APPROVAL_ALREADY_USED` |
| 17 | Fingerprint Integrity | Recalculated SHA-256 fingerprint matches approved token. | `PROPOSAL_FINGERPRINT_MISMATCH` |
| 18 | Capture Uniqueness | Payment record status not `CAPTURED` or `REFUNDED`. | `PAYMENT_ALREADY_COMPLETED` |

---

## 9. Cryptographic Security Architecture

```mermaid
flowchart TD
    subgraph UntrustedZone ["Untrusted AI & External Input Boundary"]
        UserPrompt[User Natural-Language Input]
        ExternalLLM[Groq Cloud LLM / Open Model Output]
        AIProposal[Unverified AI Product Recommendations]
        UnverifiedPayee[External Payee Suggestions]
    end

    subgraph TrustedPolicyZone ["Trusted Deterministic Policy Core"]
        AuthKernel[Authorization Kernel - 18 Policy Rules]
        Canonicalizer[Canonical JSON Serializer - RFC 8785]
        FingerprintCheck[SHA-256 Proposal Fingerprint Lock]
        SingleUseCheck[Atomic Approval Lifecycle Manager]
    end

    subgraph PaymentExecutionZone ["PayPal Payment Execution Boundary"]
        OAuthManager[Server-Side OAuth 2.0 Token Manager]
        PayeeEnforcer[Hardcoded Configured Payee Validator]
        OrdersClient[PayPal Orders API v2 Client]
        CaptureEngine[Post-Checkout Capture Engine]
    end

    subgraph EvidenceLedgerZone ["Tamper-Evident Evidence & Audit Core"]
        Ed25519Signer[Ed25519 Digital Signing Service]
        HashChainGenerator[Iterative SHA-256 Event Chain Engine]
        ReconciliationEngine[Financial Variance Reconciler]
        IndependentVerifier[Independent Cryptographic Verifier]
        NeonStorage[(Neon PostgreSQL ACID Storage)]
    end

    UntrustedZone -->|Structured Proposal Only - No Authority| TrustedPolicyZone
    TrustedPolicyZone -->|Authorized Proposal Token| PaymentExecutionZone
    PaymentExecutionZone -->|Settlement Evidence Payload| EvidenceLedgerZone
    EvidenceLedgerZone -->|Atomic Ledger Records| NeonStorage
    IndependentVerifier -->|Verify Hash Chain & Signatures| NeonStorage
```

### Technical Guarantees and Limitations
- Tamper Evidence: The hash chain provides mathematical proof of alteration, not absolute disk immutability. Unauthorized database edits break subsequent verification.
- Secret Isolation: PayPal client credentials and Ed25519 private keys remain strictly server-side.
- Canonical Hashing: Payloads are serialized using deterministic JSON ordering according to RFC 8785 before signing or hashing.

---

## 10. PayPal Payment Integration

INTENTLEDGER AI integrates with the PayPal Orders API v2 in the Developer Sandbox.

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Frontend as INTENTLEDGER Frontend
    participant Backend as Backend Authorization Service
    participant PayPalAPI as PayPal Orders API v2
    participant PayPalCheckout as PayPal Sandbox Checkout
    participant CaptureService as Capture & Reconciler Service
    participant DB as Neon PostgreSQL
    participant Passport as Transaction Passport Service

    Customer->>Frontend: Submit shopping request
    Frontend->>Backend: Request purchase proposal
    Backend->>Frontend: Return structured proposal with SHA-256 fingerprint
    Customer->>Frontend: Review & authorize proposal
    Frontend->>Backend: Create single-use human approval
    Backend->>DB: Persist approval record
    Frontend->>Backend: Trigger order creation
    Backend->>Backend: Revalidate 18 kernel policies
    Backend->>PayPalAPI: POST /v2/checkout/orders (Intent: CAPTURE)
    PayPalAPI-->>Backend: Return order ID & approval URL
    Backend->>DB: Store payment record (Status: CREATED)
    Backend-->>Frontend: Redirect customer to PayPal
    Customer->>PayPalCheckout: Complete checkout in Sandbox window
    PayPalCheckout-->>Frontend: Redirect to callback (/app/transactions?token=ORDER_ID)
    Frontend->>CaptureService: Request capture (paymentId, paypalOrderId)
    CaptureService->>Backend: Pre-capture kernel policy revalidation
    CaptureService->>PayPalAPI: POST /v2/checkout/orders/{id}/capture
    PayPalAPI-->>CaptureService: Return capture payload (Status: COMPLETED)
    CaptureService->>CaptureService: Reconcile captured amount vs approved proposal
    CaptureService->>DB: Update payment status to CAPTURED, approval to USED
    CaptureService->>Passport: Issue Transaction Passport
    Passport->>DB: Atomically persist 9-event hash chain
    Passport-->>Frontend: Return verified Transaction Passport
    Frontend-->>Customer: Render confirmed transaction & verification badge
```

---

## 11. Transaction Passport and Evidence Verification

```mermaid
flowchart LR
    Genesis["H0: Genesis Hash<br/>SHA256(txId || timestamp)"] --> E1["H1: MANDATE_CREATED<br/>SHA256(H0 || Event1)"]
    E1 --> E2["H2: MANDATE_SIGNED<br/>SHA256(H1 || Event2)"]
    E2 --> E3["H3: PROPOSAL_GENERATED<br/>SHA256(H2 || Event3)"]
    E3 --> E4["H4: AUTH_EVALUATED<br/>SHA256(H3 || Event4)"]
    E4 --> E5["H5: HUMAN_APPROVED<br/>SHA256(H4 || Event5)"]
    E5 --> E6["H6: ORDER_CREATED<br/>SHA256(H5 || Event6)"]
    E6 --> E7["H7: PAYMENT_CAPTURED<br/>SHA256(H6 || Event7)"]
    E7 --> E8["H8: FINANCIAL_RECONCILED<br/>SHA256(H7 || Event8)"]
    E8 --> E9["H_final: PASSPORT_ISSUED<br/>SHA256(H8 || Event9)"]
```

### The Nine Audit Events

1. `MANDATE_CREATED`: Customer intent instructions, budget ceiling, permitted merchants, and constraint rules.
2. `MANDATE_SIGNED`: Ed25519 signature over canonical mandate payload with key version.
3. `PROPOSAL_GENERATED`: Proposed product, merchant ID, unit price, quantity, and proposal fingerprint.
4. `AUTHORIZATION_EVALUATED`: Synchronous record of kernel verdict and evaluated constraint details.
5. `HUMAN_APPROVED`: Explicit customer approval record bound to proposal fingerprint.
6. `PAYPAL_ORDER_CREATED`: PayPal Orders API v2 order ID, payee email, and capture intent.
7. `PAYPAL_PAYMENT_CAPTURED`: PayPal capture transaction ID, executed amount, and currency.
8. `FINANCIAL_RECONCILED`: Comparison between approved proposal price and captured amount.
9. `PASSPORT_ISSUED`: Final sealed passport record referencing initial genesis hash and terminal digest.

---

## 12. Verified PayPal Sandbox Transaction

The implementation has been verified through a complete, live PayPal Developer Sandbox transaction.

```
================================================================================
                    PAYPAL SANDBOX SETTLEMENT VERIFICATION                      
================================================================================
  Target Product:          AuraSound Pro ANC Wireless Headphones
  Authorized Amount:       $85.00 USD
  Mandate Spending Cap:    $100.00 USD
  Configured Payee Seller: sb-25i8a53852340@business.example.com
  Verified Buyer Account:  sb-hjph553882637@personal.example.com (PayerID: M43LGCBK499X8)
================================================================================
  PayPal Order ID:         8JJ990584K259862H
  PayPal Order Status:     COMPLETED
  PayPal Intent:           CAPTURE
  PayPal Capture ID:       099980883C949623D
  PayPal Capture Status:   COMPLETED
================================================================================
  Neon DB Payment Record:  pay_1794492233284 (Status: CAPTURED)
  Reconciliation Outcome:  RECONCILED (Variance: $0.00)
  Sealed Passport ID:      pass_tx_1794494620496
  Passport Genesis Hash:   f7f326ad1ad78c225903fadabd21216805bbb7a486e87b1fcd1021dddbb21c72
  Passport Final Hash:     27cf1da73f00a7fb977976c7e59c9c3696717976036dfe4ad9100e8ebb7d7c4a
  Audit Events Count:      9 Lifecycle Events
  Cryptographic Verdict:   VERIFIED (Chain: Valid | Signature: Valid | Reconciled: Valid)
================================================================================
```

### Tripartite Evidence Parity

| Verification Parameter | PayPal Sandbox REST API v2 | Neon PostgreSQL Database | Transaction Passport pass_tx_1794494620496 | Parity Status |
| :--- | :--- | :--- | :--- | :--- |
| Order Identifier | `8JJ990584K259862H` | `8JJ990584K259862H` | `8JJ990584K259862H` | MATCH (PASS) |
| Capture Identifier | `099980883C949623D` | `099980883C949623D` | `099980883C949623D` | MATCH (PASS) |
| Settlement Amount | `$85.00` | `$85.00` | `$85.00` | MATCH (PASS) |
| Currency Code | `USD` | `USD` | `USD` | MATCH (PASS) |
| Payee Account | `sb-25i8a53852340@business.example.com` | `sb-25i8a53852340@business.example.com` | `sb-25i8a53852340@business.example.com` | MATCH (PASS) |
| Operational State | `COMPLETED` | `CAPTURED` | `VERIFIED` | MATCH (PASS) |

---

## 13. Security and Failure Scenario Matrix

The automated test suite verifies 10 operational and failure scenarios:

| Scenario Index | Test Scenario | Operational Condition | Expected Technical Behavior | Verification Module | Result |
| :---: | :--- | :--- | :--- | :--- | :---: |
| SC-01 | Valid Purchase Execution | Budget $100, Proposal $85, Permitted Seller | Kernel allows transaction, PayPal captures funds, Passport verifies | `tests/unit/passport-and-reconciliation.test.ts` | PASS |
| SC-02 | Budget Limit Violation | Budget $100, Proposal $160 | Kernel blocks with `BUDGET_EXCEEDED`, zero PayPal calls | `tests/unit/authorization-kernel.test.ts` | PASS |
| SC-03 | Merchant Restriction Violation | Permitted: Demo Electronics, Proposed: ShadyDeals | Kernel blocks with `MERCHANT_NOT_ALLOWED`, execution aborted | `tests/unit/authorization-kernel.test.ts` | PASS |
| SC-04 | Cart and Fingerprint Tampering | Approval for $85; Cart altered to $95 | Fingerprint mismatch triggers `PROPOSAL_FINGERPRINT_MISMATCH` | `tests/unit/crypto.test.ts` | PASS |
| SC-05 | Expired Mandate Enforcement | Timestamp `expiresAt` < current time | Kernel blocks with `MANDATE_EXPIRED`, order rejected | `tests/unit/authorization-kernel.test.ts` | PASS |
| SC-06 | Financial Reconciliation Variance | Approved $85.00; Captured $90.00 | Reconciler flags `RECONCILIATION_EXCEPTION`, passport marked `INVALID` | `tests/unit/passport-and-reconciliation.test.ts` | PASS |
| SC-07 | Audit Ledger Tamper Detection | Modification of event payload sequence 4 | Hash recalculation fails with `INVALID`, pinpoints sequence 4 | `tests/unit/real-passport-tamper.test.ts` | PASS |
| SC-08 | Webhook Event Deduplication | Duplicate transmission of capture webhook | Idempotency handler recognizes event ID, zero duplicate writes | `tests/unit/passport-and-reconciliation.test.ts` | PASS |
| SC-09 | AI Provider Outage Resiliency | External Groq API unavailable or returns 500 | Deterministic rule engine activates, proposal generated from catalog | `tests/unit/agent-fallback.test.ts` | PASS |
| SC-10 | Database Persistence Across Restart | Store re-instantiated after simulated restart | Direct SQL reads verify mandates and payments survive cold restart | `tests/integration/neon-persistence.test.ts` | PASS |

---

## 14. Technology Stack

| Layer | Component | Version | Functional Responsibility |
| :--- | :--- | :--- | :--- |
| Framework | Next.js App Router | `15.2.1` | Server-rendered frontend, API route handlers, React Server Components |
| Language | TypeScript | `5.7.3` | End-to-end static typing across schemas, APIs, and client views |
| UI Runtime | React | `19.0.0` | Concurrent UI component tree rendering |
| Payments | PayPal Orders API v2 | `2020-04-16` | Developer Sandbox OAuth, order creation, buyer capture, and webhooks |
| Database | Neon PostgreSQL | `PostgreSQL 16` | Serverless relational persistence with connection pooling |
| ORM | Prisma Client | `^6.4.1` | Relational schema definition, migration management, and type-safe queries |
| AI Inference | Groq Cloud SDK | `REST API v1` | High-speed LLM structured proposal generation (GPT-OSS 120B / LLaMA 3.3) |
| Cryptography | Node.js `crypto` | Native | Ed25519 digital signatures, SHA-256 hash chains, canonical JSON |
| Data Grid | AG Grid Community | `36.2.0` | Enterprise operational ledger with sorting, filtering, and pagination |
| Validation | Zod | `^3.24.2` | Runtime schema validation for request payloads and internal structures |
| Styling | Tailwind CSS | `^3.4.17` | Utility-first responsive enterprise styling |
| Test Runner | Vitest | `^3.0.5` | Unit, integration, and security scenario test execution |

---

## 15. Application Modules and Screenshots

For screenshot capture specifications and visual guidelines, refer to the [Screenshot Capture Guide](./docs/screenshots/README.md).

| Module Name | Application Route | Functional Purpose | Screenshot Reference |
| :--- | :--- | :--- | :--- |
| Overview Dashboard | `/app` | Operational metrics, security scenario triggers, and recent activity ledger | `docs/screenshots/01-dashboard.png` |
| Intent Studio | `/app/intents` | Mandate builder, constraint definition, and Ed25519 digital signing | `docs/screenshots/02-intent-studio.png` |
| AI Shopping Agent | `/app/agent` | Grounded product recommendations and constraint satisfaction scoring | `docs/screenshots/03-shopping-agent.png` |
| Authorization Center | `/app/authorization` | 18 policy evaluation cards, proposal fingerprint inspection, PayPal launch | `docs/screenshots/04-authorization-center.png` |
| PayPal Checkout | `sandbox.paypal.com` | Live buyer approval window, order summary review, and payee verification | `docs/screenshots/05-paypal-checkout.png` |
| Transaction Ledger | `/app/transactions` | AG Grid operational workspace with `NOT_CAPTURED` and `RECONCILED` statuses | `docs/screenshots/06-transactions-workspace.png` |
| Transaction Passport | `/app/passports/[id]` | 9-event hash chain timeline, Genesis/Final hash inspection, signature verification | `docs/screenshots/07-transaction-passport.png` |
| Evidence Center | `/app/evidence` | 7-point evidence dossier completeness score and intent drift tracking | `docs/screenshots/08-evidence-center.png` |
| System Diagnostics | `/app/settings` | Database connectivity, PayPal token status, and masked key versions | `docs/screenshots/09-diagnostics.png` |

---

## 16. Installation and Local Setup

### Prerequisites
- Node.js version 20.0.0 or higher (tested on Node v24.18.0)
- npm version 10.0.0 or higher
- Operating System: Linux, macOS, or Windows

### Step 1: Clone Repository
```bash
git clone <REPOSITORY_URL>
cd intentledger-ai
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
```bash
cp .env.example .env
```
Configure your environment variables as detailed in [Section 17](#17-environment-variables).

### Step 4: Generate Prisma Client & Push Schema
```bash
npx prisma validate
npx prisma generate
npx prisma db push
```

### Step 5: Run Automated Verification Tests
```bash
npm test
```

### Step 6: Verify TypeScript & Build
```bash
npx tsc --noEmit
npm run build
```

### Step 7: Launch Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 17. Environment Variables

All sensitive credentials remain strictly server-side and are never prefixed with `NEXT_PUBLIC_`.

```env
# PayPal Developer Sandbox Credentials
# Obtain from https://developer.paypal.com/dashboard/applications/sandbox
PAYPAL_CLIENT_ID=your_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret_here
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_WEBHOOK_ID=your_sandbox_webhook_id_here

# Demonstration Sandbox Seller Account
PAYPAL_DEMO_PAYEE_EMAIL=sb-25i8a53852340@business.example.com
PAYPAL_DEMO_MERCHANT_NAME="Demo Electronics"

# Neon Serverless PostgreSQL Database Connection
# Format: postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
DATABASE_URL="postgresql://user:password@ep-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Groq Cloud AI Engine
# Obtain from https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b

# Cryptographic Keypair (Ed25519)
# Optional in local development; falls back to a deterministic development keypair
INTENTLEDGER_SIGNING_KEY_ED25519=
INTENTLEDGER_KEY_VERSION=v1
```

---

## 18. Database Setup

INTENTLEDGER AI uses Prisma ORM with Neon Serverless PostgreSQL. The relational schema defines 13 models:

- `User`: Platform user accounts.
- `Merchant`: Permitted and restricted vendor records.
- `Product`: Catalogue items with pricing, attributes, stock status, and delivery estimates.
- `IntentMandate`: Structured purchasing constraints with Ed25519 digital signatures.
- `PurchaseProposal`: AI-generated product recommendations with SHA-256 fingerprints.
- `AuthorizationDecision`: Synchronous audit records of all 18 kernel evaluations.
- `Approval`: Single-use customer consent records bound to proposal fingerprints.
- `Payment`: Internal payment records linked to PayPal order tokens.
- `PaymentCapture`: PayPal settlement capture transactions with reconciliation status.
- `PaymentWebhookEvent`: Ingested PayPal webhook records for idempotency tracking.
- `TransactionPassport`: Root cryptographic proof records with Genesis and Final hashes.
- `TransactionEvent`: Sequential hash chain nodes linked by previous and current hashes.
- `EvidenceRecord`: Multi-source evidence artifacts for dispute dossiers.

### Database Synchronization Commands
```bash
# Push schema changes to Neon PostgreSQL
npx prisma db push

# Optional: Seed initial catalogue data
npm run seed
```

---

## 19. API Reference

All backend routes adhere to the `/api/v1` namespace and return standard JSON responses.

### 19.1 Intent Mandates

#### `POST /api/v1/intents`
Creates and digitally signs a new Intent Mandate.
- Request Body:
  ```json
  {
    "title": "Wireless Headphones Purchase",
    "naturalInstruction": "Find wireless headphones under $100 from an approved merchant.",
    "budgetLimit": "100.00",
    "currency": "USD",
    "permittedMerchants": ["Demo Electronics"],
    "restrictedMerchants": ["ShadyDeals LLC"],
    "requiredAttributes": ["wireless"],
    "excludedCategories": ["refurbished"],
    "maxQuantity": 1,
    "requireHumanApproval": true,
    "expiresAt": "2026-12-31T23:59:59.000Z"
  }
  ```
- Response (201 Created):
  ```json
  {
    "success": true,
    "data": {
      "id": "mandate_c8f2b1...",
      "status": "ACTIVE",
      "signature": "304502...",
      "fingerprint": "a3b9c1...",
      "signingKeyVersion": "v1"
    }
  }
  ```

#### `GET /api/v1/intents`
Lists all active, expired, and revoked mandates.

#### `POST /api/v1/intents/:id/revoke`
Immediately revokes an active mandate, blocking all subsequent purchases.

### 19.2 AI Shopping Agent

#### `POST /api/v1/agent/proposals`
Evaluates catalogue items against a mandate and generates a purchase proposal.
- Request Body:
  ```json
  {
    "mandateId": "mandate_c8f2b1...",
    "query": "wireless noise cancelling headphones"
  }
  ```
- Response (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "proposal": {
        "id": "prop_1794492226155",
        "productId": "prod_audio_01",
        "productName": "AuraSound Pro ANC Wireless Headphones",
        "merchantId": "merch_demo_01",
        "merchantName": "Demo Electronics",
        "proposedAmount": "85.00",
        "currency": "USD",
        "proposalFingerprint": "9f8e7d..."
      },
      "isAiGenerated": true,
      "modelUsed": "openai/gpt-oss-120b"
    }
  }
  ```

### 19.3 Authorization Kernel

#### `POST /api/v1/authorization/evaluate`
Executes all 18 deterministic checks without state modification.
- Response (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "decision": "ALLOW",
      "reasonCodes": ["ALL_POLICIES_SATISFIED"],
      "checksDetail": [
        { "checkName": "Mandate Exists", "passed": true },
        { "checkName": "Budget Limit Enforced", "passed": true }
      ]
    }
  }
  ```

#### `POST /api/v1/authorization/approve`
Issues a single-use human approval bound to the proposal fingerprint.
- Request Body:
  ```json
  {
    "mandateId": "mandate_c8f2b1...",
    "proposalId": "prop_1794492226155",
    "proposalFingerprint": "9f8e7d..."
  }
  ```
- Response (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "approvalId": "appr_1794492228802",
      "status": "APPROVED",
      "expiresAt": "2026-11-12T16:43:40.000Z"
    }
  }
  ```

### 19.4 PayPal Payments

#### `POST /api/v1/payments/create-order`
Revalidates policy and initiates a PayPal Orders API v2 transaction.
- Request Body:
  ```json
  {
    "approvalId": "appr_1794492228802"
  }
  ```
- Response (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "paymentId": "pay_1794492233284",
      "paypalOrderId": "8JJ990584K259862H",
      "status": "CREATED",
      "approveUrl": "https://www.sandbox.paypal.com/checkoutnow?token=8JJ990584K259862H"
    }
  }
  ```

#### `POST /api/v1/payments/capture`
Captures an approved PayPal order, reconciles amounts, and issues a Transaction Passport.
- Request Body:
  ```json
  {
    "paymentId": "pay_1794492233284",
    "paypalOrderId": "8JJ990584K259862H"
  }
  ```
- Response (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "paymentId": "pay_1794492233284",
      "paypalCaptureId": "099980883C949623D",
      "reconciliationStatus": "RECONCILED",
      "passportId": "pass_tx_1794494620496"
    }
  }
  ```

#### `POST /api/v1/payments/webhooks/paypal`
Ingests and verifies asynchronous PayPal webhook notifications with idempotency protection.

### 19.5 Transaction Passports

#### `GET /api/v1/passports/:id`
Retrieves a complete Transaction Passport and its 9-event hash chain.

#### `POST /api/v1/passports/:id/verify`
Independently verifies hash chain continuity and digital signatures.
- Response (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "verificationStatus": "VERIFIED",
      "chainValid": true,
      "signatureValid": true,
      "reconciliationValid": true,
      "totalEvents": 9
    }
  }
  ```

---

## 20. Repository Structure

```
intentledger-ai/
├── docs/                           # Technical documentation & guides
│   ├── API_CONTRACTS.md            # REST API payload & response specifications
│   ├── ARCHITECTURE.md             # In-depth system architecture & flows
│   ├── DECISIONS.md                # Architecture decision records
│   ├── IMPLEMENTATION_PLAN.md      # Implementation milestone tracking
│   ├── SECURITY.md                 # Threat model & cryptographic controls
│   ├── TESTING.md                  # Test scenarios matrix
│   └── screenshots/                # Application screenshot capture guide
│       └── README.md
├── prisma/
│   ├── schema.prisma               # Relational data schema (13 models)
│   └── seed.ts                     # Catalogue and initial store seed script
├── src/
│   ├── app/                        # Next.js 15 App Router pages & API routes
│   │   ├── api/v1/                 # RESTful backend API routes
│   │   │   ├── agent/proposals/    # Shopping agent proposal generation
│   │   │   ├── analytics/overview/ # Dashboard metrics & activity
│   │   │   ├── authorization/      # Policy evaluation & human approval
│   │   │   ├── evidence/           # Transaction dossier retrieval
│   │   │   ├── intents/            # Mandate CRUD & revocation
│   │   │   ├── passports/          # Passport retrieval & verification
│   │   │   └── payments/           # PayPal Orders v2 create, capture, webhook
│   │   ├── app/                    # Web workspace frontend views
│   │   │   ├── agent/              # AI shopping assistant view
│   │   │   ├── analytics/          # Intelligence & reporting view
│   │   │   ├── authorization/      # 18-rule policy inspection screen
│   │   │   ├── evidence/           # Evidence completeness dossiers
│   │   │   ├── intents/            # Intent Studio mandate manager
│   │   │   ├── passports/          # Cryptographic passport inspector
│   │   │   ├── settings/           # System diagnostics & status
│   │   │   └── transactions/       # AG Grid operational workspace
│   │   └── page.tsx                # Public landing page
│   ├── components/                 # Reusable UI component library
│   ├── lib/                        # Shared utility libraries
│   │   ├── crypto/                 # Ed25519, SHA-256 hash chains, canonical JSON
│   │   ├── database/               # Prisma client singleton & connection pooling
│   │   └── paypal/                 # PayPal REST API v2 client & OAuth cache
│   ├── server/                     # Core backend domain engines
│   │   ├── ai/                     # Groq LLM structured client
│   │   ├── repositories/           # Store & PostgreSQL repository layer
│   │   └── services/               # Kernel, Shopping Agent, Passport Service
│   └── types/                      # Universal TypeScript domain interfaces
├── tests/                          # Automated test suites (54 tests)
│   ├── integration/                # Neon persistence & PayPal preflight tests
│   └── unit/                       # Kernel, crypto, AG Grid, & fallback tests
├── .env.example                    # Template environment variables
├── LICENSE                         # MIT License
├── package.json                    # Project dependencies and test scripts
├── tailwind.config.ts              # Tailwind CSS design system configuration
├── tsconfig.json                   # Strict TypeScript compiler configuration
└── vitest.config.ts                # Vitest test runner configuration
```

---

## 21. Testing and Verification

The test suite covers unit, integration, and security scenarios across 10 test files.

### Terminal Verification Summary

```
Test Files  10 passed (10)
Tests       54 passed (54)
Duration    70.97s
TypeScript  npx tsc --noEmit (Exit Code: 0 | 0 errors)
Build       npm run build (Exit Code: 0 | 23/23 routes compiled)
```

### Verified Test Suites

1. `tests/integration/neon-persistence.test.ts` (7 tests): Direct SQL connectivity to Neon, mandate creation, status update to `REVOKED`, store hydration after simulated restart, database-level webhook idempotency, and transactional durability rollback.
2. `tests/integration/transaction-preflight.test.ts` (11 tests): Complete preflight verification of PayPal Developer Sandbox OAuth token retrieval, merchant payee mapping, mandate and proposal validation, kernel policy evaluation, and store hydration.
3. `tests/integration/authorization-payee-resolution.test.ts` (5 tests): Verification that the Authorization Center resolves the runtime PayPal payee email strictly from server configuration and blocks unconfigured sellers.
4. `tests/unit/real-passport-tamper.test.ts` (4 tests): Verification of genuine live passport `pass_tx_1794494620496`, followed by mathematical detection of payload mutation in sequence 4 and hash mutation in sequence 6.
5. `tests/unit/agent-fallback.test.ts` (2 tests): Verification of deterministic catalogue search fallback when Groq Cloud API credentials are unset or unavailable.
6. `tests/unit/authorization-kernel.test.ts` (7 tests): Exhaustive policy evaluation across all 18 rules and failure reason codes.
7. `tests/unit/crypto.test.ts` (6 tests): RFC 8785 canonical JSON serialization, deterministic SHA-256 hash calculation, sequential hash chaining, Ed25519 digital signature signing and verification, and proposal fingerprint validation.
8. `tests/unit/paypal-order-payload.test.ts` (4 tests): PayPal Orders API v2 payload construction, CAPTURE intent enforcement, and rejection of placeholder payee emails.
9. `tests/unit/passport-and-reconciliation.test.ts` (4 tests): Hash chain integrity validation, financial variance detection on overcharge fixtures, audit ledger tampering detection, and webhook deduplication.
10. `tests/unit/ag-grid-options.test.ts` (4 tests): AG Grid Community v36.2.0 module registration, pagination page size selector configuration, modern row selection options, and validation of zero console warnings.

---

## 22. Known Limitations

The following technical limitations are disclosed in the interest of engineering transparency:

1. Developer Sandbox Environment: Payment operations are configured for the PayPal Developer Sandbox. Production deployment requires PayPal Live credentials, active merchant accounts, and live webhook endpoint registration.
2. In-Memory Key Registry Across Restarts: The `KeyManager.keyRegistry` caches rotated Ed25519 public keys in process memory. If an operator rotates the active key in `.env` from `v1` to `v2` and restarts the server process, older `v1` passports require manual re-registration of the historical public key at boot.
3. AG Grid Community Runtime: The operational transaction ledger runs AG Grid Community v36.2.0. AG Studio commercial features are not enabled in the current configuration.
4. Operational Evidence vs Legal Resolution: The Evidence Center produces mathematically verifiable audit trails; it does not guarantee the outcome of formal banking chargeback arbitration.
5. Hackathon Prototype Classification: This implementation is an architectural proof-of-concept for autonomous commerce trust infrastructure and has not undergone formal financial regulatory certification.

---

## 23. Future Roadmap

1. Durable Public Key Vault: Store historical Ed25519 public keys in a dedicated PostgreSQL table (`KeyRegistry`) to automate backwards-compatible signature verification across server restarts.
2. Hardware Security Module Support: Integrate cloud HSM solutions (AWS KMS, Google Cloud KMS) for enterprise signing key protection.
3. Decentralized Ledger Anchoring: Periodically anchor terminal passport hashes to an external public blockchain for decentralized time-stamping.
4. Agent Protocol Interoperability: Support delegated agent-to-agent commercial negotiation standards such as Autonomous Purchasing Protocols (AP2).
5. Split-Payment Merchant Settlement: Incorporate PayPal Commerce Platform (PPCP) multi-seller split payouts for automated marketplace fee deduction.

---

## 24. License and Acknowledgements

This project is open-source software licensed under the [MIT License](./LICENSE).

### Technical Acknowledgements
- PayPal Developer Platform: For Orders API v2 Sandbox infrastructure and developer tooling.
- Neon Serverless PostgreSQL: For low-latency serverless PostgreSQL and database branching capabilities.
- Groq Cloud: For high-speed open-model language model inference.
- AG Grid: For enterprise-grade data grid component architecture.

---

Document Version: 1.0.0  
Classification: Financial Infrastructure & Autonomous Commerce Accountability Specification  
Verified Implementation: Tested against PayPal Developer Sandbox & Neon Serverless PostgreSQL
