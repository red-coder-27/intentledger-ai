import { store } from "@/server/repositories/store";
import { TransactionPassportData } from "@/types";

export interface EvidenceItem {
  id: string;
  name: string;
  category: "INTENT" | "AUTHORIZATION" | "PAYMENT" | "VERIFICATION";
  status: "PRESENT" | "MISSING" | "TAMPERED" | "CONTRADICTORY";
  sourceRecord: string;
  timestamp?: string;
  fingerprintOrId?: string;
  details: string;
}

export interface CompletenessAssessment {
  transactionId: string;
  completenessPercentage: number;
  totalRequiredRecords: number;
  presentRecordsCount: number;
  missingRecordsCount: number;
  evidenceItems: EvidenceItem[];
  disputeReadinessScore: "DISPUTE_READY" | "PARTIAL_EVIDENCE" | "INSUFFICIENT_EVIDENCE";
  executiveSummary: string;
  assessedAt: string;
}

export class EvidenceAssessor {
  /**
   * Assesses transaction evidence completeness against a full dispute reconstruction checklist.
   */
  public static assessTransaction(passport: TransactionPassportData): CompletenessAssessment {
    const items: EvidenceItem[] = [];

    const mandate = store.getMandateById(passport.mandateId);
    const proposal = store.getProposalById(passport.proposalId);
    const approval = store.getApprovalById(passport.approvalId);
    const payment = store.getPaymentById(passport.paymentId);

    // 1. Original Mandate Record
    if (mandate) {
      items.push({
        id: "ev_mandate_01",
        name: "Signed Intent Mandate",
        category: "INTENT",
        status: "PRESENT",
        sourceRecord: `IntentMandate (${mandate.id})`,
        timestamp: mandate.createdAt,
        fingerprintOrId: mandate.fingerprint,
        details: `Customer authorized up to $${mandate.budgetLimit} ${mandate.currency} with title "${mandate.title}".`,
      });
    } else {
      items.push({
        id: "ev_mandate_01",
        name: "Signed Intent Mandate",
        category: "INTENT",
        status: "MISSING",
        sourceRecord: "IntentMandate",
        details: "Original customer mandate record not found in system.",
      });
    }

    // 2. Mandate Digital Signature
    if (mandate?.signature) {
      items.push({
        id: "ev_sig_02",
        name: "Ed25519 Mandate Signature",
        category: "INTENT",
        status: "PRESENT",
        sourceRecord: "KeyManager Ed25519 Signature",
        timestamp: mandate.createdAt,
        fingerprintOrId: mandate.signature.slice(0, 32) + "...",
        details: `Cryptographically signed with key version ${mandate.signingKeyVersion}.`,
      });
    } else {
      items.push({
        id: "ev_sig_02",
        name: "Ed25519 Mandate Signature",
        category: "INTENT",
        status: "MISSING",
        sourceRecord: "KeyManager",
        details: "Cryptographic signature missing on mandate.",
      });
    }

    // 3. Purchase Proposal
    if (proposal) {
      items.push({
        id: "ev_prop_03",
        name: "Catalogue Purchase Proposal",
        category: "AUTHORIZATION",
        status: "PRESENT",
        sourceRecord: `PurchaseProposal (${proposal.id})`,
        timestamp: proposal.createdAt,
        fingerprintOrId: proposal.proposalFingerprint.slice(0, 32) + "...",
        details: `Proposed "${proposal.productName}" for $${proposal.proposedAmount} from ${proposal.merchantName}.`,
      });
    } else {
      items.push({
        id: "ev_prop_03",
        name: "Catalogue Purchase Proposal",
        category: "AUTHORIZATION",
        status: "MISSING",
        sourceRecord: "PurchaseProposal",
        details: "AI / catalogue proposal record not found.",
      });
    }

    // 4. Human Approval
    if (approval) {
      items.push({
        id: "ev_appr_04",
        name: "Proposal-Bound Human Approval",
        category: "AUTHORIZATION",
        status: "PRESENT",
        sourceRecord: `Approval (${approval.id})`,
        timestamp: approval.approvedAt,
        fingerprintOrId: approval.proposalFingerprint.slice(0, 32) + "...",
        details: `Customer explicitly gave consent for proposal fingerprint ${approval.proposalFingerprint.slice(0, 16)}...`,
      });
    } else {
      items.push({
        id: "ev_appr_04",
        name: "Proposal-Bound Human Approval",
        category: "AUTHORIZATION",
        status: "MISSING",
        sourceRecord: "Approval",
        details: "No explicit human approval token registered for this transaction.",
      });
    }

    // 5. PayPal Order Reference
    if (payment?.paypalOrderId) {
      items.push({
        id: "ev_order_05",
        name: "PayPal Sandbox Order",
        category: "PAYMENT",
        status: "PRESENT",
        sourceRecord: `PayPal API (${payment.paypalOrderId})`,
        timestamp: payment.createdAt,
        fingerprintOrId: payment.paypalOrderId,
        details: `PayPal Sandbox order created with amount $${payment.amount} ${payment.currency}.`,
      });
    } else {
      items.push({
        id: "ev_order_05",
        name: "PayPal Sandbox Order",
        category: "PAYMENT",
        status: "MISSING",
        sourceRecord: "PayPal API",
        details: "No PayPal Order ID recorded.",
      });
    }

    // 6. PayPal Capture Reference
    if (payment?.paypalCaptureId) {
      items.push({
        id: "ev_cap_06",
        name: "PayPal Payment Capture",
        category: "PAYMENT",
        status: "PRESENT",
        sourceRecord: `PayPal Capture API (${payment.paypalCaptureId})`,
        timestamp: payment.capturedAt,
        fingerprintOrId: payment.paypalCaptureId,
        details: `Capture completed successfully by PayPal Sandbox engine.`,
      });
    } else {
      items.push({
        id: "ev_cap_06",
        name: "PayPal Payment Capture",
        category: "PAYMENT",
        status: "MISSING",
        sourceRecord: "PayPal Capture API",
        details: "No payment capture reference present.",
      });
    }

    // 7. Cryptographic Hash Chain Passport
    if (passport.verificationStatus === "VERIFIED") {
      items.push({
        id: "ev_chain_07",
        name: "Tamper-Evident Hash Chain",
        category: "VERIFICATION",
        status: "PRESENT",
        sourceRecord: `TransactionPassport (${passport.id})`,
        timestamp: passport.issuedAt,
        fingerprintOrId: passport.finalHash.slice(0, 32) + "...",
        details: `All ${passport.totalEvents} sequential events cryptographically linked and verified with zero mutations.`,
      });
    } else {
      items.push({
        id: "ev_chain_07",
        name: "Tamper-Evident Hash Chain",
        category: "VERIFICATION",
        status: "TAMPERED",
        sourceRecord: `TransactionPassport (${passport.id})`,
        timestamp: passport.issuedAt,
        details: "Cryptographic hash chain verification failed or contains mutations.",
      });
    }

    const presentCount = items.filter((i) => i.status === "PRESENT").length;
    const completenessPercentage = Math.round((presentCount / items.length) * 100);

    let disputeReadinessScore: CompletenessAssessment["disputeReadinessScore"] = "INSUFFICIENT_EVIDENCE";
    if (completenessPercentage === 100) {
      disputeReadinessScore = "DISPUTE_READY";
    } else if (completenessPercentage >= 70) {
      disputeReadinessScore = "PARTIAL_EVIDENCE";
    }

    const summary =
      disputeReadinessScore === "DISPUTE_READY"
        ? `Transaction ${passport.transactionId} possesses 100% complete evidence across all 7 required audit stages: human intent, Ed25519 signature, proposal, approval token, PayPal order, capture, and verified cryptographic hash chain. Dispute defense readiness is optimal.`
        : `Transaction ${passport.transactionId} has ${presentCount} of ${items.length} required evidence records present (${completenessPercentage}%). Additional evidence records are recommended before submitting dispute rebuttals.`;

    return {
      transactionId: passport.transactionId,
      completenessPercentage,
      totalRequiredRecords: items.length,
      presentRecordsCount: presentCount,
      missingRecordsCount: items.length - presentCount,
      evidenceItems: items,
      disputeReadinessScore,
      executiveSummary: summary,
      assessedAt: new Date().toISOString(),
    };
  }
}

