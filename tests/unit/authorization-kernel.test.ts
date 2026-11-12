import { describe, it, expect, beforeEach } from "vitest";
import { AuthorizationKernel } from "@/server/services/authorization/kernel";
import { store } from "@/server/repositories/store";
import { computeProposalFingerprint } from "@/lib/crypto/fingerprint";
import { ApprovalData, PurchaseProposalData } from "@/types";

describe("Deterministic Authorization Kernel — Policy Enforcement Tests", () => {
  const mandateId = "mandate_demo_headphones_100"; // Budget: $100.00, Merchant: Demo Electronics

  it("Scenario 1: Evaluates valid proposal ($85.00) as REQUIRE_APPROVAL before human consent", () => {
    const result = AuthorizationKernel.evaluate({
      mandateId,
      proposalId: "prop_demo_85",
    });

    expect(result.decision).toBe("REQUIRE_APPROVAL");
    expect(result.reasonCodes).toContain("APPROVAL_REQUIRED");
    expect(result.evaluatedAmount).toBe("85.00");
    expect(result.maximumAmount).toBe("100.00");
  });

  it("Scenario 1 (continued): Evaluates valid proposal as ALLOW when valid human approval is provided", () => {
    const proposal = store.getProposalById("prop_demo_85")!;
    const approval: ApprovalData = {
      id: "appr_valid_85",
      proposalId: proposal.id,
      mandateId: mandateId,
      proposalFingerprint: proposal.proposalFingerprint,
      customerConsent: true,
      status: "APPROVED",
      approvedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    store.saveApproval(approval);

    const result = AuthorizationKernel.evaluate({
      mandateId,
      proposalId: proposal.id,
      approvalId: approval.id,
    });

    expect(result.decision).toBe("ALLOW");
    expect(result.reasonCodes).toContain("ALL_POLICIES_SATISFIED");
  });

  it("Scenario 2: Deterministically BLOCKS purchase when proposed amount exceeds budget limit", () => {
    // Mandate budget: $100.00, Proposed: $160.00
    const result = AuthorizationKernel.evaluate({
      mandateId,
      proposalId: "prop_demo_160",
    });

    expect(result.decision).toBe("BLOCK");
    expect(result.reasonCodes).toContain("BUDGET_EXCEEDED");
    expect(Number(result.evaluatedAmount)).toBeGreaterThan(Number(result.maximumAmount));
  });

  it("Scenario 3: Deterministically BLOCKS purchase when merchant is unauthorized or restricted", () => {
    const rogueProposal: PurchaseProposalData = {
      id: "prop_unauthorized_merchant",
      mandateId,
      productId: "prod_audio_04", // ShadyPods from ShadyDeals LLC
      productName: "ShadyPods Refurbished Wireless Knockoffs",
      merchantId: "merch_shady_99",
      merchantName: "ShadyDeals LLC",
      proposedAmount: "19.99",
      currency: "USD",
      quantity: 1,
      proposalFingerprint: "fingerprint_123",
      reasoningSummary: "Suspiciously cheap option.",
      constraintsSatisfied: [],
      constraintsViolated: ["MERCHANT_RESTRICTED"],
      requiresHumanApproval: true,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    store.saveProposal(rogueProposal);

    const result = AuthorizationKernel.evaluate({
      mandateId,
      proposalId: rogueProposal.id,
    });

    expect(result.decision).toBe("BLOCK");
    expect(result.reasonCodes).toContain("MERCHANT_NOT_ALLOWED");
    expect(result.reasonCodes).toContain("MERCHANT_RESTRICTED");
  });

  it("Scenario 4: BLOCKS purchase if proposal fingerprint was tampered after approval", () => {
    const proposal = store.getProposalById("prop_demo_85")!;
    // Create an approval with a fingerprint for $85.00
    const approval: ApprovalData = {
      id: "appr_tampered_test",
      proposalId: proposal.id,
      mandateId: mandateId,
      proposalFingerprint: proposal.proposalFingerprint, // Fingerprint for $85.00
      customerConsent: true,
      status: "APPROVED",
      approvedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    store.saveApproval(approval);

    // Tamper the proposal in store to $95.00 without updating approval
    const tamperedProposal: PurchaseProposalData = {
      ...proposal,
      id: "prop_tampered_price",
      proposedAmount: "95.00",
      proposalFingerprint: computeProposalFingerprint({
        mandateId,
        productId: proposal.productId,
        merchantId: proposal.merchantId,
        proposedAmount: "95.00",
        currency: "USD",
        quantity: 1,
      }),
    };
    store.saveProposal(tamperedProposal);

    // The approval still carries the old fingerprint ($85.00)
    const tamperedApproval: ApprovalData = {
      ...approval,
      id: "appr_stale_fingerprint",
      proposalId: tamperedProposal.id,
      // Proposal fingerprint does NOT match $95.00
      proposalFingerprint: proposal.proposalFingerprint,
    };
    store.saveApproval(tamperedApproval);

    const result = AuthorizationKernel.evaluate({
      mandateId,
      proposalId: tamperedProposal.id,
      approvalId: tamperedApproval.id,
    });

    expect(result.decision).toBe("BLOCK");
    expect(result.reasonCodes).toContain("PROPOSAL_FINGERPRINT_MISMATCH");
  });

  it("Scenario 5: Deterministically BLOCKS purchase when mandate is expired", () => {
    const expiredMandateId = "mandate_demo_expired_02";
    const result = AuthorizationKernel.evaluate({
      mandateId: expiredMandateId,
      proposalId: "prop_demo_85",
    });

    expect(result.decision).toBe("BLOCK");
    expect(result.reasonCodes).toContain("MANDATE_EXPIRED");
  });

  it("Blocks purchase when single-use approval has already been consumed", () => {
    const proposal = store.getProposalById("prop_demo_85")!;
    const consumedApproval: ApprovalData = {
      id: "appr_already_used",
      proposalId: proposal.id,
      mandateId: mandateId,
      proposalFingerprint: proposal.proposalFingerprint,
      customerConsent: true,
      status: "USED",
      approvedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      usedAt: new Date().toISOString(),
    };
    store.saveApproval(consumedApproval);

    const result = AuthorizationKernel.evaluate({
      mandateId,
      proposalId: proposal.id,
      approvalId: consumedApproval.id,
    });

    expect(result.decision).toBe("BLOCK");
    expect(result.reasonCodes).toContain("APPROVAL_ALREADY_USED");
  });
});

