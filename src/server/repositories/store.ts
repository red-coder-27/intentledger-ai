import {
  ApprovalData,
  AuthorizationDecisionOutcome,
  AuthorizationEvaluationResult,
  IntentMandateData,
  MerchantData,
  PaymentRecord,
  PaymentStatus,
  ProductData,
  PurchaseProposalData,
  TransactionEventData,
  TransactionPassportData,
} from "@/types";
import { SEEDED_MERCHANTS, SEEDED_PRODUCTS } from "./catalogue.data";
import { KeyManager } from "@/lib/crypto/keys";
import { computeProposalFingerprint } from "@/lib/crypto/fingerprint";
import { calculateEventHash, createGenesisHash, GENESIS_PREVIOUS_HASH } from "@/lib/crypto/hash";
import { canonicalStringify } from "@/lib/crypto/canonical";

class InMemoryStore {
  private merchants: Map<string, MerchantData> = new Map();
  private products: Map<string, ProductData> = new Map();
  private mandates: Map<string, IntentMandateData> = new Map();
  private proposals: Map<string, PurchaseProposalData> = new Map();
  private decisions: Map<string, AuthorizationEvaluationResult> = new Map();
  private approvals: Map<string, ApprovalData> = new Map();
  private payments: Map<string, PaymentRecord> = new Map();
  private passports: Map<string, TransactionPassportData> = new Map();
  private passportEvents: Map<string, TransactionEventData[]> = new Map();
  private processedWebhookIds: Set<string> = new Set();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed Merchants
    for (const m of SEEDED_MERCHANTS) {
      this.merchants.set(m.id, m);
    }
    // Seed Products
    for (const p of SEEDED_PRODUCTS) {
      this.products.set(p.id, p);
    }

    // Seed Demo Mandate 1: Valid $100 Audio Mandate (for Scenario 1 & 2 demo)
    const mandate1Id = "mandate_demo_headphones_100";
    const mandate1Payload = {
      id: mandate1Id,
      userId: "usr_shopper_01",
      title: "Wireless Headphones Purchase",
      naturalInstruction:
        "Find wireless headphones under $100 from an approved merchant. Compare the options. Do not purchase anything without my explicit approval.",
      budgetLimit: "100.00",
      currency: "USD",
      permittedMerchants: ["Demo Electronics"],
      restrictedMerchants: ["ShadyDeals LLC"],
      requiredAttributes: ["wireless"],
      excludedCategories: ["refurbished"],
      maxQuantity: 1,
      requireHumanApproval: true,
      status: "ACTIVE" as const,
      signingKeyVersion: KeyManager.KEY_VERSION,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    };
    const mandate1Sig = KeyManager.signCanonical(mandate1Payload);
    const mandate1Fingerprint = KeyManager.signCanonical({ ...mandate1Payload, signature: mandate1Sig });

    this.mandates.set(mandate1Id, {
      ...mandate1Payload,
      signature: mandate1Sig,
      fingerprint: mandate1Fingerprint.slice(0, 32),
    });

    // Seed Demo Mandate 2: Expired Mandate (for Scenario 5 test)
    const mandateExpiredId = "mandate_demo_expired_02";
    const expiredPayload = {
      id: mandateExpiredId,
      userId: "usr_shopper_01",
      title: "Urgent Desk Accessories (Expired)",
      naturalInstruction: "Procure desk accessories before yesterday.",
      budgetLimit: "50.00",
      currency: "USD",
      permittedMerchants: ["Demo Electronics"],
      restrictedMerchants: [],
      requiredAttributes: [],
      excludedCategories: [],
      maxQuantity: 1,
      requireHumanApproval: true,
      status: "EXPIRED" as const,
      signingKeyVersion: KeyManager.KEY_VERSION,
      expiresAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    };
    const expSig = KeyManager.signCanonical(expiredPayload);
    this.mandates.set(mandateExpiredId, {
      ...expiredPayload,
      signature: expSig,
      fingerprint: expSig.slice(0, 32),
    });

