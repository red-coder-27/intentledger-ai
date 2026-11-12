import { describe, it, expect } from "vitest";
import { TransactionPassportService } from "@/server/services/passport/ledger";
import { store } from "@/server/repositories/store";
import { PaymentRecord, TransactionPassportData } from "@/types";

describe("Transaction Passport & Cryptographic Ledger Tests", () => {
  const mandate = store.getMandateById("mandate_demo_headphones_100")!;
  const proposal = store.getProposalById("prop_demo_85")!;
  const approval = {
    id: "appr_test_pass_85",
    proposalId: proposal.id,
    mandateId: mandate.id,
    proposalFingerprint: proposal.proposalFingerprint,
    customerConsent: true,
    status: "APPROVED" as const,
    approvedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };

  const payment: PaymentRecord = {
    id: "pay_test_01",
    approvalId: approval.id,
    mandateId: mandate.id,
    proposalId: proposal.id,
    paypalOrderId: "5O9876543210SANDBOX",
    paypalCaptureId: "2XX123456789CAPTURE",
    paypalPayeeEmail: "sb-25i8a53852340@business.example.com",
    merchantName: "Demo Electronics",
    productName: "AuraSound Pro ANC Wireless Headphones",
    amount: "85.00",
    currency: "USD",
    status: "CAPTURED",
    reconciliationStatus: "RECONCILED",
    createdAt: new Date().toISOString(),
    capturedAt: new Date().toISOString(),
  };

  it("Scenario 1: Constructs verifiable hash chain and verifies cleanly", () => {
    const passport = TransactionPassportService.createPassport({
      transactionId: "tx_sc1_valid_01",
      mandate,
      proposal,
      approval,
      payment,
      capturedAmount: "85.00",
      currency: "USD",
    });

    expect(passport.verificationStatus).toBe("VERIFIED");
    expect(passport.events.length).toBe(9);
    expect(passport.finalHash).toHaveLength(64);

    // Verify independently
    const report = TransactionPassportService.verifyPassport(passport);
    expect(report.verificationStatus).toBe("VERIFIED");
    expect(report.chainValid).toBe(true);
    expect(report.signatureValid).toBe(true);
    expect(report.reconciliationValid).toBe(true);
  });

  it("Scenario 6: Flags financial variance when captured amount differs from approved", () => {
    // Approved: $85.00, Captured: $90.00
    const passport = TransactionPassportService.createPassport({
      transactionId: "tx_sc6_mismatch_02",
      mandate,
      proposal,
      approval,
      payment: { ...payment, amount: "90.00" },
      capturedAmount: "90.00", // Variance!
      currency: "USD",
    });

    // Passport must flag INVALID due to reconciliation failure
    expect(passport.verificationStatus).toBe("INVALID");

    const reconcileEvent = passport.events.find((e) => e.eventType === "FINANCIAL_RECONCILED")!;
    expect(reconcileEvent.canonicalPayload).toContain('"reconciliationStatus":"EXCEPTION"');
    expect(reconcileEvent.canonicalPayload).toContain('"variance":"5.00"');
  });

  it("Scenario 7: Detects cryptographic audit tampering and pinpoints broken sequence", () => {
    const passport = TransactionPassportService.createPassport({
      transactionId: "tx_sc7_tamper_03",
      mandate,
      proposal,
      approval,
      payment,
      capturedAmount: "85.00",
      currency: "USD",
    });

    // Deep clone passport to simulate database mutation
    const tamperedPassport: TransactionPassportData = JSON.parse(JSON.stringify(passport));

    // Maliciously modify Event 4 (AUTHORIZATION_EVALUATED) payload
    const eventToTamper = tamperedPassport.events[3]; // sequenceNumber 4
    eventToTamper.canonicalPayload = eventToTamper.canonicalPayload.replace('"decision":"ALLOW"', '"decision":"TAMPERED"');

    const report = TransactionPassportService.verifyPassport(tamperedPassport);

    expect(report.verificationStatus).toBe("INVALID");
    expect(report.chainValid).toBe(false);
    expect(report.brokenAtSequence).toBe(4);
    expect(report.errorDetail).toContain("Payload mutation detected at sequence 4");
  });

  it("Scenario 8: Deduplicates webhook events to maintain idempotency", () => {
    const webhookEventId = "WH-EVENT-998877";

    expect(store.hasProcessedWebhook(webhookEventId)).toBe(false);
    store.markWebhookProcessed(webhookEventId);
    expect(store.hasProcessedWebhook(webhookEventId)).toBe(true);

    // Second processing attempt should be recognized as duplicate
    const isDuplicate = store.hasProcessedWebhook(webhookEventId);
    expect(isDuplicate).toBe(true);
  });
});

