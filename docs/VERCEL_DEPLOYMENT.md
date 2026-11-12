# INTENTLEDGER AI — Vercel Deployment & Infrastructure Guide

This guide details the step-by-step production deployment procedure for **INTENTLEDGER AI — The Trust Infrastructure for Autonomous Commerce** on **Vercel** with **Neon Serverless PostgreSQL** and **PayPal Developer Sandbox**.

---

## 1. Vercel Project Import

1. Navigate to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** > **Project**.
2. Select your Git provider (GitHub, GitLab, or Bitbucket) and import the repository:
   `red-coder-27/intentledger-ai`
3. Configure the project root:
   - **Root Directory:** `./` (leave default)

---

## 2. Framework & Build Settings

Vercel automatically detects Next.js. Confirm the following settings in the Vercel project configuration:

| Setting | Configuration Value | Notes |
| :--- | :--- | :--- |
| **Framework Preset** | Next.js | Automatically detected from `package.json` |
| **Build Command** | `prisma generate && next build` | Configured in `package.json` to guarantee Prisma Client generation |
| **Output Directory** | `.next` | Default Next.js build output |
| **Install Command** | `npm install` | Default Vercel package installation |
| **Node.js Version** | `20.x` or `22.x` | Set in **Project Settings** > **General** > **Node.js Version** |

---

## 3. Environment Variable Configuration

Enter the following environment variables in **Project Settings** > **Environment Variables** for **Production**, **Preview**, and **Development** environments.

Never commit actual secret values to version control.

| Environment Variable | Required | Default / Format | Description |
| :--- | :---: | :--- | :--- |
| `APP_BASE_URL` | **Yes** | `https://<your-project>.vercel.app` | Canonical deployment URL for server-side PayPal redirect construction. Must use HTTPS outside localhost. |
| `DATABASE_URL` | **Yes** | `postgresql://USER:PASSWORD@HOST-pooler...neondb?sslmode=require` | Neon pooled connection string with pgBouncer pooling for runtime database operations. |
| `DIRECT_URL` | **Yes** | `postgresql://USER:PASSWORD@HOST...neondb?sslmode=require` | Neon unpooled direct connection string required by Prisma for schema migrations and DDL operations. |
| `PAYPAL_CLIENT_ID` | **Yes** | Alphanumeric string | PayPal Developer Sandbox REST application Client ID. |
| `PAYPAL_CLIENT_SECRET` | **Yes** | Alphanumeric secret | PayPal Developer Sandbox REST application Client Secret. |
| `PAYPAL_BASE_URL` | **Yes** | `https://api-m.sandbox.paypal.com` | PayPal REST API base endpoint. Defaults to Sandbox if omitted. |
| `PAYPAL_WEBHOOK_ID` | Optional | Alphanumeric webhook ID | Registered PayPal webhook ID for webhook signature verification. |
| `PAYPAL_DEMO_PAYEE_EMAIL` | **Yes** | `sb-25i8a53852340@business.example.com` | Configured Sandbox Business account email receiving merchant payment captures. |
| `GROQ_API_KEY` | Optional | `gsk_...` | Groq Cloud API key for high-speed LLM recommendations. Falls back to deterministic rule engine if unset. |
| `GROQ_MODEL` | Optional | `openai/gpt-oss-120b` | Model identifier on Groq Cloud. Alternatively: `llama-3.3-70b-versatile`. |
| `INTENTLEDGER_SIGNING_KEY_ED25519` | Optional | Base64 / Hex 32-byte seed or PKCS#8 PEM | Server-side Ed25519 private key for signing Intent Mandates and Transaction Passports. Falls back to deterministic dev keypair if unset. |
| `INTENTLEDGER_KEY_VERSION` | Optional | `v1` | Active key version tag embedded in digital signatures. |

---

## 4. Neon PostgreSQL Database Configuration

### 4.1 Connection Pooling
In serverless environments, each Vercel Lambda function instance establishes its own TCP connection. To prevent connection exhaustion:
- Configure `DATABASE_URL` using the **Neon Pooled connection string** (`-pooler` hostname on port 5432).
- Configure `DIRECT_URL` using the **Neon Direct connection string** (unpooled hostname on port 5432).
- The repository client in `src/lib/database/prisma.ts` automatically appends `connect_timeout=30&pool_timeout=30` to prevent cold-start pool timeouts.

### 4.2 Applying Database Migrations
Before or immediately after the initial Vercel deployment, synchronize the Neon database schema from your local terminal:
```bash
# Apply committed migrations to Neon PostgreSQL
npx prisma migrate deploy

# Alternatively, synchronize schema state directly
npx prisma db push
```

---

## 5. PayPal Developer Sandbox Configuration

### 5.1 Account Setup
1. Log in to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications/sandbox).
2. Create or verify a **Sandbox Business Account** (Seller) and a **Sandbox Personal Account** (Buyer).
3. Ensure the Sandbox Business account email matches the value entered in `PAYPAL_DEMO_PAYEE_EMAIL`.

