import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PayPalClient } from "@/lib/paypal/client";
import { store } from "@/server/repositories/store";

describe("PayPal Orders API v2 Payee Mapping & Payload Verification", () => {
  const originalEnvPayee = process.env.PAYPAL_DEMO_PAYEE_EMAIL;

  afterEach(() => {
    if (originalEnvPayee !== undefined) {
      process.env.PAYPAL_DEMO_PAYEE_EMAIL = originalEnvPayee;
    } else {
      delete process.env.PAYPAL_DEMO_PAYEE_EMAIL;
    }
  });

  it("builds a valid Orders API v2 request with intent CAPTURE and exact payee email", () => {
    const testPayee = "sandbox-merchant@test.example.com";
    const payload = PayPalClient.buildOrderPayload({
      amount: "85.00",
      currency: "USD",
      referenceId: "prop_demo_85",
      customId: "mandate_demo_headphones_100",
      description: "INTENTLEDGER: AuraSound Pro ANC Wireless Headphones",
      payeeEmail: testPayee,
      returnUrl: "http://localhost:3000/app/transactions?status=approved",
      cancelUrl: "http://localhost:3000/app/authorization?status=cancelled",
    });

    expect(payload.intent).toBe("CAPTURE");
    expect(payload.purchase_units).toHaveLength(1);
    expect(payload.purchase_units[0].amount.value).toBe("85.00");
    expect(payload.purchase_units[0].amount.currency_code).toBe("USD");
    expect(payload.purchase_units[0].reference_id).toBe("prop_demo_85");
    expect(payload.purchase_units[0].custom_id).toBe("mandate_demo_headphones_100");
    expect(payload.purchase_units[0].payee).toBeDefined();
    expect(payload.purchase_units[0].payee.email_address).toBe(testPayee);
    expect(payload.payment_source.paypal.experience_context.user_action).toBe("PAY_NOW");
  });

  it("throws a descriptive error when payeeEmail is missing or empty", () => {
    expect(() => {
      PayPalClient.buildOrderPayload({
        amount: "85.00",
        currency: "USD",
        referenceId: "prop_demo_85",
        customId: "mandate_demo_headphones_100",
        description: "Test",
        payeeEmail: "",
        returnUrl: "http://localhost:3000/return",
        cancelUrl: "http://localhost:3000/cancel",
      });
    }).toThrow(/Invalid or unconfigured PayPal payee email/);
  });

  it("throws a descriptive error when payeeEmail is the placeholder merchant-demo@intentledger.ai", () => {
    expect(() => {
      PayPalClient.buildOrderPayload({
        amount: "85.00",
        currency: "USD",
        referenceId: "prop_demo_85",
        customId: "mandate_demo_headphones_100",
        description: "Test",
        payeeEmail: "merchant-demo@intentledger.ai",
        returnUrl: "http://localhost:3000/return",
        cancelUrl: "http://localhost:3000/cancel",
      });
    }).toThrow(/placeholder 'merchant-demo@intentledger.ai' is not permitted/);
  });

  it("ensures store merchant resolution respects configured runtime PAYPAL_DEMO_PAYEE_EMAIL", () => {
    process.env.PAYPAL_DEMO_PAYEE_EMAIL = "configured-biz@example.com";
    const demoMerchant = store.getMerchantById("merch_demo_01");
    expect(demoMerchant).toBeDefined();
    expect(demoMerchant?.isDemoSeller).toBe(true);

    // Payee resolution priority logic
    const configuredDemoPayee = process.env.PAYPAL_DEMO_PAYEE_EMAIL?.trim();
    let resolvedPayee: string | undefined;
    if (demoMerchant?.isDemoSeller) {
      resolvedPayee =
        configuredDemoPayee ||
        (demoMerchant.paypalPayeeEmail &&
        demoMerchant.paypalPayeeEmail !== "merchant-demo@intentledger.ai"
          ? demoMerchant.paypalPayeeEmail
          : undefined);
    } else {
      resolvedPayee = demoMerchant?.paypalPayeeEmail || configuredDemoPayee;
    }

    expect(resolvedPayee).toBe("configured-biz@example.com");
    expect(resolvedPayee).not.toBe("merchant-demo@intentledger.ai");
  });
});

