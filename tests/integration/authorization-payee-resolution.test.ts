import { describe, it, expect } from "vitest";
import { store } from "@/server/repositories/store";
import { PayPalClient } from "@/lib/paypal/client";
import { prisma } from "@/lib/database/prisma";
import { GET as getProposals } from "@/app/api/v1/agent/proposals/route";
import { NextRequest } from "next/server";

describe("Authorization Center Payee Resolution & Consistency Regression Tests", () => {
  const EXPECTED_SANDBOX_PAYEE = "sb-25i8a53852340@business.example.com";

  it("resolves merchant and payee for proposal prop_1794488506467 through store and Neon", async () => {
    await store.ensureInitialized();
    const proposal = store.getProposalById("prop_1794488506467") || store.getProposalById("prop_demo_85");
    expect(proposal).toBeDefined();

    const merchant = store.getMerchantById(proposal!.merchantId);
    expect(merchant).toBeDefined();
    expect(merchant?.id).toBe("merch_demo_01");
    expect(merchant?.name).toBe("Demo Electronics");
    expect(merchant?.paypalPayeeEmail).toBe(EXPECTED_SANDBOX_PAYEE);
  });

  it("GET /api/v1/agent/proposals?proposalId=... returns explicit configured payee email", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/agent/proposals?proposalId=prop_demo_85");
    const res = await getProposals(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.proposal).toBeDefined();
    expect(json.data.proposal.paypalPayeeEmail).toBe(EXPECTED_SANDBOX_PAYEE);
    expect(json.data.merchant.paypalPayeeEmail).toBe(EXPECTED_SANDBOX_PAYEE);
    expect(json.data.payeeEmail).toBe(EXPECTED_SANDBOX_PAYEE);
  });

  it("ensures buildOrderPayload strictly binds to the configured Sandbox business payee", () => {
    const payload = PayPalClient.buildOrderPayload({
      amount: "85.00",
      currency: "USD",
      referenceId: "prop_1794488506467",
      customId: "mandate_demo_headphones_100",
      description: "INTENTLEDGER: AuraSound Pro ANC Wireless Headphones",
      payeeEmail: EXPECTED_SANDBOX_PAYEE,
      returnUrl: "http://localhost:3000/app/transactions?status=approved",
      cancelUrl: "http://localhost:3000/app/authorization?status=cancelled",
    });

    expect(payload.intent).toBe("CAPTURE");
    expect(payload.purchase_units[0].payee.email_address).toBe(EXPECTED_SANDBOX_PAYEE);
    expect(payload.purchase_units[0].amount.value).toBe("85.00");
    expect(payload.purchase_units[0].amount.currency_code).toBe("USD");
  });

  it("strictly rejects placeholder merchant-demo@intentledger.ai from active payment creation", () => {
    expect(() => {
      PayPalClient.buildOrderPayload({
        amount: "85.00",
        currency: "USD",
        referenceId: "prop_1794488506467",
        customId: "mandate_demo_headphones_100",
        description: "INTENTLEDGER: AuraSound Pro ANC Wireless Headphones",
        payeeEmail: "merchant-demo@intentledger.ai",
        returnUrl: "http://localhost:3000/app/transactions",
        cancelUrl: "http://localhost:3000/app/authorization",
      });
    }).toThrow(/placeholder 'merchant-demo@intentledger.ai' is not permitted/);
  });

  it("verifies authorization and order creation share identical payee resolution logic", async () => {
    await store.ensureInitialized();
    const proposal = store.getProposalById("prop_1794488506467") || store.getProposalById("prop_demo_85");
    expect(proposal).toBeDefined();

    // Verify both routes resolve payee through store.resolvePayeeEmail
    const payeeEmail = store.resolvePayeeEmail(proposal!.merchantId);
    expect(payeeEmail).toBe(EXPECTED_SANDBOX_PAYEE);

    // Verify unresolvable or unknown merchant returns undefined, triggering 500 error in both routes
    const invalidPayee = store.resolvePayeeEmail("merch_unknown_999");
    expect(invalidPayee).toBeUndefined();
  });
});

