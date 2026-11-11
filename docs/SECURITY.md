# INTENTLEDGER AI — SECURITY POLICY & CONTROLS SPECIFICATION

## 1. Threat Model & Boundaries

| Threat / Vulnerability | Attack Vector | Mitigation Control |
| :--- | :--- | :--- |
| **Prompt Injection** | User prompt tricks LLM into bypassing mandate limits | LLM has zero authorization authority. Backend kernel deterministically blocks unauthorized amounts. |
| **Price / Cart Tampering** | Changing proposal amount from $85 to $160 after user approval | Proposal SHA-256 fingerprint mismatch. Single-use approval invalidated immediately. |
| **Replay Attack** | Submitting the same approval token multiple times | Approvals have an atomic `usedAt` timestamp. Double consumption returns `APPROVAL_ALREADY_USED`. |
| **Expired Mandate Exploitation** | Transacting after mandate expiration timestamp | Kernel checks `now() < expiresAt`. Rejects with `MANDATE_EXPIRED`. |
| **Webhook Spoofing** | Attacker posts fake PayPal webhook events | PayPal webhook headers (`PAYPAL-AUTH-ALGO`, `PAYPAL-CERT-URL`, `PAYPAL-TRANSMISSION-ID`, `PAYPAL-TRANSMISSION-SIG`, `PAYPAL-TRANSMISSION-TIME`) verified via PayPal API. |
| **Double Capture / Race Condition** | Concurrent capture requests on the same PayPal order | Idempotency keys (`PayPal-Request-Id`) passed to PayPal API; atomic capture state transitions. |
| **Event Ledger Tampering** | Database administrator or attacker modifies an audit event | Hash chain verification fails ($H_n \ne \text{SHA256}(H_{n-1} \parallel \text{Event}_n)$), flagging `VERIFICATION_FAILED`. |
| **Secret Exposure** | Leaking PayPal client secret or Ed25519 private key | Strictly server-side execution. No secrets prefixed with `NEXT_PUBLIC_`. Key rotation versioning supported. |

---

## 2. Cryptographic Specifications

- **Mandate Digital Signatures:** Ed25519 (Curve25519 in EdDSA mode).
- **Audit Event Hashing:** SHA-256 on Canonical JSON format (RFC 8785 compatible).
- **Proposal Fingerprinting:** SHA-256 digest of:
  `canonicalStringify({ mandateId, productId, merchantId, amount, currency, quantity })`
- **Key Storage:** Server environment variable `INTENTLEDGER_SIGNING_KEY_ED25519` (hex/base64). Never committed to version control.
