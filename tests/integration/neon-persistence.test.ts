import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Store } from "@/server/repositories/store";
import { prisma } from "@/lib/database/prisma";
import { KeyManager } from "@/lib/crypto/keys";
import { IntentMandateData } from "@/types";

describe("Neon PostgreSQL Database Persistence Verification", () => {
  const store = new Store();
  const testMandateId = `mandate_neon_test_${Date.now()}`;
  const testWebhookId = `WH-TEST-${Date.now()}`;

  beforeAll(async () => {
    await store.ensureInitialized();
  });

  afterAll(async () => {
    // Cleanup test mandate and webhook from database
    try {
      await prisma.intentMandate.deleteMany({ where: { id: testMandateId } });
      await prisma.paymentWebhookEvent.deleteMany({ where: { paypalEventId: testWebhookId } });
    } catch {
      // ignore
    }
    await prisma.$disconnect();
  });

  it("1. Connects to Neon PostgreSQL and executes a raw verification query", async () => {
    const result: any = await prisma.$queryRaw`SELECT current_database() as db_name, version() as version`;
    expect(result).toBeDefined();
    expect(result[0].db_name).toBe("neondb");
    expect(result[0].version).toContain("PostgreSQL");
  });

  it("2. CREATE: Persists a new mandate into Neon PostgreSQL", async () => {
    const mandatePayload = {
      id: testMandateId,
      userId: "usr_shopper_01",
      title: "Neon Integration Test Mandate",
      naturalInstruction: "Authorize verified test purchase via Neon PostgreSQL persistence.",
      budgetLimit: "125.50",
      currency: "USD",
      permittedMerchants: ["Demo Electronics"],
      restrictedMerchants: ["ShadyDeals LLC"],
      requiredAttributes: ["wireless"],
      excludedCategories: ["refurbished"],
      maxQuantity: 1,
      requireHumanApproval: true,
      status: "ACTIVE" as const,
      signingKeyVersion: KeyManager.KEY_VERSION,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const signature = KeyManager.signCanonical(mandatePayload);
    const fingerprint = KeyManager.signCanonical({ ...mandatePayload, signature }).slice(0, 32);

    const mandate: IntentMandateData = {
      ...mandatePayload,
      signature,
      fingerprint,
    };

    // Save through repository with full database-level await
    await store.saveMandate(mandate);

    // Direct query against Neon database to confirm physical presence
    const dbRecord = await prisma.intentMandate.findUnique({
      where: { id: testMandateId },
    });

    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.id).toBe(testMandateId);
    expect(dbRecord?.title).toBe("Neon Integration Test Mandate");
    expect(Number(dbRecord?.budgetLimit)).toBe(125.50);
    expect(dbRecord?.status).toBe("ACTIVE");
    expect(dbRecord?.signature).toBe(signature);
  });

  it("3. READ: Reads the persisted mandate through store and confirms field parity", async () => {
    const retrieved = store.getMandateById(testMandateId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(testMandateId);
    expect(retrieved?.budgetLimit).toBe("125.50");
    expect(retrieved?.status).toBe("ACTIVE");
  });

  it("4. UPDATE: Updates status to REVOKED and verifies persistence in Neon", async () => {
    const revoked = await store.revokeMandate(testMandateId);
    expect(revoked).toBeDefined();
    expect(revoked?.status).toBe("REVOKED");

    // Direct query against Neon database to confirm status update
    const dbRecord = await prisma.intentMandate.findUnique({
      where: { id: testMandateId },
    });

    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.status).toBe("REVOKED");
  });

  it("5. RESTART PERSISTENCE: Instantiates a brand new Store and verifies record survives process restart", async () => {
    // Instantiate an independent store simulating a server restart
    const freshStoreAfterRestart = new Store();

    // Await synchronization from Neon PostgreSQL
    await freshStoreAfterRestart.syncFromDatabase();

    // Read the mandate from the new store instance
    const restartedMandate = freshStoreAfterRestart.getMandateById(testMandateId);

    expect(restartedMandate).toBeDefined();
    expect(restartedMandate?.id).toBe(testMandateId);
    expect(restartedMandate?.title).toBe("Neon Integration Test Mandate");
    expect(restartedMandate?.status).toBe("REVOKED");
    expect(restartedMandate?.budgetLimit).toBe("125.50");
  });

  it("6. DATABASE-LEVEL WEBHOOK IDEMPOTENCY: Rejects duplicate webhook at DB level even across independent memory stores", async () => {
    // Record webhook in primary store
    const firstAttempt = await store.recordWebhookIfNew(
      testWebhookId,
      "PAYMENT.CAPTURE.COMPLETED",
      testWebhookId,
      { test: true }
    );
    expect(firstAttempt.isDuplicate).toBe(false);

    // Verify it is physically in Neon
    const dbWebhook = await prisma.paymentWebhookEvent.findUnique({
      where: { paypalEventId: testWebhookId },
    });
    expect(dbWebhook).not.toBeNull();
    expect(dbWebhook?.paypalEventId).toBe(testWebhookId);

    // Instantiate a separate store with cold webhook set
    const freshStore = new Store();
    await freshStore.ensureInitialized();
    const secondAttempt = await freshStore.recordWebhookIfNew(
      testWebhookId,
      "PAYMENT.CAPTURE.COMPLETED",
      testWebhookId,
      { test: true }
    );

    // Must be identified as duplicate directly via Neon database query
    expect(secondAttempt.isDuplicate).toBe(true);
  });

  it("7. DURABILITY ROLLBACK: Rejects invalid writes, throws error, and rolls back memory to prevent false success", async () => {
    const invalidMandateId = `mandate_invalid_${Date.now()}`;
    const invalidMandate = {
      id: invalidMandateId,
      userId: "non_existent_user_9999", // Violates foreign key constraint User.id
      title: "FK Violation Mandate",
      naturalInstruction: "Should fail database constraint",
      budgetLimit: "100.00",
      currency: "USD",
      permittedMerchants: [],
      restrictedMerchants: [],
      requiredAttributes: [],
      excludedCategories: [],
      maxQuantity: 1,
      requireHumanApproval: true,
      status: "ACTIVE" as const,
      signature: "sig_invalid",
      signingKeyVersion: "v1",
      fingerprint: "fp_invalid",
      expiresAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Awaiting saveMandate MUST reject with foreign key error
    await expect(store.saveMandate(invalidMandate)).rejects.toThrow();

    // In-memory store MUST be rolled back: no phantom record
    const phantom = store.getMandateById(invalidMandateId);
    expect(phantom).toBeUndefined();
  });
});

