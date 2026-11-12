import {
  ApprovalData,
  AuthorizationDecisionOutcome,
  AuthorizationEvaluationResult,
  AuthorizationReasonCode,
  IntentMandateData,
  PaymentRecord,
  ProductData,
  PurchaseProposalData,
} from "@/types";
import { store } from "@/server/repositories/store";
import { verifyProposalFingerprint } from "@/lib/crypto/fingerprint";

export interface KernelEvaluationInput {
  mandateId: string;
  proposalId: string;
  approvalId?: string;
  paymentId?: string;
}

export class AuthorizationKernel {
  /**
   * Executes the 18 deterministic policy checks.
   * Never delegates policy decisions to an LLM.
   */
  public static evaluate(input: KernelEvaluationInput): AuthorizationEvaluationResult {
    const reasonCodes: AuthorizationReasonCode[] = [];
    const checksDetail: {
      checkName: string;
      passed: boolean;
      reasonCode?: AuthorizationReasonCode;
    }[] = [];

    const mandate = store.getMandateById(input.mandateId);
    const proposal = store.getProposalById(input.proposalId);
    const approval = input.approvalId ? store.getApprovalById(input.approvalId) : undefined;
    const payment = input.paymentId ? store.getPaymentById(input.paymentId) : undefined;

    const evaluatedAmount = proposal ? proposal.proposedAmount : "0.00";
    const maximumAmount = mandate ? mandate.budgetLimit : "0.00";
    const currency = mandate ? mandate.currency : "USD";

    // 1. Mandate exists
    if (!mandate) {
      reasonCodes.push("MANDATE_NOT_FOUND");
      checksDetail.push({ checkName: "Mandate Exists", passed: false, reasonCode: "MANDATE_NOT_FOUND" });
      return this.conclude("BLOCK", reasonCodes, input, evaluatedAmount, maximumAmount, currency, checksDetail);
    }
    checksDetail.push({ checkName: "Mandate Exists", passed: true });

    // 2. Mandate is active
    if (mandate.status !== "ACTIVE") {
      const code: AuthorizationReasonCode =
        mandate.status === "EXPIRED"
          ? "MANDATE_EXPIRED"
          : mandate.status === "REVOKED"
            ? "MANDATE_REVOKED"
            : "MANDATE_INACTIVE";
      reasonCodes.push(code);
      checksDetail.push({ checkName: "Mandate Active", passed: false, reasonCode: code });
      return this.conclude("BLOCK", reasonCodes, input, evaluatedAmount, maximumAmount, currency, checksDetail);
    }
    checksDetail.push({ checkName: "Mandate Active", passed: true });

    // 3. Mandate has not expired
    const now = new Date();
    if (new Date(mandate.expiresAt).getTime() <= now.getTime()) {
      reasonCodes.push("MANDATE_EXPIRED");
      checksDetail.push({ checkName: "Mandate Not Expired", passed: false, reasonCode: "MANDATE_EXPIRED" });
      return this.conclude("BLOCK", reasonCodes, input, evaluatedAmount, maximumAmount, currency, checksDetail);
    }
    checksDetail.push({ checkName: "Mandate Not Expired", passed: true });

    // 4. Mandate has not been revoked (verified by active status check)
    checksDetail.push({ checkName: "Mandate Not Revoked", passed: true });

    // Proposal existence check
    if (!proposal) {
      reasonCodes.push("PRODUCT_NOT_FOUND");
      checksDetail.push({ checkName: "Proposal Exists", passed: false, reasonCode: "PRODUCT_NOT_FOUND" });
      return this.conclude("BLOCK", reasonCodes, input, evaluatedAmount, maximumAmount, currency, checksDetail);
    }

    // 5. Product exists and is in stock
    const product = store.getProductById(proposal.productId);
    if (!product) {
      reasonCodes.push("PRODUCT_NOT_FOUND");
      checksDetail.push({ checkName: "Product Exists in Catalogue", passed: false, reasonCode: "PRODUCT_NOT_FOUND" });
      return this.conclude("BLOCK", reasonCodes, input, evaluatedAmount, maximumAmount, currency, checksDetail);
    }
    if (!product.inStock) {
      reasonCodes.push("PRODUCT_OUT_OF_STOCK");
      checksDetail.push({ checkName: "Product In Stock", passed: false, reasonCode: "PRODUCT_OUT_OF_STOCK" });
      return this.conclude("BLOCK", reasonCodes, input, evaluatedAmount, maximumAmount, currency, checksDetail);
    }
    checksDetail.push({ checkName: "Product In Stock", passed: true });

    // 6. Merchant is permitted
    if (mandate.permittedMerchants.length > 0) {
      const isPermitted = mandate.permittedMerchants.some(
        (m) => m.toLowerCase() === proposal.merchantName.toLowerCase()
      );
      if (!isPermitted) {
        reasonCodes.push("MERCHANT_NOT_ALLOWED");
        checksDetail.push({ checkName: "Merchant Permitted", passed: false, reasonCode: "MERCHANT_NOT_ALLOWED" });
      } else {
        checksDetail.push({ checkName: "Merchant Permitted", passed: true });
      }
    }

    // 7. Merchant is not restricted
    if (mandate.restrictedMerchants.length > 0) {
      const isRestricted = mandate.restrictedMerchants.some(
        (m) => m.toLowerCase() === proposal.merchantName.toLowerCase()
      );
      if (isRestricted) {
        reasonCodes.push("MERCHANT_RESTRICTED");
        checksDetail.push({ checkName: "Merchant Not Restricted", passed: false, reasonCode: "MERCHANT_RESTRICTED" });
      } else {
        checksDetail.push({ checkName: "Merchant Not Restricted", passed: true });
      }
    }

    // 8. Product satisfies required attributes
    if (mandate.requiredAttributes.length > 0) {
      const missingAttributes = mandate.requiredAttributes.filter(
        (req) => !product.attributes.some((pAttr) => pAttr.toLowerCase().includes(req.toLowerCase()))
      );
      if (missingAttributes.length > 0) {
        reasonCodes.push("PRODUCT_CONSTRAINT_VIOLATION");
        checksDetail.push({
          checkName: `Required Attributes Satisfied (missing: ${missingAttributes.join(", ")})`,
          passed: false,
          reasonCode: "PRODUCT_CONSTRAINT_VIOLATION",
        });
      } else {
        checksDetail.push({ checkName: "Required Attributes Satisfied", passed: true });
      }
    }

    // 9. Product does not violate exclusions
    if (mandate.excludedCategories.length > 0) {
      const violatesExclusion = mandate.excludedCategories.some(
        (cat) =>
          cat.toLowerCase() === product.category.toLowerCase() ||
          product.attributes.some((attr) => attr.toLowerCase().includes(cat.toLowerCase()))
      );
      if (violatesExclusion) {
        reasonCodes.push("EXCLUDED_CATEGORY_VIOLATION");
        checksDetail.push({
          checkName: "Category / Exclusions Respected",
          passed: false,
          reasonCode: "EXCLUDED_CATEGORY_VIOLATION",
        });
      } else {
        checksDetail.push({ checkName: "Category / Exclusions Respected", passed: true });
      }
    }

    // 10. Quantity is within permitted limits
    if (proposal.quantity > mandate.maxQuantity || proposal.quantity <= 0) {
      reasonCodes.push("QUANTITY_EXCEEDED");
      checksDetail.push({ checkName: "Quantity Within Limits", passed: false, reasonCode: "QUANTITY_EXCEEDED" });
    } else {
      checksDetail.push({ checkName: "Quantity Within Limits", passed: true });
    }

    // 11. Currency matches
    if (proposal.currency.toUpperCase() !== mandate.currency.toUpperCase()) {
      reasonCodes.push("CURRENCY_MISMATCH");
      checksDetail.push({ checkName: "Currency Matches Mandate", passed: false, reasonCode: "CURRENCY_MISMATCH" });
    } else {
      checksDetail.push({ checkName: "Currency Matches Mandate", passed: true });
    }

    // 12. Total amount is within budget
    const numericProposed = Number(proposal.proposedAmount);
    const numericBudget = Number(mandate.budgetLimit);
    if (numericProposed > numericBudget) {
      reasonCodes.push("BUDGET_EXCEEDED");
      checksDetail.push({ checkName: "Budget Limit Enforced", passed: false, reasonCode: "BUDGET_EXCEEDED" });
    } else {
      checksDetail.push({ checkName: "Budget Limit Enforced", passed: true });
    }

    // If any hard constraints failed above, outcome is BLOCK immediately
    if (reasonCodes.length > 0) {
      return this.conclude("BLOCK", reasonCodes, input, evaluatedAmount, maximumAmount, currency, checksDetail);
    }

    // 13. Human approval exists when required
    if (mandate.requireHumanApproval) {
      if (!approval) {
        reasonCodes.push("APPROVAL_REQUIRED");
        checksDetail.push({
          checkName: "Human Approval Present",
          passed: false,
          reasonCode: "APPROVAL_REQUIRED",
        });
        return this.conclude(
          "REQUIRE_APPROVAL",
          reasonCodes,
          input,
          evaluatedAmount,
          maximumAmount,
          currency,
          checksDetail
        );
      }

      // 14. Approval references the exact proposal
      if (approval.proposalId !== proposal.id || approval.mandateId !== mandate.id) {
        reasonCodes.push("APPROVAL_NOT_FOUND");
        checksDetail.push({
          checkName: "Approval Tied to Exact Proposal & Mandate",
          passed: false,
          reasonCode: "APPROVAL_NOT_FOUND",
        });
        return this.conclude("BLOCK", reasonCodes, input, evaluatedAmount, maximumAmount, currency, checksDetail);
      }

      // 15. Approval is not expired
      if (new Date(approval.expiresAt).getTime() <= now.getTime()) {
        reasonCodes.push("APPROVAL_EXPIRED");
        checksDetail.push({ checkName: "Approval Token Active", passed: false, reasonCode: "APPROVAL_EXPIRED" });
        return this.conclude("BLOCK", reasonCodes, input, evaluatedAmount, maximumAmount, currency, checksDetail);
      }

      // 16. Approval has not been reused
      if (approval.status === "USED" || approval.usedAt) {
        reasonCodes.push("APPROVAL_ALREADY_USED");
        checksDetail.push({
          checkName: "Single-Use Approval Not Consumed",
          passed: false,
          reasonCode: "APPROVAL_ALREADY_USED",
        });
        return this.conclude("BLOCK", reasonCodes, input, evaluatedAmount, maximumAmount, currency, checksDetail);
      }

      // 17. Proposal fingerprint is valid
      const isFingerprintValid = verifyProposalFingerprint(approval.proposalFingerprint, {
        mandateId: mandate.id,
        productId: product.id,
        merchantId: proposal.merchantId,
        proposedAmount: proposal.proposedAmount,
        currency: proposal.currency,
        quantity: proposal.quantity,
      });

      if (!isFingerprintValid) {
        reasonCodes.push("PROPOSAL_FINGERPRINT_MISMATCH");
        checksDetail.push({
          checkName: "Proposal Fingerprint Integrity Verified",
          passed: false,
          reasonCode: "PROPOSAL_FINGERPRINT_MISMATCH",
        });
        return this.conclude("BLOCK", reasonCodes, input, evaluatedAmount, maximumAmount, currency, checksDetail);
      }
      checksDetail.push({ checkName: "Proposal Fingerprint Integrity Verified", passed: true });
    }

    // 18. Payment operation is not already completed
    if (payment && (payment.status === "CAPTURED" || payment.status === "REFUNDED")) {
      reasonCodes.push("PAYMENT_ALREADY_COMPLETED");
      checksDetail.push({
        checkName: "Payment Not Already Captured",
        passed: false,
        reasonCode: "PAYMENT_ALREADY_COMPLETED",
      });
      return this.conclude("BLOCK", reasonCodes, input, evaluatedAmount, maximumAmount, currency, checksDetail);
    }
    checksDetail.push({ checkName: "Payment Not Already Captured", passed: true });

    // All 18 checks satisfied!
    reasonCodes.push("ALL_POLICIES_SATISFIED");
    return this.conclude("ALLOW", reasonCodes, input, evaluatedAmount, maximumAmount, currency, checksDetail);
  }

  private static conclude(
    decision: AuthorizationDecisionOutcome,
    reasonCodes: AuthorizationReasonCode[],
    input: KernelEvaluationInput,
    evaluatedAmount: string,
    maximumAmount: string,
    currency: string,
    checksDetail: { checkName: string; passed: boolean; reasonCode?: AuthorizationReasonCode }[]
  ): AuthorizationEvaluationResult {
    const result: AuthorizationEvaluationResult = {
      decision,
      reasonCodes,
      mandateId: input.mandateId,
      proposalId: input.proposalId,
      evaluatedAmount,
      maximumAmount,
      currency,
      evaluatedAt: new Date().toISOString(),
      checksDetail,
    };

    store.saveDecision(result);
    return result;
  }
}
