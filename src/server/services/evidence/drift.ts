import { ApprovalData, IntentMandateData, PaymentRecord, PurchaseProposalData } from "@/types";

export interface DriftIncident {
  type:
    | "AMOUNT_DRIFT"
    | "MERCHANT_DRIFT"
    | "PRODUCT_DRIFT"
    | "QUANTITY_DRIFT"
    | "CURRENCY_DRIFT"
    | "EXPIRED_AUTHORIZATION"
    | "REUSED_APPROVAL"
    | "UNAUTHORIZED_EXECUTION";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  field: string;
  expectedValue: string;
  actualValue: string;
  sourceOfDrift: string;
  explanation: string;
}

export interface DriftAnalysisReport {
  hasDrift: boolean;
  totalIncidents: number;
  incidents: DriftIncident[];
  analyzedAt: string;
}

export class IntentDriftDetector {
  /**
   * Performs deterministic, multi-stage drift detection across the transaction lifecycle.
   * Completely transparent and explainable with zero fabricated "black box" risk scores.
   */
  public static analyzeDrift(params: {
    mandate: IntentMandateData;
    proposal: PurchaseProposalData;
    approval?: ApprovalData;
    payment?: PaymentRecord;
    capturedAmount?: string;
  }): DriftAnalysisReport {
    const incidents: DriftIncident[] = [];
    const { mandate, proposal, approval, payment, capturedAmount } = params;

    // 1. Amount Drift: Mandate vs Proposal
    const proposedNum = Number(proposal.proposedAmount);
    const budgetNum = Number(mandate.budgetLimit);
    if (proposedNum > budgetNum) {
      incidents.push({
        type: "AMOUNT_DRIFT",
        severity: "CRITICAL",
        field: "amount",
        expectedValue: `<= $${mandate.budgetLimit} ${mandate.currency}`,
        actualValue: `$${proposal.proposedAmount} ${proposal.currency}`,
        sourceOfDrift: "AI Agent Proposal vs Customer Mandate Budget",
        explanation: `Proposed purchase amount ($${proposal.proposedAmount}) exceeds customer's signed maximum budget limit ($${mandate.budgetLimit}) by $${(proposedNum - budgetNum).toFixed(2)}.`,
      });
    }

    // 2. Amount Drift: Approved vs Captured
    if (capturedAmount) {
      const capturedNum = Number(capturedAmount);
      if (Math.abs(capturedNum - proposedNum) > 0.001) {
        incidents.push({
          type: "AMOUNT_DRIFT",
          severity: "CRITICAL",
          field: "capturedAmount",
          expectedValue: `$${proposal.proposedAmount}`,
          actualValue: `$${capturedAmount}`,
          sourceOfDrift: "PayPal Payment Capture vs Customer Approved Proposal",
          explanation: `Payment gateway captured $${capturedAmount}, which diverges from the customer-approved amount of $${proposal.proposedAmount}.`,
        });
      }
    }

    // 3. Merchant Drift: Permitted vs Proposed
    if (mandate.permittedMerchants.length > 0) {
      const isPermitted = mandate.permittedMerchants.some(
        (m) => m.toLowerCase() === proposal.merchantName.toLowerCase()
      );
      if (!isPermitted) {
        incidents.push({
          type: "MERCHANT_DRIFT",
          severity: "CRITICAL",
          field: "merchant",
          expectedValue: mandate.permittedMerchants.join(", "),
          actualValue: proposal.merchantName,
          sourceOfDrift: "AI Agent Merchant Selection vs Customer Permitted Merchants",
          explanation: `Proposal selected seller "${proposal.merchantName}", which is not on the customer's permitted merchant allowlist.`,
        });
      }
    }

    // 4. Quantity Drift
    if (proposal.quantity > mandate.maxQuantity) {
      incidents.push({
        type: "QUANTITY_DRIFT",
        severity: "HIGH",
        field: "quantity",
        expectedValue: `<= ${mandate.maxQuantity}`,
        actualValue: `${proposal.quantity}`,
        sourceOfDrift: "Proposal Quantity vs Mandate Limit",
        explanation: `Proposed quantity (${proposal.quantity}) exceeds mandate constraint (${mandate.maxQuantity}).`,
      });
    }

    // 5. Currency Drift
    if (proposal.currency.toUpperCase() !== mandate.currency.toUpperCase()) {
      incidents.push({
        type: "CURRENCY_DRIFT",
        severity: "CRITICAL",
        field: "currency",
        expectedValue: mandate.currency,
        actualValue: proposal.currency,
        sourceOfDrift: "Proposal Currency vs Mandate Currency",
        explanation: `Proposed currency (${proposal.currency}) does not match authorized currency (${mandate.currency}).`,
      });
    }

    // 6. Approval Drift: Reused or Expired
    if (approval) {
      const now = new Date().getTime();
      if (new Date(approval.expiresAt).getTime() <= now) {
        incidents.push({
          type: "EXPIRED_AUTHORIZATION",
          severity: "HIGH",
          field: "approvalExpiry",
          expectedValue: `Before ${approval.expiresAt}`,
          actualValue: new Date().toISOString(),
          sourceOfDrift: "Human Approval Token Expiration",
          explanation: "Transaction execution attempted after human approval window elapsed.",
        });
      }

      if (approval.status === "USED" && payment?.id !== approval.proposalId) {
        incidents.push({
          type: "REUSED_APPROVAL",
          severity: "CRITICAL",
          field: "approvalStatus",
          expectedValue: "SINGLE_USE_ACTIVE",
          actualValue: "USED",
          sourceOfDrift: "Approval Token Reuse Attempt",
          explanation: "Approval token was already consumed by a prior transaction and cannot be replayed.",
        });
      }
    }

    return {
      hasDrift: incidents.length > 0,
      totalIncidents: incidents.length,
      incidents,
      analyzedAt: new Date().toISOString(),
    };
  }
}

