# INTENTLEDGER AI — REST API CONTRACTS SPECIFICATION

All endpoints adhere to `/api/v1` prefix and return JSON payloads with consistent status conventions.

---

## 1. Intent Mandates API

### `POST /api/v1/intents`
Creates and cryptographically signs a new Intent Mandate.
- **Request Body:**
  ```json
  {
    "title": "Wireless Headphones Purchase",
    "naturalInstruction": "Find wireless headphones under $100 from an approved merchant.",
    "budgetLimit": "100.00",
    "currency": "USD",
    "permittedMerchants": ["Demo Electronics"],
    "restrictedMerchants": ["ShadyDeals LLC"],
    "requiredAttributes": ["wireless", "noise-cancelling"],
    "excludedCategories": ["refurbished"],
    "maxQuantity": 1,
    "requireHumanApproval": true,
    "expiresAt": "2026-12-31T23:59:59Z"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "mandateId": "mandate_c8f2b...",
    "status": "ACTIVE",
    "fingerprint": "a3b9c...",
    "signature": "ed25519_sig...",
    "keyVersion": "v1",
    "createdAt": "2026-11-11T19:00:00Z"
  }
  ```

### `GET /api/v1/intents`
Lists active, expired, or revoked mandates with pagination and status filters.

### `POST /api/v1/intents/:id/revoke`
Revokes an existing mandate immediately. No further purchases can be authorized.

---

## 2. AI Shopping Agent API

### `POST /api/v1/agent/proposals`
Evaluates catalogue items against a mandate and generates a structured purchase proposal.
- **Request Body:**
  ```json
  {
    "mandateId": "mandate_c8f2b...",
    "query": "ANC headphones under 100"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "proposalId": "prop_99f2a...",
    "mandateId": "mandate_c8f2b...",
    "productId": "prod_audio_01",
    "productName": "AuraSound Pro ANC Wireless Headphones",
    "merchantId": "merch_demo_01",
    "merchantName": "Demo Electronics",
    "proposedAmount": "85.00",
    "currency": "USD",
    "quantity": 1,
    "proposalFingerprint": "sha256_e81b...",
    "reasoningSummary": "Selected AuraSound Pro at $85.00, well within your $100.00 budget and from approved seller Demo Electronics.",
    "constraintsSatisfied": ["BUDGET_COMPLIANT", "MERCHANT_PERMITTED", "ATTRIBUTE_MATCH"],
    "requiresHumanApproval": true
  }
  ```

---

## 3. Authorization Kernel API

### `POST /api/v1/authorization/evaluate`
Runs the 18 deterministic checks against a proposal and mandate.
- **Response (200 OK):**
  ```json
  {
    "decision": "REQUIRE_APPROVAL",
    "reasonCodes": ["APPROVAL_REQUIRED"],
    "mandateId": "mandate_c8f2b...",
    "proposalId": "prop_99f2a...",
    "evaluatedAt": "2026-11-11T19:05:00Z"
  }
  ```

### `POST /api/v1/authorization/approve`
Issues an exact proposal-bound single-use approval token.
- **Request Body:**
  ```json
  {
    "proposalId": "prop_99f2a...",
    "proposalFingerprint": "sha256_e81b...",
    "customerConsent": true
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "approvalId": "appr_77a2...",
    "proposalFingerprint": "sha256_e81b...",
    "status": "APPROVED",
    "expiresAt": "2026-11-11T19:20:00Z"
  }
  ```

---

## 4. PayPal Payment Orchestration API

### `POST /api/v1/payments/create-order`
Server-side order creation via PayPal Orders API v2.
- **Request Body:**
  ```json
  {
    "approvalId": "appr_77a2..."
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "paymentId": "pay_11a...",
    "paypalOrderId": "5O190127TN364715T",
    "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
    "status": "CREATED"
  }
  ```

### `POST /api/v1/payments/capture`
Captures an approved PayPal order and triggers immediate financial reconciliation.
- **Request Body:**
  ```json
  {
    "paymentId": "pay_11a...",
    "paypalOrderId": "5O190127TN364715T"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "paymentId": "pay_11a...",
    "paypalCaptureId": "2XX1873428394812G",
    "status": "CAPTURED",
    "reconciliationStatus": "RECONCILED",
    "capturedAmount": "85.00",
    "currency": "USD",
    "passportId": "pass_001_abc"
  }
  ```

---

## 5. Cryptographic Transaction Passport API

### `GET /api/v1/passports/:id`
Retrieves the full verifiable passport with cryptographic event chain and signature metadata.

### `POST /api/v1/passports/:id/verify`
Performs independent server verification of all hash linkages and signatures.
- **Response (200 OK):**
  ```json
  {
    "passportId": "pass_001_abc",
    "verificationStatus": "VERIFIED",
    "totalEvents": 8,
    "chainValid": true,
    "signaturesValid": true,
    "reconciliationValid": true,
    "verifiedAt": "2026-11-11T19:10:00Z"
  }
  ```
