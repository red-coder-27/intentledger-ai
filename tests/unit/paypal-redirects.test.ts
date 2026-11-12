import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { validateAndResolveRedirectUrls, CreateOrderSchema } from "@/lib/paypal/redirects";

describe("Secure PayPal Redirects — URL Validation & Defense-in-Depth", () => {
  const originalEnvBaseUrl = process.env.APP_BASE_URL;

  afterEach(() => {
    if (originalEnvBaseUrl !== undefined) {
      process.env.APP_BASE_URL = originalEnvBaseUrl;
    } else {
      delete process.env.APP_BASE_URL;
    }
  });

  describe("validateAndResolveRedirectUrls()", () => {
    it("throws configuration error when APP_BASE_URL is missing or empty", () => {
      delete process.env.APP_BASE_URL;
      expect(() => validateAndResolveRedirectUrls()).toThrow(
        /Configuration error: APP_BASE_URL is not configured/
      );
      expect(() => validateAndResolveRedirectUrls("   ")).toThrow(
        /Configuration error: APP_BASE_URL is not configured/
      );
    });

    it("throws configuration error when APP_BASE_URL is not a valid absolute URL", () => {
      expect(() => validateAndResolveRedirectUrls("not-a-valid-url")).toThrow(
        /is not a valid absolute URL/
      );
      expect(() => validateAndResolveRedirectUrls("/relative/path")).toThrow(
        /is not a valid absolute URL/
      );
    });

    it("rejects embedded user credentials to prevent SSRF and authentication leaks", () => {
      expect(() => validateAndResolveRedirectUrls("https://admin:secret@intentledger.ai")).toThrow(
        /must not contain embedded user credentials/
      );
      expect(() => validateAndResolveRedirectUrls("http://user@localhost:3000")).toThrow(
        /must not contain embedded user credentials/
      );
    });

    it("rejects non-HTTP(S) protocols", () => {
      expect(() => validateAndResolveRedirectUrls("javascript:alert(1)")).toThrow(
        /protocol must be 'http:' or 'https:'/
      );
      expect(() => validateAndResolveRedirectUrls("ftp://files.example.com")).toThrow(
        /protocol must be 'http:' or 'https:'/
      );
      expect(() => validateAndResolveRedirectUrls("data:text/plain;base64,SGVsbG8=")).toThrow(
        /protocol must be 'http:' or 'https:'/
      );
    });

    it("rejects query parameters and hash fragments in the base URL", () => {
      expect(() => validateAndResolveRedirectUrls("https://intentledger.ai?ref=malicious")).toThrow(
        /must not include query parameters or URL fragments/
      );
      expect(() => validateAndResolveRedirectUrls("https://intentledger.ai/#section")).toThrow(
        /must not include query parameters or URL fragments/
      );
      expect(() => validateAndResolveRedirectUrls("http://localhost:3000?debug=true")).toThrow(
        /must not include query parameters or URL fragments/
      );
    });

    it("rejects insecure HTTP URLs outside localhost development", () => {
      expect(() => validateAndResolveRedirectUrls("http://intentledger-ai.vercel.app")).toThrow(
        /must use HTTPS protocol outside localhost development/
      );
      expect(() => validateAndResolveRedirectUrls("http://insecure-domain.com")).toThrow(
        /must use HTTPS protocol outside localhost development/
      );
      expect(() => validateAndResolveRedirectUrls("http://192.168.1.50:3000")).toThrow(
        /must use HTTPS protocol outside localhost development/
      );
    });

    it("permits HTTP for local development hostnames (localhost, 127.0.0.1, ::1, *.localhost)", () => {
      const localhostRes = validateAndResolveRedirectUrls("http://localhost:3000");
      expect(localhostRes.origin).toBe("http://localhost:3000");
      expect(localhostRes.returnUrl).toBe("http://localhost:3000/app/transactions?status=approved");
      expect(localhostRes.cancelUrl).toBe("http://localhost:3000/app/authorization?status=cancelled");

      const ipRes = validateAndResolveRedirectUrls("http://127.0.0.1:3000");
      expect(ipRes.origin).toBe("http://127.0.0.1:3000");
      expect(ipRes.returnUrl).toBe("http://127.0.0.1:3000/app/transactions?status=approved");

      const subDomainRes = validateAndResolveRedirectUrls("http://app.localhost:8080");
      expect(subDomainRes.origin).toBe("http://app.localhost:8080");
      expect(subDomainRes.returnUrl).toBe("http://app.localhost:8080/app/transactions?status=approved");
    });

    it("resolves valid HTTPS production origin and deterministic return/cancel URLs", () => {
      const prodRes = validateAndResolveRedirectUrls("https://intentledger-ai.vercel.app");
      expect(prodRes.origin).toBe("https://intentledger-ai.vercel.app");
      expect(prodRes.returnUrl).toBe(
        "https://intentledger-ai.vercel.app/app/transactions?status=approved"
      );
      expect(prodRes.cancelUrl).toBe(
        "https://intentledger-ai.vercel.app/app/authorization?status=cancelled"
      );
    });

    it("falls back to process.env.APP_BASE_URL when no argument is supplied", () => {
      process.env.APP_BASE_URL = "https://prod.intentledger.ai";
      const res = validateAndResolveRedirectUrls();
      expect(res.origin).toBe("https://prod.intentledger.ai");
      expect(res.returnUrl).toBe("https://prod.intentledger.ai/app/transactions?status=approved");
      expect(res.cancelUrl).toBe("https://prod.intentledger.ai/app/authorization?status=cancelled");
    });
  });

  describe("CreateOrderSchema parameter isolation", () => {
    it("accepts valid approvalId and ignores client-provided returnUrl/cancelUrl", () => {
      const maliciousPayload = {
        approvalId: "app_valid_12345",
        returnUrl: "https://attacker.evil.com/phish",
        cancelUrl: "https://attacker.evil.com/cancel",
        redirectUrl: "https://attacker.evil.com/redirect",
      };

      const parsed = CreateOrderSchema.parse(maliciousPayload);
      expect(parsed).toEqual({ approvalId: "app_valid_12345" });
      expect((parsed as any).returnUrl).toBeUndefined();
      expect((parsed as any).cancelUrl).toBeUndefined();
    });

    it("rejects payloads missing approvalId", () => {
      expect(() => CreateOrderSchema.parse({})).toThrow();
      expect(() => CreateOrderSchema.parse({ approvalId: "" })).toThrow();
    });
  });
});
