import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/server/repositories/store";
import { KeyManager } from "@/lib/crypto/keys";
import { IntentMandateData } from "@/types";

const CreateMandateSchema = z.object({
  title: z.string().min(3),
  naturalInstruction: z.string().min(5),
  budgetLimit: z.string().regex(/^\d+(\.\d{1,2})?$/, "Budget must be a decimal format e.g. 100.00"),
  currency: z.string().default("USD"),
  permittedMerchants: z.array(z.string()).default([]),
  restrictedMerchants: z.array(z.string()).default([]),
  requiredAttributes: z.array(z.string()).default([]),
  excludedCategories: z.array(z.string()).default([]),
  maxQuantity: z.number().int().positive().default(1),
  requireHumanApproval: z.boolean().default(true),
  expiresInDays: z.number().int().positive().default(30),
});

export async function GET() {
  await store.ensureInitialized();
  const mandates = store.listMandates();
  return NextResponse.json({ success: true, count: mandates.length, data: mandates });
}

export async function POST(req: NextRequest) {
  try {
    await store.ensureInitialized();
    const body = await req.json();
    const parsed = CreateMandateSchema.parse(body);

    const mandateId = `mandate_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + parsed.expiresInDays * 24 * 3600 * 1000).toISOString();

    const unsignedPayload = {
      id: mandateId,
      userId: "usr_shopper_01",
      title: parsed.title,
      naturalInstruction: parsed.naturalInstruction,
      budgetLimit: Number(parsed.budgetLimit).toFixed(2),
      currency: parsed.currency.toUpperCase(),
      permittedMerchants: parsed.permittedMerchants,
      restrictedMerchants: parsed.restrictedMerchants,
      requiredAttributes: parsed.requiredAttributes,
      excludedCategories: parsed.excludedCategories,
      maxQuantity: parsed.maxQuantity,
      requireHumanApproval: parsed.requireHumanApproval,
      status: "ACTIVE" as const,
      signingKeyVersion: KeyManager.KEY_VERSION,
      expiresAt,
      createdAt,
      updatedAt: createdAt,
    };

    // Digitally sign the exact structured mandate with Ed25519
    const signature = KeyManager.signCanonical(unsignedPayload);
    const fingerprint = KeyManager.signCanonical({ ...unsignedPayload, signature }).slice(0, 32);

    const mandate: IntentMandateData = {
      ...unsignedPayload,
      signature,
      fingerprint,
    };

    await store.saveMandate(mandate);

    return NextResponse.json(
      {
        success: true,
        data: mandate,
        message: "Mandate cryptographically signed and activated.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create mandate" },
      { status: 400 }
    );
  }
}

