import { describe, it, expect } from "vitest";
import { ShoppingAgentService } from "@/server/services/agent/assistant";
import { store } from "@/server/repositories/store";

describe("Shopping Agent & Scenario 9 Fallback Tests", () => {
  it("Scenario 9: Successfully falls back to deterministic search when AI provider is unavailable", async () => {
    // Unset or provide invalid GROQ_API_KEY to test fallback
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    const mandate = store.getMandateById("mandate_demo_headphones_100")!;
    const result = await ShoppingAgentService.generateProposal(mandate.id, "wireless headphones");

    expect(result.isAiGenerated).toBe(false);
    expect(result.modelUsed).toContain("deterministic-catalogue-rule-engine");
    expect(result.proposal.productName).toBeDefined();
    expect(result.proposal.proposedAmount).toBeDefined();
    expect(result.proposal.proposalFingerprint).toHaveLength(64);

    // Restore env
    process.env.GROQ_API_KEY = originalKey;
  });

  it("Ensures proposed price is bound strictly to database catalogue, not arbitrary input", () => {
    const mandate = store.getMandateById("mandate_demo_headphones_100")!;
    const result = ShoppingAgentService.deterministicCatalogueFallback(mandate, "AuraSound Pro");

    const trustedProduct = store.getProductById(result.proposal.productId)!;
    expect(result.proposal.proposedAmount).toBe(trustedProduct.price);
  });
});
