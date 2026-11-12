# INTENTLEDGER AI — Application Screenshot Capture Guide

This directory holds visual verification artifacts and UI walkthrough captures for the **INTENTLEDGER AI** platform.

To maintain judge-grade documentation standards, captured screenshots must be recorded directly from the running Next.js application in dark/light clean state without mock overlays.

---

## Screenshot Inventory & Capture Checklist

| Filename | Application Route | Description & Key UI Elements to Capture |
| :--- | :--- | :--- |
| `01-dashboard.png` | `/app` | **Operational Overview:** Metrics row (Total Transactions, Active Mandates, Blocked Drift Incidents, Value Transacted), Security Scenario test triggers, and Recent Activity stream. |
| `02-intent-studio.png` | `/app/intents` | **Intent Studio:** Mandate creation form, natural-language prompt input, budget limit ($100), permitted merchant selection (Demo Electronics), and Ed25519 signature badge. |
| `03-shopping-agent.png` | `/app/agent` | **AI Shopping Agent:** Product recommendation card for AuraSound Pro ANC Wireless Headphones ($85.00), catalogue grounding provenance, and constraint satisfaction checklist. |
| `04-authorization-center.png` | `/app/authorization` | **Authorization Center:** 18 deterministic policy evaluation cards (all green), SHA-256 proposal fingerprint display, target PayPal payee (`sb-25i8a53852340@business.example.com`), and PayPal Checkout launch action. |
| `05-paypal-checkout.png` | `sandbox.paypal.com` | **PayPal Developer Sandbox Checkout:** Genuine buyer login (`sb-hjph553882637@personal.example.com`), purchase review of $85.00 USD, and seller display. |
| `06-transactions-workspace.png` | `/app/transactions` | **AG Grid Operational Ledger:** AG Grid Community table displaying transaction rows, sort/filter controls, status badges (`CAPTURED` vs `CREATED`), reconciliation status (`RECONCILED` vs `NOT_CAPTURED`), and callback recovery banner. |
| `07-transaction-passport.png` | `/app/passports/pass_tx_1794494620496` | **Cryptographic Transaction Passport:** 9-event sequential hash chain timeline, Genesis hash, Final hash, Ed25519 digital signature badge, and raw JSON export panel. |
| `08-evidence-center.png` | `/app/evidence` | **Evidence Center:** 7-point evidence dossier completeness score (100%), Intent Drift incident analysis, and dispute readiness dossier. |
| `09-diagnostics.png` | `/app/settings` | **System Diagnostics:** Server runtime status, Neon PostgreSQL connection health, PayPal OAuth cache state, and masked Ed25519 key version. |

---

## Capture Specifications
- **Viewport:** 1440 x 900 (Desktop Standard)
- **Browser:** Chromium / Chrome Desktop
- **Format:** PNG with standard sRGB color profile
- **Resolution:** 2x Retina or standard 1x
- **Location:** Place captured files directly in `docs/screenshots/<filename>`

