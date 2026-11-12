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
import { prisma } from "@/lib/database/prisma";
import { Prisma } from "@prisma/client";

export class Store {
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
  private initPromise: Promise<void> | null = null;
  private isDbSyncComplete: boolean = false;

  constructor() {
    this.seedInitialInMemoryData();
    // Non-blocking trigger of database synchronization
    this.initPromise = this.syncFromDatabase().catch((err) => {
      console.warn("Database sync notice (falling back to memory until ready):", err.message);
    });
  }

  /**
   * Ensures the database sync has finished for callers that require full persistence up to date.
   */
  public async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  private seedInitialInMemoryData() {
    for (const m of SEEDED_MERCHANTS) {
      const payee = (m.isDemoSeller && process.env.PAYPAL_DEMO_PAYEE_EMAIL?.trim())
        ? process.env.PAYPAL_DEMO_PAYEE_EMAIL.trim()
        : m.paypalPayeeEmail;
      this.merchants.set(m.id, { ...m, paypalPayeeEmail: payee });
    }
    for (const p of SEEDED_PRODUCTS) {
      this.products.set(p.id, p);
    }

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

    const prop1Id = "prop_demo_85";
    const prop1Fingerprint = computeProposalFingerprint({
      mandateId: mandate1Id,
      productId: "prod_audio_01",
      merchantId: "merch_demo_01",
      proposedAmount: "85.00",
      currency: "USD",
      quantity: 1,
    });
    const configuredDemoPayee = process.env.PAYPAL_DEMO_PAYEE_EMAIL?.trim() || "";

    this.proposals.set(prop1Id, {
      id: prop1Id,
      mandateId: mandate1Id,
      productId: "prod_audio_01",
      productName: "AuraSound Pro ANC Wireless Headphones",
      merchantId: "merch_demo_01",
      merchantName: "Demo Electronics",
      paypalPayeeEmail: configuredDemoPayee,
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
      paypalPayeeEmail: configuredDemoPayee,
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

  /**
   * Hydrates the repository from Neon PostgreSQL.
   */
  public async syncFromDatabase(): Promise<void> {
    try {
      // 1. Ensure Default User exists
      await prisma.user.upsert({
        where: { email: "shopper@intentledger.ai" },
        update: {},
        create: {
          id: "usr_shopper_01",
          email: "shopper@intentledger.ai",
          name: "Demo Shopper",
        },
      });

      // 2. Fetch all collections in parallel from Neon PostgreSQL
      const [
        dbMerchants,
        dbProducts,
        dbMandates,
        dbProposals,
        dbDecisions,
        dbApprovals,
        dbPayments,
        dbPassports,
        dbWebhooks,
      ] = await Promise.all([
        prisma.merchant.findMany(),
        prisma.product.findMany(),
        prisma.intentMandate.findMany(),
        prisma.purchaseProposal.findMany(),
        prisma.authorizationDecision.findMany(),
        prisma.approval.findMany(),
        prisma.payment.findMany({ include: { captures: true } }),
        prisma.transactionPassport.findMany({
          include: { events: { orderBy: { sequenceNumber: "asc" } } },
        }),
        prisma.paymentWebhookEvent.findMany(),
      ]);

      // Populate Merchants
      if (dbMerchants.length === 0) {
        for (const m of SEEDED_MERCHANTS) {
          const payee = (m.isDemoSeller && process.env.PAYPAL_DEMO_PAYEE_EMAIL?.trim())
            ? process.env.PAYPAL_DEMO_PAYEE_EMAIL.trim()
            : m.paypalPayeeEmail;
          await prisma.merchant.upsert({
            where: { slug: m.slug },
            update: { paypalPayeeEmail: payee },
            create: {
              id: m.id,
              name: m.name,
              slug: m.slug,
              paypalPayeeEmail: payee,
              isVerified: m.isVerified,
              isDemoSeller: m.isDemoSeller,
            },
          });
          this.merchants.set(m.id, { ...m, paypalPayeeEmail: payee });
        }
      } else {
        for (const m of dbMerchants) {
          const payee = (m.isDemoSeller && process.env.PAYPAL_DEMO_PAYEE_EMAIL?.trim())
            ? process.env.PAYPAL_DEMO_PAYEE_EMAIL.trim()
            : m.paypalPayeeEmail;
          this.merchants.set(m.id, {
            id: m.id,
            name: m.name,
            slug: m.slug,
            paypalPayeeEmail: payee,
            isVerified: m.isVerified,
            isDemoSeller: m.isDemoSeller,
          });
        }
      }

      // Populate Products
      if (dbProducts.length === 0) {
        for (const p of SEEDED_PRODUCTS) {
          await prisma.product.upsert({
            where: { sku: p.sku },
            update: {},
            create: {
              id: p.id,
              name: p.name,
              description: p.description,
              category: p.category,
              merchantId: p.merchantId,
              price: p.price,
              currency: p.currency,
              attributes: p.attributes,
              inStock: p.inStock,
              sku: p.sku,
              deliveryEstimateDays: p.deliveryEstimateDays,
              imageUrl: p.imageUrl,
            },
          });
          this.products.set(p.id, p);
        }
      } else {
        for (const p of dbProducts) {
          const merchant = this.merchants.get(p.merchantId);
          this.products.set(p.id, {
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            merchantId: p.merchantId,
            merchantName: merchant ? merchant.name : "Demo Electronics",
            price: Number(p.price).toFixed(2),
            currency: p.currency,
            attributes: (p.attributes as string[]) || [],
            inStock: p.inStock,
            sku: p.sku,
            deliveryEstimateDays: p.deliveryEstimateDays,
            imageUrl: p.imageUrl,
          });
        }
      }

      // Populate Mandates
      for (const m of dbMandates) {
        this.mandates.set(m.id, {
          id: m.id,
          userId: m.userId,
          title: m.title,
          naturalInstruction: m.naturalInstruction,
          budgetLimit: Number(m.budgetLimit).toFixed(2),
          currency: m.currency,
          permittedMerchants: (m.permittedMerchants as string[]) || [],
          restrictedMerchants: (m.restrictedMerchants as string[]) || [],
          requiredAttributes: (m.requiredAttributes as string[]) || [],
          excludedCategories: (m.excludedCategories as string[]) || [],
          maxQuantity: m.maxQuantity,
          requireHumanApproval: m.requireHumanApproval,
          status: m.status as any,
          signature: m.signature,
          signingKeyVersion: m.signingKeyVersion,
          fingerprint: m.fingerprint,
          expiresAt: m.expiresAt.toISOString(),
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        });
      }

      // Populate Proposals
      for (const pp of dbProposals) {
        const prod = this.products.get(pp.productId);
        const merch = this.merchants.get(pp.merchantId);
        const configuredDemoPayee = process.env.PAYPAL_DEMO_PAYEE_EMAIL?.trim();
        const payee = (merch?.isDemoSeller && configuredDemoPayee)
          ? configuredDemoPayee
          : (merch?.paypalPayeeEmail || configuredDemoPayee || "");

        this.proposals.set(pp.id, {
          id: pp.id,
          mandateId: pp.mandateId,
          productId: pp.productId,
          productName: prod ? prod.name : "Authorized Product",
          merchantId: pp.merchantId,
          merchantName: merch ? merch.name : "Demo Electronics",
          paypalPayeeEmail: payee,
          proposedAmount: Number(pp.proposedAmount).toFixed(2),
          currency: pp.currency,
          quantity: pp.quantity,
          proposalFingerprint: pp.proposalFingerprint,
          reasoningSummary: pp.reasoningSummary,
          constraintsSatisfied: (pp.constraintsSatisfied as string[]) || [],
          constraintsViolated: (pp.constraintsViolated as string[]) || [],
          requiresHumanApproval: pp.requiresHumanApproval,
          status: pp.status as any,
          createdAt: pp.createdAt.toISOString(),
        });
      }

      // Populate Authorization Decisions
      for (const dec of dbDecisions) {
        const key = `${dec.mandateId}_${dec.proposalId}_${dec.evaluatedAt.toISOString()}`;
        this.decisions.set(key, {
          decision: dec.decision as any,
          reasonCodes: (dec.reasonCodes as any) || [],
          mandateId: dec.mandateId,
          proposalId: dec.proposalId,
          evaluatedAmount: Number(dec.evaluatedAmount).toFixed(2),
          maximumAmount: Number(dec.maximumAmount).toFixed(2),
          currency: dec.currency,
          evaluatedAt: dec.evaluatedAt.toISOString(),
          checksDetail: [],
        });
      }

      // Populate Approvals
      for (const app of dbApprovals) {
        this.approvals.set(app.id, {
          id: app.id,
          proposalId: app.proposalId,
          mandateId: app.mandateId,
          proposalFingerprint: app.proposalFingerprint,
          customerConsent: app.customerConsent,
          status: app.status as any,
          approvedAt: app.approvedAt.toISOString(),
          expiresAt: app.expiresAt.toISOString(),
          usedAt: app.usedAt?.toISOString(),
        });
      }

      // Populate Payments
      for (const pay of dbPayments) {
        const prod = this.proposals.get(pay.proposalId);
        const capture = pay.captures[0];
        this.payments.set(pay.id, {
          id: pay.id,
          approvalId: pay.approvalId,
          mandateId: pay.mandateId,
          proposalId: pay.proposalId,
          paypalOrderId: pay.paypalOrderId,
          paypalCaptureId: capture?.paypalCaptureId,
          paypalPayeeEmail: pay.paypalPayeeEmail,
          merchantName: prod?.merchantName || "Demo Electronics",
          productName: prod?.productName || "Authorized Product",
          amount: Number(pay.amount).toFixed(2),
          currency: pay.currency,
          status: pay.status as any,
          reconciliationStatus: capture ? (capture.reconciliationStatus as any) : undefined,
          createdAt: pay.createdAt.toISOString(),
          capturedAt: capture?.capturedAt?.toISOString(),
        });
      }

      // Populate Passports
      for (const pass of dbPassports) {
        const payment = this.payments.get(pass.paymentId);
        const mandate = this.mandates.get(pass.mandateId);
        const proposal = this.proposals.get(pass.proposalId);
        const approval = this.approvals.get(pass.approvalId);

        const events: TransactionEventData[] = pass.events.map((e) => ({
          id: e.id,
          passportId: e.passportId,
          sequenceNumber: e.sequenceNumber,
          eventType: e.eventType as any,
          canonicalPayload: e.canonicalPayload,
          previousHash: e.previousHash,
          currentHash: e.currentHash,
          signature: e.signature || undefined,
          timestamp: e.timestamp.toISOString(),
        }));

        this.passports.set(pass.id, {
          id: pass.id,
          transactionId: pass.transactionId,
          mandateId: pass.mandateId,
          proposalId: pass.proposalId,
          approvalId: pass.approvalId,
          paymentId: pass.paymentId,
          paypalOrderId: payment?.paypalOrderId || "N/A",
          paypalCaptureId: payment?.paypalCaptureId || "N/A",
          verificationStatus: pass.verificationStatus as any,
          genesisHash: pass.genesisHash,
          finalHash: pass.finalHash,
          totalEvents: pass.totalEvents,
          issuedAt: pass.issuedAt.toISOString(),
          summary: {
            productName: proposal?.productName || "Authorized Product",
            merchantName: proposal?.merchantName || "Demo Electronics",
            amount: payment?.amount || "85.00",
            currency: payment?.currency || "USD",
            customerInstruction: mandate?.naturalInstruction || "Instruction",
            approvedAt: approval?.approvedAt || pass.issuedAt.toISOString(),
            capturedAt: payment?.capturedAt || pass.issuedAt.toISOString(),
          },
          events,
        });

        this.passportEvents.set(pass.id, events);
      }

      // Populate Webhooks
      for (const w of dbWebhooks) {
        this.processedWebhookIds.add(w.paypalEventId);
      }

      this.isDbSyncComplete = true;
    } catch (error: any) {
      console.warn("Neon Database sync completed with fallback:", error.message);
    }
  }

  // --- Merchants ---
  public listMerchants(): MerchantData[] {
    return Array.from(this.merchants.values());
  }

  public getMerchantById(id: string): MerchantData | undefined {
    return this.merchants.get(id);
  }

  public resolvePayeeEmail(merchantId: string): string | undefined {
    const merchant = this.getMerchantById(merchantId);
    if (!merchant) {
      return undefined;
    }
    const configuredDemoPayee = process.env.PAYPAL_DEMO_PAYEE_EMAIL?.trim();

    let payeeEmail: string | undefined;
    if (merchant.isDemoSeller) {
      payeeEmail =
        configuredDemoPayee ||
        (merchant.paypalPayeeEmail && merchant.paypalPayeeEmail !== "merchant-demo@intentledger.ai"
          ? merchant.paypalPayeeEmail
          : undefined);
    } else {
      payeeEmail = merchant.paypalPayeeEmail;
    }

    if (!payeeEmail || payeeEmail === "merchant-demo@intentledger.ai" || payeeEmail.trim() === "") {
      return undefined;
    }
    return payeeEmail.trim();
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

  public async saveMandate(mandate: IntentMandateData): Promise<IntentMandateData> {
    const previous = this.mandates.get(mandate.id);
    this.mandates.set(mandate.id, mandate);

    try {
      await prisma.intentMandate.upsert({
        where: { id: mandate.id },
        update: {
          title: mandate.title,
          naturalInstruction: mandate.naturalInstruction,
          budgetLimit: mandate.budgetLimit,
          currency: mandate.currency,
          permittedMerchants: mandate.permittedMerchants,
          restrictedMerchants: mandate.restrictedMerchants,
          requiredAttributes: mandate.requiredAttributes,
          excludedCategories: mandate.excludedCategories,
          maxQuantity: mandate.maxQuantity,
          requireHumanApproval: mandate.requireHumanApproval,
          status: mandate.status,
          signature: mandate.signature,
          signingKeyVersion: mandate.signingKeyVersion,
          fingerprint: mandate.fingerprint,
          expiresAt: new Date(mandate.expiresAt),
          updatedAt: new Date(),
        },
        create: {
          id: mandate.id,
          userId: mandate.userId || "usr_shopper_01",
          title: mandate.title,
          naturalInstruction: mandate.naturalInstruction,
          budgetLimit: mandate.budgetLimit,
          currency: mandate.currency,
          permittedMerchants: mandate.permittedMerchants,
          restrictedMerchants: mandate.restrictedMerchants,
          requiredAttributes: mandate.requiredAttributes,
          excludedCategories: mandate.excludedCategories,
          maxQuantity: mandate.maxQuantity,
          requireHumanApproval: mandate.requireHumanApproval,
          status: mandate.status,
          signature: mandate.signature,
          signingKeyVersion: mandate.signingKeyVersion,
          fingerprint: mandate.fingerprint,
          expiresAt: new Date(mandate.expiresAt),
          createdAt: new Date(mandate.createdAt),
          updatedAt: new Date(mandate.updatedAt),
        },
      });
      return mandate;
    } catch (err) {
      if (previous) {
        this.mandates.set(mandate.id, previous);
      } else {
        this.mandates.delete(mandate.id);
      }
      throw err;
    }
  }

  public async revokeMandate(id: string): Promise<IntentMandateData | undefined> {
    const mandate = this.mandates.get(id);
    if (!mandate) return undefined;
    const previousStatus = mandate.status;
    const previousUpdatedAt = mandate.updatedAt;

    mandate.status = "REVOKED";
    mandate.updatedAt = new Date().toISOString();

    try {
      await prisma.intentMandate.update({
        where: { id },
        data: { status: "REVOKED", updatedAt: new Date() },
      });
      return mandate;
    } catch (err) {
      mandate.status = previousStatus;
      mandate.updatedAt = previousUpdatedAt;
      throw err;
    }
  }

  // --- Proposals ---
  public listProposals(): PurchaseProposalData[] {
    return Array.from(this.proposals.values())
      .map((p) => {
        if (!p.paypalPayeeEmail) {
          p.paypalPayeeEmail = this.resolvePayeeEmail(p.merchantId);
        }
        return p;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getProposalById(id: string): PurchaseProposalData | undefined {
    const proposal = this.proposals.get(id);
    if (!proposal) return undefined;
    if (!proposal.paypalPayeeEmail) {
      proposal.paypalPayeeEmail = this.resolvePayeeEmail(proposal.merchantId);
    }
    return proposal;
  }

  public async saveProposal(proposal: PurchaseProposalData): Promise<PurchaseProposalData> {
    const previous = this.proposals.get(proposal.id);
    this.proposals.set(proposal.id, proposal);

    try {
      await prisma.purchaseProposal.upsert({
        where: { id: proposal.id },
        update: {
          proposedAmount: proposal.proposedAmount,
          currency: proposal.currency,
          quantity: proposal.quantity,
          proposalFingerprint: proposal.proposalFingerprint,
          reasoningSummary: proposal.reasoningSummary,
          constraintsSatisfied: proposal.constraintsSatisfied,
          constraintsViolated: proposal.constraintsViolated,
          requiresHumanApproval: proposal.requiresHumanApproval,
          status: proposal.status,
        },
        create: {
          id: proposal.id,
          mandateId: proposal.mandateId,
          productId: proposal.productId,
          merchantId: proposal.merchantId,
          proposedAmount: proposal.proposedAmount,
          currency: proposal.currency,
          quantity: proposal.quantity,
          proposalFingerprint: proposal.proposalFingerprint,
          reasoningSummary: proposal.reasoningSummary,
          constraintsSatisfied: proposal.constraintsSatisfied,
          constraintsViolated: proposal.constraintsViolated,
          requiresHumanApproval: proposal.requiresHumanApproval,
          status: proposal.status,
          createdAt: new Date(proposal.createdAt),
        },
      });
      return proposal;
    } catch (err) {
      if (previous) {
        this.proposals.set(proposal.id, previous);
      } else {
        this.proposals.delete(proposal.id);
      }
      throw err;
    }
  }

  // --- Authorization Decisions ---
  public async saveDecision(decision: AuthorizationEvaluationResult): Promise<AuthorizationEvaluationResult> {
    const key = `${decision.mandateId}_${decision.proposalId}_${decision.evaluatedAt}`;
    this.decisions.set(key, decision);

    // Persist to Neon PostgreSQL if parent mandate and proposal exist in database
    const mandateExists = this.mandates.has(decision.mandateId);
    const proposalExists = this.proposals.has(decision.proposalId);

    if (mandateExists && proposalExists) {
      try {
        await prisma.authorizationDecision.create({
          data: {
            mandateId: decision.mandateId,
            proposalId: decision.proposalId,
            decision: decision.decision,
            reasonCodes: decision.reasonCodes,
            evaluatedAmount: decision.evaluatedAmount,
            maximumAmount: decision.maximumAmount,
            currency: decision.currency,
            evaluatedAt: new Date(decision.evaluatedAt),
          },
        });
      } catch (err: any) {
        console.warn("Notice: Authorization decision record not written to Neon (may lack parent entity in DB):", err.message);
      }
    }

    return decision;
  }

  public listDecisions(): AuthorizationEvaluationResult[] {
    return Array.from(this.decisions.values()).sort(
      (a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime()
    );
  }

  // --- Approvals ---
  public async saveApproval(approval: ApprovalData): Promise<ApprovalData> {
    const previous = this.approvals.get(approval.id);
    this.approvals.set(approval.id, approval);

    try {
      await prisma.approval.upsert({
        where: { id: approval.id },
        update: {
          proposalFingerprint: approval.proposalFingerprint,
          customerConsent: approval.customerConsent,
          status: approval.status,
          expiresAt: new Date(approval.expiresAt),
          usedAt: approval.usedAt ? new Date(approval.usedAt) : null,
        },
        create: {
          id: approval.id,
          proposalId: approval.proposalId,
          mandateId: approval.mandateId,
          proposalFingerprint: approval.proposalFingerprint,
          customerConsent: approval.customerConsent,
          status: approval.status,
          approvedAt: new Date(approval.approvedAt),
          expiresAt: new Date(approval.expiresAt),
          usedAt: approval.usedAt ? new Date(approval.usedAt) : null,
        },
      });
      return approval;
    } catch (err) {
      if (previous) {
        this.approvals.set(approval.id, previous);
      } else {
        this.approvals.delete(approval.id);
      }
      throw err;
    }
  }

  public getApprovalById(id: string): ApprovalData | undefined {
    return this.approvals.get(id);
  }

  public getApprovalByProposalId(proposalId: string): ApprovalData | undefined {
    return Array.from(this.approvals.values()).find(
      (a) => a.proposalId === proposalId && a.status === "APPROVED"
    );
  }

  public async markApprovalUsed(approvalId: string): Promise<boolean> {
    const approval = this.approvals.get(approvalId);
    if (!approval || approval.status !== "APPROVED") return false;
    const prevStatus = approval.status;
    const prevUsedAt = approval.usedAt;

    approval.status = "USED";
    approval.usedAt = new Date().toISOString();

    try {
      await prisma.approval.update({
        where: { id: approvalId },
        data: { status: "USED", usedAt: new Date() },
      });
      return true;
    } catch (err) {
      approval.status = prevStatus;
      approval.usedAt = prevUsedAt;
      throw err;
    }
  }

  // --- Payments ---
  public async savePayment(payment: PaymentRecord): Promise<PaymentRecord> {
    const previous = this.payments.get(payment.id);
    this.payments.set(payment.id, payment);

    try {
      await prisma.payment.upsert({
        where: { paypalOrderId: payment.paypalOrderId },
        update: {
          status: payment.status,
        },
        create: {
          id: payment.id,
          approvalId: payment.approvalId,
          mandateId: payment.mandateId,
          proposalId: payment.proposalId,
          paypalOrderId: payment.paypalOrderId,
          paypalPayeeEmail: payment.paypalPayeeEmail,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          createdAt: new Date(payment.createdAt),
          updatedAt: new Date(),
        },
      });
      return payment;
    } catch (err) {
      if (previous) {
        this.payments.set(payment.id, previous);
      } else {
        this.payments.delete(payment.id);
      }
      throw err;
    }
  }

  public getPaymentById(id: string): PaymentRecord | undefined {
    return this.payments.get(id);
  }

  public getPaymentByOrderId(orderId: string): PaymentRecord | undefined {
    return Array.from(this.payments.values()).find((p) => p.paypalOrderId === orderId);
  }

  public getPaymentByProposalId(proposalId: string): PaymentRecord | undefined {
    return Array.from(this.payments.values()).find((p) => p.proposalId === proposalId);
  }

  public listPayments(): PaymentRecord[] {
    return Array.from(this.payments.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    paypalCaptureId?: string,
    reconciliationStatus?: "RECONCILED" | "EXCEPTION"
  ): Promise<PaymentRecord | undefined> {
    const payment = this.payments.get(paymentId);
    if (!payment) return undefined;

    const prevStatus = payment.status;
    const prevCaptureId = payment.paypalCaptureId;
    const prevCapturedAt = payment.capturedAt;
    const prevReconciliation = payment.reconciliationStatus;

    payment.status = status;
    if (paypalCaptureId) {
      payment.paypalCaptureId = paypalCaptureId;
      payment.capturedAt = new Date().toISOString();
    }
    if (reconciliationStatus) {
      payment.reconciliationStatus = reconciliationStatus;
    }

    try {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status,
          updatedAt: new Date(),
        },
      });

      if (paypalCaptureId) {
        await prisma.paymentCapture.upsert({
          where: { paypalCaptureId },
          update: {
            reconciliationStatus: reconciliationStatus || "RECONCILED",
          },
          create: {
            paymentId,
            paypalCaptureId,
            paypalOrderId: payment.paypalOrderId,
            capturedAmount: payment.amount,
            currency: payment.currency,
            reconciliationStatus: reconciliationStatus || "RECONCILED",
            capturedAt: new Date(),
            rawResponse: { status: "COMPLETED", id: paypalCaptureId },
          },
        });
      }

      return payment;
    } catch (err) {
      payment.status = prevStatus;
      payment.paypalCaptureId = prevCaptureId;
      payment.capturedAt = prevCapturedAt;
      payment.reconciliationStatus = prevReconciliation;
      throw err;
    }
  }

  // --- Passports & Hash Chain Ledger ---
  public async savePassport(passport: TransactionPassportData): Promise<TransactionPassportData> {
    const prevPassport = this.passports.get(passport.id);
    const prevEvents = this.passportEvents.get(passport.id);
    this.passports.set(passport.id, passport);
    this.passportEvents.set(passport.id, passport.events);

    try {
      // 1. Persist parent passport to Neon PostgreSQL
      await prisma.transactionPassport.upsert({
        where: { transactionId: passport.transactionId },
        update: {
          verificationStatus: passport.verificationStatus,
          finalHash: passport.finalHash,
          totalEvents: passport.totalEvents,
        },
        create: {
          id: passport.id,
          transactionId: passport.transactionId,
          mandateId: passport.mandateId,
          proposalId: passport.proposalId,
          approvalId: passport.approvalId,
          paymentId: passport.paymentId,
          verificationStatus: passport.verificationStatus,
          genesisHash: passport.genesisHash,
          finalHash: passport.finalHash,
          totalEvents: passport.totalEvents,
          issuedAt: new Date(passport.issuedAt),
        },
      });

      // 2. Persist hash chain events atomically
      await prisma.$transaction(
        passport.events.map((evt) =>
          prisma.transactionEvent.upsert({
            where: {
              passportId_sequenceNumber: {
                passportId: passport.id,
                sequenceNumber: evt.sequenceNumber,
              },
            },
            update: {
              eventType: evt.eventType,
              canonicalPayload: evt.canonicalPayload,
              previousHash: evt.previousHash,
              currentHash: evt.currentHash,
              signature: evt.signature,
              timestamp: new Date(evt.timestamp),
            },
            create: {
              id: evt.id,
              passportId: passport.id,
              sequenceNumber: evt.sequenceNumber,
              eventType: evt.eventType,
              canonicalPayload: evt.canonicalPayload,
              previousHash: evt.previousHash,
              currentHash: evt.currentHash,
              signature: evt.signature,
              timestamp: new Date(evt.timestamp),
            },
          })
        )
      );

      // 3. Persist Evidence Records to Neon PostgreSQL
      const evidenceItems = passport.events.map((evt) => ({
        transactionId: passport.transactionId,
        source: evt.eventType.startsWith("PAYPAL")
          ? "PAYPAL_API"
          : evt.eventType.includes("MANDATE")
          ? "USER_INPUT"
          : evt.eventType.includes("AUTH")
          ? "KERNEL_EVALUATION"
          : "AGENT_OUTPUT",
        recordType: evt.eventType,
        recordReferenceId: evt.id,
        payload: {
          sequenceNumber: evt.sequenceNumber,
          eventType: evt.eventType,
          currentHash: evt.currentHash,
          signature: evt.signature,
        },
        isVerified: true,
        recordedAt: new Date(evt.timestamp),
      }));

      await prisma.evidenceRecord.createMany({
        data: evidenceItems,
        skipDuplicates: true,
      });

      return passport;
    } catch (err) {
      if (prevPassport) {
        this.passports.set(passport.id, prevPassport);
      } else {
        this.passports.delete(passport.id);
      }
      if (prevEvents) {
        this.passportEvents.set(passport.id, prevEvents);
      } else {
        this.passportEvents.delete(passport.id);
      }
      throw err;
    }
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

  // --- Webhook Deduplication & Database-Level Idempotency ---
  public hasProcessedWebhook(webhookId: string): boolean {
    return this.processedWebhookIds.has(webhookId);
  }

  public async isWebhookProcessed(webhookId: string): Promise<boolean> {
    if (this.processedWebhookIds.has(webhookId)) return true;
    const existing = await prisma.paymentWebhookEvent.findUnique({
      where: { paypalEventId: webhookId },
    });
    if (existing) {
      this.processedWebhookIds.add(webhookId);
      return true;
    }
    return false;
  }

  public async recordWebhookIfNew(
    webhookId: string,
    eventType: string,
    transmissionId: string,
    payload: any
  ): Promise<{ isDuplicate: boolean }> {
    if (this.processedWebhookIds.has(webhookId)) {
      return { isDuplicate: true };
    }

    try {
      const existing = await prisma.paymentWebhookEvent.findUnique({
        where: { paypalEventId: webhookId },
      });

      if (existing) {
        this.processedWebhookIds.add(webhookId);
        return { isDuplicate: true };
      }

      await prisma.paymentWebhookEvent.create({
        data: {
          paypalEventId: webhookId,
          eventType: eventType || "UNKNOWN",
          transmissionId: transmissionId || webhookId,
          status: "VERIFIED",
          payload: payload || {},
          receivedAt: new Date(),
        },
      });

      this.processedWebhookIds.add(webhookId);
      return { isDuplicate: false };
    } catch (err: any) {
      // Prisma P2002: Unique constraint violation (atomic cross-worker race condition)
      if (err.code === "P2002") {
        this.processedWebhookIds.add(webhookId);
        return { isDuplicate: true };
      }
      throw err;
    }
  }

  public markWebhookProcessed(webhookId: string): void {
    this.processedWebhookIds.add(webhookId);

    prisma.paymentWebhookEvent
      .upsert({
        where: { paypalEventId: webhookId },
        update: {},
        create: {
          paypalEventId: webhookId,
          eventType: "PAYMENT.CAPTURE.COMPLETED",
          transmissionId: webhookId,
          status: "VERIFIED",
          payload: { webhookId },
          receivedAt: new Date(),
        },
      })
      .catch((err) => console.error("Error persisting webhook event to Neon:", err.message));
  }
}

// Global Singleton Store
export const store = new Store();