### 5.2 Server-Side Return and Cancel URLs
The order creation endpoint (`src/app/api/v1/payments/create-order/route.ts`) constructs the PayPal checkout return and cancel URLs strictly on the server using the configured `APP_BASE_URL` environment variable:
- Return URL: `${APP_BASE_URL}/app/transactions?status=approved`
- Cancel URL: `${APP_BASE_URL}/app/authorization?status=cancelled`

To protect against open-redirect and SSRF vulnerabilities, client-supplied URLs and untrusted forwarded host headers are strictly rejected. When configuring Vercel, set `APP_BASE_URL` to your canonical deployment URL (e.g., `https://<your-project>.vercel.app`). HTTPS is enforced outside localhost.

### 5.3 Webhook Registration
To receive real-time payment events from PayPal:
1. In the PayPal Developer Dashboard, navigate to **Apps & Credentials** > your sandbox app > **Webhooks**.
2. Click **Add Webhook**.
3. Set the Webhook URL to:
   `https://<your-project>.vercel.app/api/v1/payments/webhooks/paypal`
4. Subscribe to the following event types:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `CHECKOUT.ORDER.APPROVED`
5. Copy the generated **Webhook ID** and add it as `PAYPAL_WEBHOOK_ID` in Vercel project environment variables.

---

## 6. Deployment Execution Steps

1. Commit and push your code to the `main` branch:
   ```bash
   git push origin main
   ```
2. Vercel automatically detects the push and triggers a production deployment.
3. Monitor the deployment build log in the Vercel Dashboard:
   - Confirms `✔ Generated Prisma Client`
   - Confirms `✓ Compiled successfully`
   - Confirms `✓ Generating static pages (23/23)`
4. Once deployed, Vercel assigns your production domain:
   `https://<project-name>.vercel.app`

---

## 7. Post-Deployment Smoke Tests

Execute these validation checks on the deployed Vercel URL:

| Test Step | Verification Action | Expected Result |
| :---: | :--- | :--- |
| **1. Public Landing** | Navigate to `https://<your-project>.vercel.app` | Public landing page renders with product proposition and navigation. |
| **2. Overview Metrics** | Navigate to `/app` | Operational metrics load successfully from Neon PostgreSQL. |
| **3. Intent Studio** | Navigate to `/app/intents` and create an Intent Mandate | Mandate is saved, signed with Ed25519, and assigned an ID. |
| **4. AI Assistant** | Navigate to `/app/agent` and submit a search query | Proposal is generated against catalogue with SHA-256 fingerprint. |
| **5. Authorization** | Navigate to `/app/authorization?proposalId=<ID>` | 18 policy checks evaluate green; PayPal target payee matches configured business email. |
| **6. PayPal Checkout** | Click **Authorize & Pay with PayPal** | Redirects to `sandbox.paypal.com`; buyer logs in and approves checkout. |
| **7. Callback Recovery** | Return to `/app/transactions?status=approved&token=<ID>` | AG Grid ledger renders approved order; in-line capture succeeds. |
| **8. Passport Issuance** | Click **View Sealed Passport** (`/app/passports/<ID>`) | 9-event hash chain displays `VERIFIED` with valid digital signatures. |

---

## 8. Troubleshooting & Common Issues

### Issue 1: Prisma Client Initialization Error
- **Symptom:** `@prisma/client did not initialize yet. Please run "prisma generate"...`
- **Cause:** Next.js build ran before Prisma Client was generated in the build container.
- **Resolution:** Verify `package.json` defines `"build": "prisma generate && next build"`.

### Issue 2: Neon Cold-Start Connection Timeout
- **Symptom:** `Can't reach database server at ... neon.tech:5432`
- **Cause:** Neon compute endpoint auto-suspends after inactivity and exceeds default 5-second socket timeout.
- **Resolution:** Ensure `src/lib/database/prisma.ts` appends `connect_timeout=30&pool_timeout=30`. Check that `DATABASE_URL` uses the pooled connection string (`-pooler`).

### Issue 3: PayPal Redirects to Localhost
- **Symptom:** After completing PayPal Sandbox checkout, browser redirects to `http://localhost:3000/...`
- **Cause:** The order creation route did not read the `x-forwarded-host` header.
- **Resolution:** In `src/app/api/v1/payments/create-order/route.ts`, origin resolution uses:
  ```ts
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : req.nextUrl.origin;
  ```

---

## 9. Security & Operational Boundary Summary

- **Zero Client Secrets:** No PayPal client credentials, webhook secrets, or Ed25519 signing keys are exposed in client-side bundles.
- **Decoupled Authorization:** Language models running via Groq have zero direct payment authority; payment capture requires kernel policy clearance.
- **Auditable Provenance:** Every settled transaction leaves an immutable trail in Neon PostgreSQL and an independently verifiable Transaction Passport.