    // Seed Demo Proposal 1: AuraSound Pro ($85.00) -> Fits Mandate 1
    const prop1Id = "prop_demo_85";
    const prop1Fingerprint = computeProposalFingerprint({
      mandateId: mandate1Id,
      productId: "prod_audio_01",
      merchantId: "merch_demo_01",
      proposedAmount: "85.00",
      currency: "USD",
      quantity: 1,
    });
    this.proposals.set(prop1Id, {
      id: prop1Id,
      mandateId: mandate1Id,
      productId: "prod_audio_01",
      productName: "AuraSound Pro ANC Wireless Headphones",
      merchantId: "merch_demo_01",
      merchantName: "Demo Electronics",
      proposedAmount: "85.00",
      currency: "USD",
      quantity: 1,
      proposalFingerprint: prop1Fingerprint,
      reasoningSummary:
        "Selected AuraSound Pro at $85.00. Features ANC, wireless connectivity, well within your $100.00 budget and sold by authorized Demo Electronics.",
      constraintsSatisfied: ["BUDGET_COMPLIANT", "MERCHANT_PERMITTED", "ATTRIBUTE_WIRELESS"],
      constraintsViolated: [],
      requiresHumanApproval: true,
      status: "PENDING",
      createdAt: new Date(Date.now() - 1800 * 1000).toISOString(),
    });

