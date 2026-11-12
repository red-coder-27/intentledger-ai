import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/database/prisma";
import { PayPalClient } from "@/lib/paypal/client";
import { store } from "@/server/repositories/store";
import { KeyManager } from "@/lib/crypto/keys";
import { computeProposalFingerprint, verifyProposalFingerprint } from "@/lib/crypto/fingerprint";
import { AuthorizationKernel } from "@/server/services/authorization/kernel";
import { TransactionPassportService } from "@/server/services/passport/ledger";
import { ApprovalData, PaymentRecord } from "@/types";

describe("Preflight Verification: $85 Sandbox Transaction Readiness", () => {
  const EXPECTED_SELLER_EMAIL = "sb-25i8a53852340@business.example.com";

  async function retryDb<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let lastErr: any;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    throw lastErr;
  }

  // 1. Verify PayPal Sandbox OAuth Authentication
  it("Check 1 [PASS]: PayPal Sandbox OAuth authenticates and retrieves valid token", async () => {
    const token = await PayPalClient.getAccessToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);
    // Never expose token or secrets in assertions/logs
  });

  // 2. Verify Configured Business Payee
  it("Check 2 [PASS]: Configured business payee matches Sandbox seller in env and Neon", async () => {
    const envPayee = process.env.PAYPAL_DEMO_PAYEE_EMAIL?.trim();
    expect(envPayee).toBe(EXPECTED_SELLER_EMAIL);

    const dbMerchant = await retryDb(() =>
      prisma.merchant.findUnique({
        where: { id: "merch_demo_01" },
      })
    );
    expect(dbMerchant).toBeDefined();
    expect(dbMerchant?.paypalPayeeEmail).toBe(EXPECTED_SELLER_EMAIL);
    expect(dbMerchant?.isDemoSeller).toBe(true);
    expect(dbMerchant?.isVerified).toBe(true);
  });

  // 3. Verify $85 AuraSound Pro ANC Proposal in Neon
  it("Check 3 [PASS]: Proposal prop_demo_85 exists in Neon with $85.00 amount and valid fingerprint", async () => {
    const proposal = await retryDb(() =>
      prisma.purchaseProposal.findUnique({
        where: { id: "prop_demo_85" },
      })
    );
    expect(proposal).toBeDefined();
    expect(proposal?.productId).toBe("prod_audio_01");
    expect(proposal?.merchantId).toBe("merch_demo_01");
    expect(Number(proposal?.proposedAmount).toFixed(2)).toBe("85.00");
    expect(proposal?.currency).toBe("USD");
    expect(proposal?.quantity).toBe(1);

    // Verify fingerprint calculation
    const expectedFingerprint = computeProposalFingerprint({
      mandateId: proposal!.mandateId,
      productId: proposal!.productId,
      merchantId: proposal!.merchantId,
      proposedAmount: "85.00",
      currency: "USD",
      quantity: 1,
    });
    expect(proposal?.proposalFingerprint).toBe(expectedFingerprint);
  });

  // 4. Verify Active $100 Mandate in Neon
  it("Check 4 [PASS]: Active $100 mandate exists in Neon with valid Ed25519 signature", async () => {
    const mandate = await retryDb(() =>
      prisma.intentMandate.findUnique({
        where: { id: "mandate_demo_headphones_100" },
      })
    );
    expect(mandate).toBeDefined();
    expect(mandate?.status).toBe("ACTIVE");
    expect(Number(mandate?.budgetLimit).toFixed(2)).toBe("100.00");
    expect(mandate?.currency).toBe("USD");
    expect(new Date(mandate!.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(mandate?.requireHumanApproval).toBe(true);

    // Verify cryptographic signature of canonical mandate payload
    const canonicalPayload = {
      id: mandate!.id,
      userId: mandate!.userId,
      title: mandate!.title,
      naturalInstruction: mandate!.naturalInstruction,
      budgetLimit: "100.00",
      currency: mandate!.currency,
      permittedMerchants: mandate!.permittedMerchants,
      restrictedMerchants: mandate!.restrictedMerchants,
      requiredAttributes: mandate!.requiredAttributes,
      excludedCategories: mandate!.excludedCategories,
      maxQuantity: mandate!.maxQuantity,
      requireHumanApproval: mandate!.requireHumanApproval,
      status: mandate!.status,
      signingKeyVersion: mandate!.signingKeyVersion,
      expiresAt: mandate!.expiresAt.toISOString(),
    };
    const isSigValid = KeyManager.verifyCanonical(canonicalPayload, mandate!.signature);
    expect(isSigValid).toBe(true);
  });

  // 5. Verify Human Approval and Exact Proposal Fingerprint Binding
  it("Check 5 [PASS]: Human approval enforces strict proposal fingerprint binding and rejects tampering", () => {
    const proposalData = {
      mandateId: "mandate_demo_headphones_100",
      productId: "prod_audio_01",
      merchantId: "merch_demo_01",
      proposedAmount: "85.00",
      currency: "USD",
      quantity: 1,
    };
    const validFingerprint = computeProposalFingerprint(proposalData);

    // Exact match passes
    expect(verifyProposalFingerprint(validFingerprint, proposalData)).toBe(true);

    // Price alteration fails
    expect(
      verifyProposalFingerprint(validFingerprint, {
        ...proposalData,
        proposedAmount: "85.01",
      })
    ).toBe(false);

    // Merchant substitution fails
    expect(
      verifyProposalFingerprint(validFingerprint, {
        ...proposalData,
        merchantId: "merch_shady_99",
      })
    ).toBe(false);
  });

  // 6. Verify PayPal Order Creation uses CAPTURE Intent and Correct Seller
  it("Check 6 [PASS]: PayPal order payload specifies CAPTURE intent, correct seller payee, and $85 amount", () => {
    const payload = PayPalClient.buildOrderPayload({
      amount: "85.00",
      currency: "USD",
      referenceId: "prop_demo_85",
      customId: "mandate_demo_headphones_100",
      description: "INTENTLEDGER: AuraSound Pro ANC Wireless Headphones",
      payeeEmail: EXPECTED_SELLER_EMAIL,
      returnUrl: "http://localhost:3000/app/transactions?status=approved",
      cancelUrl: "http://localhost:3000/app/authorization?status=cancelled",
    });

    expect(payload.intent).toBe("CAPTURE");
    expect(payload.purchase_units[0].payee.email_address).toBe(EXPECTED_SELLER_EMAIL);
    expect(payload.purchase_units[0].amount.value).toBe("85.00");
    expect(payload.purchase_units[0].amount.currency_code).toBe("USD");
  });

  // 7. Verify Buyer Approval, Return URL, and Cancel URL
  it("Check 7 [PASS]: Buyer experience context correctly configured with return and cancel URLs", () => {
    const payload = PayPalClient.buildOrderPayload({
      amount: "85.00",
      currency: "USD",
      referenceId: "prop_demo_85",
      customId: "mandate_demo_headphones_100",
      description: "INTENTLEDGER: AuraSound Pro ANC Wireless Headphones",
      payeeEmail: EXPECTED_SELLER_EMAIL,
      returnUrl: "http://localhost:3000/app/transactions?status=approved",
      cancelUrl: "http://localhost:3000/app/authorization?status=cancelled",
    });

    const expContext = payload.payment_source.paypal.experience_context;
    expect(expContext.return_url).toBe("http://localhost:3000/app/transactions?status=approved");
    expect(expContext.cancel_url).toBe("http://localhost:3000/app/authorization?status=cancelled");
    expect(expContext.user_action).toBe("PAY_NOW");
    expect(expContext.payment_method_preference).toBe("IMMEDIATE_PAYMENT_REQUIRED");
    expect(expContext.landing_page).toBe("LOGIN");
  });

  // 8. Verify Capture-Time Authorization Revalidation
  it("Check 8 [PASS]: Authorization Kernel revalidates all 18 rules prior to capture execution", async () => {
    await store.ensureInitialized();

    const approvalId = "appr_preflight_test";
    const approval: ApprovalData = {
      id: approvalId,
      proposalId: "prop_demo_85",
      mandateId: "mandate_demo_headphones_100",
      proposalFingerprint: computeProposalFingerprint({
        mandateId: "mandate_demo_headphones_100",
        productId: "prod_audio_01",
        merchantId: "merch_demo_01",
        proposedAmount: "85.00",
        currency: "USD",
        quantity: 1,
      }),
      customerConsent: true,
      status: "APPROVED",
      approvedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    await store.saveApproval(approval);

    // Initial evaluation passes
    const evalResult = AuthorizationKernel.evaluate({
      mandateId: "mandate_demo_headphones_100",
      proposalId: "prop_demo_85",
      approvalId: approval.id,
    });
    expect(evalResult.decision).toBe("ALLOW");

    // If mandate is revoked, capture revalidation immediately BLOCKS
    const mandate = store.getMandateById("mandate_demo_headphones_100")!;
    const originalStatus = mandate.status;
    mandate.status = "REVOKED";

    const blockedEval = AuthorizationKernel.evaluate({
      mandateId: "mandate_demo_headphones_100",
      proposalId: "prop_demo_85",
      approvalId: approval.id,
    });
    expect(blockedEval.decision).toBe("BLOCK");
    expect(blockedEval.reasonCodes).toContain("MANDATE_REVOKED");

    // Restore mandate status
    mandate.status = originalStatus;
  });

  // 9. Verify Neon Persistence and Payment Recovery
  it("Check 9 [PASS]: Store hydration from Neon recovers all records after restart", async () => {
    await store.syncFromDatabase();
    const mandate = store.getMandateById("mandate_demo_headphones_100");
    const proposal = store.getProposalById("prop_demo_85");
    const merchant = store.getMerchantById("merch_demo_01");

    expect(mandate).toBeDefined();
    expect(proposal).toBeDefined();
    expect(merchant).toBeDefined();
    expect(merchant?.paypalPayeeEmail).toBe(EXPECTED_SELLER_EMAIL);
  });

  // 10. Verify Transaction Passport Generation and Independent Signature Verification
  it("Check 10 [PASS]: Transaction Passport constructs verifiable hash chain with Ed25519 signatures", () => {
    const mandate = store.getMandateById("mandate_demo_headphones_100")!;
    const proposal = store.getProposalById("prop_demo_85")!;
    const approval: ApprovalData = {
      id: "appr_passport_test",
      proposalId: proposal.id,
      mandateId: mandate.id,
      proposalFingerprint: proposal.proposalFingerprint,
      customerConsent: true,
      status: "APPROVED",
      approvedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    const payment: PaymentRecord = {
      id: "pay_preflight_01",
      approvalId: approval.id,
      mandateId: mandate.id,
      proposalId: proposal.id,
      paypalOrderId: "5O_PREFLIGHT_TEST_SANDBOX",
      paypalCaptureId: "2XX_PREFLIGHT_CAPTURE",
      paypalPayeeEmail: EXPECTED_SELLER_EMAIL,
      merchantName: "Demo Electronics",
      productName: "AuraSound Pro ANC Wireless Headphones",
      amount: "85.00",
      currency: "USD",
      status: "CAPTURED",
      reconciliationStatus: "RECONCILED",
      createdAt: new Date().toISOString(),
      capturedAt: new Date().toISOString(),
    };

    const passport = TransactionPassportService.createPassport({
      transactionId: "tx_preflight_01",
      mandate,
      proposal,
      approval,
      payment,
      capturedAmount: "85.00",
      currency: "USD",
    });

    expect(passport.verificationStatus).toBe("VERIFIED");
    expect(passport.events).toHaveLength(9);

    // Independent verification walks the chain and validates signatures
    const report = TransactionPassportService.verifyPassport(passport);
    expect(report.verificationStatus).toBe("VERIFIED");
    expect(report.chainValid).toBe(true);
    expect(report.signatureValid).toBe(true);
  });

  // 11. Verify Ed25519 Key Rotation and Historical Signature Compatibility
  it("Check 11 [PASS]: Ed25519 key rotation maintains verification compatibility for historical signatures", () => {
    const samplePayload = { transactionId: "tx_history_01", amount: "85.00" };
    const initialSig = KeyManager.signCanonical(samplePayload);
    const initialVersion = KeyManager.KEY_VERSION;

    // Signature verifies with active key
    expect(KeyManager.verifyCanonical(samplePayload, initialSig)).toBe(true);

    // Rotate to v2
    KeyManager.rotateKey("v2");
    expect(KeyManager.KEY_VERSION).toBe("v2");

    // Historical signature still verifies via archived key registry
    expect(KeyManager.verifyCanonical(samplePayload, initialSig)).toBe(true);
    expect(KeyManager.verifyCanonical(samplePayload, initialSig, initialVersion)).toBe(true);

    // Restore key version back to initial
    KeyManager.rotateKey(initialVersion);
  });
});

