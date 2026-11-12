import { PrismaClient } from "@prisma/client";
import { SEEDED_MERCHANTS, SEEDED_PRODUCTS } from "../src/server/repositories/catalogue.data";
import { KeyManager } from "../src/lib/crypto/keys";
import { computeProposalFingerprint } from "../src/lib/crypto/fingerprint";

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log("Seeding Neon PostgreSQL database...");

  // 1. Seed Default User
  const defaultUser = await prisma.user.upsert({
    where: { email: "shopper@intentledger.ai" },
    update: {},
    create: {
      id: "usr_shopper_01",
      email: "shopper@intentledger.ai",
      name: "Demo Shopper",
    },
  });
  console.log("✔ Seeded User:", defaultUser.id);

  // 2. Seed Merchants
  for (const m of SEEDED_MERCHANTS) {
    await prisma.merchant.upsert({
      where: { slug: m.slug },
      update: {
        name: m.name,
        paypalPayeeEmail: m.paypalPayeeEmail,
        isVerified: m.isVerified,
        isDemoSeller: m.isDemoSeller,
      },
      create: {
        id: m.id,
        name: m.name,
        slug: m.slug,
        paypalPayeeEmail: m.paypalPayeeEmail,
        isVerified: m.isVerified,
        isDemoSeller: m.isDemoSeller,
      },
    });
  }
  console.log(`✔ Seeded ${SEEDED_MERCHANTS.length} Merchants`);

  // 3. Seed Products
  for (const p of SEEDED_PRODUCTS) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        description: p.description,
        category: p.category,
        merchantId: p.merchantId,
        price: p.price,
        currency: p.currency,
        attributes: p.attributes,
        inStock: p.inStock,
        deliveryEstimateDays: p.deliveryEstimateDays,
        imageUrl: p.imageUrl,
      },
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
  }
  console.log(`✔ Seeded ${SEEDED_PRODUCTS.length} Products`);

  // 4. Seed Demo Mandate 1: Active Headphones Mandate
  const mandate1Id = "mandate_demo_headphones_100";
  const mandate1Payload = {
    id: mandate1Id,
    userId: defaultUser.id,
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
    status: "ACTIVE",
    signingKeyVersion: KeyManager.KEY_VERSION,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
  const mandate1Sig = KeyManager.signCanonical({
    ...mandate1Payload,
    budgetLimit: "100.00",
    expiresAt: mandate1Payload.expiresAt.toISOString(),
  });
  const mandate1Fingerprint = KeyManager.signCanonical({
    ...mandate1Payload,
    signature: mandate1Sig,
  }).slice(0, 32);

  await prisma.intentMandate.upsert({
    where: { id: mandate1Id },
    update: {},
    create: {
      ...mandate1Payload,
      signature: mandate1Sig,
      fingerprint: mandate1Fingerprint,
    },
  });

  // 5. Seed Demo Mandate 2: Expired Mandate
  const mandateExpiredId = "mandate_demo_expired_02";
  const expiredPayload = {
    id: mandateExpiredId,
    userId: defaultUser.id,
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
    status: "EXPIRED",
    signingKeyVersion: KeyManager.KEY_VERSION,
    expiresAt: new Date(Date.now() - 24 * 3600 * 1000),
  };
  const expSig = KeyManager.signCanonical({
    ...expiredPayload,
    expiresAt: expiredPayload.expiresAt.toISOString(),
  });

  await prisma.intentMandate.upsert({
    where: { id: mandateExpiredId },
    update: {},
    create: {
      ...expiredPayload,
      signature: expSig,
      fingerprint: expSig.slice(0, 32),
    },
  });
  console.log("✔ Seeded 2 Demo Intent Mandates");

  // 6. Seed Demo Proposals
  const prop1Id = "prop_demo_85";
  const prop1Fingerprint = computeProposalFingerprint({
    mandateId: mandate1Id,
    productId: "prod_audio_01",
    merchantId: "merch_demo_01",
    proposedAmount: "85.00",
    currency: "USD",
    quantity: 1,
  });

  await prisma.purchaseProposal.upsert({
    where: { id: prop1Id },
    update: {},
    create: {
      id: prop1Id,
      mandateId: mandate1Id,
      productId: "prod_audio_01",
      merchantId: "merch_demo_01",
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
    },
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

  await prisma.purchaseProposal.upsert({
    where: { id: prop2Id },
    update: {},
    create: {
      id: prop2Id,
      mandateId: mandate1Id,
      productId: "prod_audio_02",
      merchantId: "merch_demo_01",
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
    },
  });
  console.log("✔ Seeded 2 Demo Purchase Proposals");

  console.log("Neon PostgreSQL Seeding Completed Successfully.");
}

if (require.main === module || process.argv[1]?.includes("seed.ts")) {
  seedDatabase()
    .catch((e) => {
      console.error("Seeding failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

