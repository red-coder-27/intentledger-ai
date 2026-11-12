import { z } from "zod";

/**
 * INTENTLEDGER AI — Secure PayPal Redirect Configuration
 * Validates APP_BASE_URL and constructs deterministic server-side return/cancel URLs.
 * Prevents open-redirect vulnerabilities and eliminates reliance on untrusted client/proxy headers.
 */

/**
 * Strict schema for PayPal order creation requests.
 * Only accepts approvalId; client-provided return/cancel URLs are stripped/disallowed.
 */
export const CreateOrderSchema = z.object({
  approvalId: z.string().min(1),
});

export interface SecurePayPalRedirects {
  returnUrl: string;
  cancelUrl: string;
  origin: string;
}

export function validateAndResolveRedirectUrls(rawBaseUrl?: string): SecurePayPalRedirects {
  const configured = (rawBaseUrl ?? process.env.APP_BASE_URL)?.trim();

  if (!configured) {
    throw new Error(
      "Configuration error: APP_BASE_URL is not configured. Set APP_BASE_URL in environment (e.g., http://localhost:3000 for development or https://your-domain.vercel.app for production)."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error(
      `Configuration error: APP_BASE_URL '${configured}' is not a valid absolute URL.`
    );
  }

  // Security: Reject embedded user credentials (e.g. https://user:pass@evil.com)
  if (parsed.username || parsed.password) {
    throw new Error(
      "Security error: APP_BASE_URL must not contain embedded user credentials (username/password)."
    );
  }

  // Security: Reject non-HTTP(S) protocols (e.g. javascript:, ftp:, data:, file:)
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Security error: APP_BASE_URL protocol must be 'http:' or 'https:'. Received '${parsed.protocol}'.`
    );
  }

  // Security: Reject query parameters and hash fragments in base URL
  if (parsed.search || parsed.hash) {
    throw new Error(
      "Security error: APP_BASE_URL must not include query parameters or URL fragments."
    );
  }

  // Security: Require HTTPS outside localhost development
  const hostname = parsed.hostname.toLowerCase();
  const isLocalhost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost");

  if (parsed.protocol === "http:" && !isLocalhost) {
    throw new Error(
      `Security error: APP_BASE_URL must use HTTPS protocol outside localhost development. Insecure HTTP host '${parsed.hostname}' is prohibited.`
    );
  }

  // Derive normalized origin without trailing slashes
  const origin = parsed.origin;
  const returnUrl = `${origin}/app/transactions?status=approved`;
  const cancelUrl = `${origin}/app/authorization?status=cancelled`;

  return {
    origin,
    returnUrl,
    cancelUrl,
  };
}