    // Seed Demo Proposal 2: StudioMaster ($160.00) -> Exceeds Mandate 1 (Scenario 2)
    const prop2Id = "prop_demo_160";
    const prop2Fingerprint = computeProposalFingerprint({
      mandateId: mandate1Id,
      productId: "prod_audio_02",
      merchantId: "merch_demo_01",
      proposedAmount: "160.00",
      currency: "USD",
      quantity: 1,
    });
    this.proposals.set(prop2Id, {
      id: prop2Id,
      mandateId: mandate1Id,
      productId: "prod_audio_02",
      productName: "StudioMaster High-Fidelity Wireless Over-Ear",
      merchantId: "merch_demo_01",
      merchantName: "Demo Electronics",
      proposedAmount: "160.00",
      currency: "USD",
      quantity: 1,
      proposalFingerprint: prop2Fingerprint,
      reasoningSummary:
        "High-fidelity alternative. Note: price ($160.00) exceeds your authorized limit ($100.00).",
      constraintsSatisfied: ["MERCHANT_PERMITTED", "ATTRIBUTE_WIRELESS"],
      constraintsViolated: ["BUDGET_EXCEEDED"],
      requiresHumanApproval: true,
      status: "BLOCKED",
      createdAt: new Date(Date.now() - 1200 * 1000).toISOString(),
    });
  }

  // --- Merchants ---
  public listMerchants(): MerchantData[] {
    return Array.from(this.merchants.values());
  }

  public getMerchantById(id: string): MerchantData | undefined {
    return this.merchants.get(id);
  }

  public getMerchantByName(name: string): MerchantData | undefined {
    return Array.from(this.merchants.values()).find(
      (m) => m.name.toLowerCase() === name.toLowerCase()
    );
  }

  // --- Products ---
  public listProducts(): ProductData[] {
    return Array.from(this.products.values());
  }

  public getProductById(id: string): ProductData | undefined {
    return this.products.get(id);
  }

  public searchProducts(query: string, category?: string): ProductData[] {
    const q = query.toLowerCase().trim();
    return Array.from(this.products.values()).filter((p) => {
      const matchCategory = !category || p.category.toLowerCase() === category.toLowerCase();
      if (!matchCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.attributes.some((attr) => attr.toLowerCase().includes(q))
      );
    });
  }

  // --- Mandates ---
  public listMandates(): IntentMandateData[] {
    return Array.from(this.mandates.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getMandateById(id: string): IntentMandateData | undefined {
    return this.mandates.get(id);
  }

  public saveMandate(mandate: IntentMandateData): IntentMandateData {
    this.mandates.set(mandate.id, mandate);
    return mandate;
  }

  public revokeMandate(id: string): IntentMandateData | undefined {
    const mandate = this.mandates.get(id);
    if (!mandate) return undefined;
    mandate.status = "REVOKED";
    mandate.updatedAt = new Date().toISOString();
    return mandate;
  }

  // --- Proposals ---
  public listProposals(): PurchaseProposalData[] {
    return Array.from(this.proposals.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getProposalById(id: string): PurchaseProposalData | undefined {
    return this.proposals.get(id);
  }

  public saveProposal(proposal: PurchaseProposalData): PurchaseProposalData {
    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  // --- Authorization Decisions ---
  public saveDecision(decision: AuthorizationEvaluationResult): AuthorizationEvaluationResult {
    const key = `${decision.mandateId}_${decision.proposalId}_${decision.evaluatedAt}`;
    this.decisions.set(key, decision);
    return decision;
  }

  public listDecisions(): AuthorizationEvaluationResult[] {
    return Array.from(this.decisions.values()).sort(
      (a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime()
    );
  }

  // --- Approvals ---
  public saveApproval(approval: ApprovalData): ApprovalData {
    this.approvals.set(approval.id, approval);
    return approval;
  }

  public getApprovalById(id: string): ApprovalData | undefined {
    return this.approvals.get(id);
  }

  public getApprovalByProposalId(proposalId: string): ApprovalData | undefined {
    return Array.from(this.approvals.values()).find(
      (a) => a.proposalId === proposalId && a.status === "APPROVED"
    );
  }

  public markApprovalUsed(approvalId: string): boolean {
    const approval = this.approvals.get(approvalId);
    if (!approval || approval.status !== "APPROVED") return false;
    approval.status = "USED";
    approval.usedAt = new Date().toISOString();
    return true;
  }

  // --- Payments ---
  public savePayment(payment: PaymentRecord): PaymentRecord {
    this.payments.set(payment.id, payment);
    return payment;
  }

  public getPaymentById(id: string): PaymentRecord | undefined {
    return this.payments.get(id);
  }

  public getPaymentByOrderId(orderId: string): PaymentRecord | undefined {
    return Array.from(this.payments.values()).find((p) => p.paypalOrderId === orderId);
  }

  public listPayments(): PaymentRecord[] {
    return Array.from(this.payments.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    paypalCaptureId?: string,
    reconciliationStatus?: "RECONCILED" | "EXCEPTION"
  ): PaymentRecord | undefined {
    const payment = this.payments.get(paymentId);
    if (!payment) return undefined;
    payment.status = status;
    if (paypalCaptureId) {
      payment.paypalCaptureId = paypalCaptureId;
      payment.capturedAt = new Date().toISOString();
    }
    if (reconciliationStatus) {
      payment.reconciliationStatus = reconciliationStatus;
    }
    return payment;
  }

  // --- Passports & Hash Chain Ledger ---
  public savePassport(passport: TransactionPassportData): TransactionPassportData {
    this.passports.set(passport.id, passport);
    if (!this.passportEvents.has(passport.id)) {
      this.passportEvents.set(passport.id, passport.events);
    }
    return passport;
  }

  public getPassportById(id: string): TransactionPassportData | undefined {
    return this.passports.get(id);
  }

  public getPassportByTransactionId(txId: string): TransactionPassportData | undefined {
    return Array.from(this.passports.values()).find((p) => p.transactionId === txId);
  }

  public listPassports(): TransactionPassportData[] {
    return Array.from(this.passports.values()).sort(
      (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    );
  }

  // --- Webhook Deduplication ---
  public hasProcessedWebhook(webhookId: string): boolean {
    return this.processedWebhookIds.has(webhookId);
  }

  public markWebhookProcessed(webhookId: string): void {
    this.processedWebhookIds.add(webhookId);
  }
}

// Global Singleton Store
export const store = new InMemoryStore();
