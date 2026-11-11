import { z } from "zod";
import { store } from "@/server/repositories/store";
import { ProductData, PurchaseProposalData } from "@/types";
import { computeProposalFingerprint } from "@/lib/crypto/fingerprint";

export const ProposalGenerationSchema = z.object({
  intentSummary: z.string(),
  selectedProductId: z.string(),
  merchantId: z.string(),
  proposedAmount: z.string(),
  currency: z.string().default("USD"),
  reasoningSummary: z.string(),
  constraintsSatisfied: z.array(z.string()),
  constraintsViolated: z.array(z.string()),
  requiresHumanApproval: z.boolean().default(true),
});

export interface AgentRecommendationResult {
  proposal: PurchaseProposalData;
  isAiGenerated: boolean;
  modelUsed: string;
  sourceProvenance: string;
}

export class ShoppingAgentService {
  /**
   * Generates a catalogue-backed purchase proposal against an intent mandate.
   * If Groq API is unavailable or unconfigured, falls back cleanly to deterministic search.
   */
  public static async generateProposal(
    mandateId: string,
    query: string
  ): Promise<AgentRecommendationResult> {
    const mandate = store.getMandateById(mandateId);
    if (!mandate) {
      throw new Error(`Mandate ${mandateId} not found`);
    }

    const groqKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    if (groqKey && groqKey.trim().length > 10) {
      try {
        const aiProposal = await this.callGroqStructured(mandate, query, groqKey, model);
        return aiProposal;
      } catch (err) {
        console.warn("Groq API call failed, falling back to deterministic search:", err);
      }
    }

    // Deterministic catalogue-search fallback (Scenario 9)
    return this.deterministicCatalogueFallback(mandate, query);
  }

  /**
   * Deterministic catalogue recommendation fallback.
   * Resolves solely from trusted database records.
   */
  public static deterministicCatalogueFallback(
    mandate: ReturnType<typeof store.getMandateById> & object,
    query: string
  ): AgentRecommendationResult {
    const matchingProducts = store.searchProducts(query);
    const candidate =
      matchingProducts.find((p) => p.inStock) ||
      store.listProducts().find((p) => p.inStock) ||
      store.listProducts()[0];

    const merchant = store.getMerchantById(candidate.merchantId);
    const merchantName = merchant ? merchant.name : candidate.merchantName;

    // Evaluate constraints against candidate
    const satisfied: string[] = [];
    const violated: string[] = [];

    if (Number(candidate.price) <= Number(mandate.budgetLimit)) {
      satisfied.push("BUDGET_COMPLIANT");
    } else {
      violated.push("BUDGET_EXCEEDED");
    }

    if (
      mandate.permittedMerchants.length === 0 ||
      mandate.permittedMerchants.some((m) => m.toLowerCase() === merchantName.toLowerCase())
    ) {
      satisfied.push("MERCHANT_PERMITTED");
    } else {
      violated.push("MERCHANT_NOT_PERMITTED");
    }

    if (candidate.attributes.some((a) => mandate.requiredAttributes.includes(a))) {
      satisfied.push("REQUIRED_ATTRIBUTES_MET");
    }

    const proposalId = `prop_${Date.now()}`;
    const fingerprint = computeProposalFingerprint({
      mandateId: mandate.id,
      productId: candidate.id,
      merchantId: candidate.merchantId,
      proposedAmount: candidate.price,
      currency: candidate.currency,
      quantity: 1,
    });

    const proposal: PurchaseProposalData = {
      id: proposalId,
      mandateId: mandate.id,
      productId: candidate.id,
      productName: candidate.name,
      merchantId: candidate.merchantId,
      merchantName,
      proposedAmount: candidate.price,
      currency: candidate.currency,
      quantity: 1,
      proposalFingerprint: fingerprint,
      reasoningSummary: `Deterministic catalogue recommendation: ${candidate.name} priced at $${candidate.price} ${candidate.currency} from ${merchantName}.`,
      constraintsSatisfied: satisfied,
      constraintsViolated: violated,
      requiresHumanApproval: mandate.requireHumanApproval,
      status: violated.length > 0 ? "BLOCKED" : "PENDING",
      createdAt: new Date().toISOString(),
    };

    store.saveProposal(proposal);

    return {
      proposal,
      isAiGenerated: false,
      modelUsed: "deterministic-catalogue-rule-engine",
      sourceProvenance: "Deterministic Internal Catalogue Search (Trusted Ground Truth)",
    };
  }

  private static async callGroqStructured(
    mandate: ReturnType<typeof store.getMandateById> & object,
    query: string,
    apiKey: string,
    model: string
  ): Promise<AgentRecommendationResult> {
    const catalogueSnippet = store.listProducts().map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      merchantId: p.merchantId,
      merchantName: p.merchantName,
      attributes: p.attributes,
      inStock: p.inStock,
    }));

    const systemPrompt = `You are INTENTLEDGER Shopping Agent. Convert customer intent into a structured purchase proposal based exclusively on the provided database catalogue.
Never fabricate products, prices, or merchants. Select an existing product from the catalogue.
Return strict JSON matching this schema:
{
  "intentSummary": "string",
  "selectedProductId": "string",
  "merchantId": "string",
  "proposedAmount": "string (e.g. 85.00)",
  "currency": "USD",
  "reasoningSummary": "string",
  "constraintsSatisfied": ["string"],
  "constraintsViolated": ["string"],
  "requiresHumanApproval": true
}`;

    const userPrompt = `Customer Query: "${query}"
Customer Mandate:
- Budget Limit: $${mandate.budgetLimit} ${mandate.currency}
- Permitted Merchants: ${JSON.stringify(mandate.permittedMerchants)}
- Restricted Merchants: ${JSON.stringify(mandate.restrictedMerchants)}
- Required Attributes: ${JSON.stringify(mandate.requiredAttributes)}
- Excluded Categories: ${JSON.stringify(mandate.excludedCategories)}

Catalogue:
${JSON.stringify(catalogueSnippet, null, 2)}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq HTTP ${response.status}: ${await response.text()}`);
    }

    const json = (await response.json()) as { choices: { message: { content: string } }[] };
    const rawContent = json.choices?.[0]?.message?.content;
    const parsed = ProposalGenerationSchema.parse(JSON.parse(rawContent));

    // Security boundary: Overwrite model-generated price with actual catalogue price
    const trustedProduct = store.getProductById(parsed.selectedProductId);
    if (!trustedProduct) {
      throw new Error(`Model selected nonexistent product: ${parsed.selectedProductId}`);
    }

    const proposalId = `prop_${Date.now()}`;
    const fingerprint = computeProposalFingerprint({
      mandateId: mandate.id,
      productId: trustedProduct.id,
      merchantId: trustedProduct.merchantId,
      proposedAmount: trustedProduct.price,
      currency: trustedProduct.currency,
      quantity: 1,
    });

    const proposal: PurchaseProposalData = {
      id: proposalId,
      mandateId: mandate.id,
      productId: trustedProduct.id,
      productName: trustedProduct.name,
      merchantId: trustedProduct.merchantId,
      merchantName: trustedProduct.merchantName,
      proposedAmount: trustedProduct.price,
      currency: trustedProduct.currency,
      quantity: 1,
      proposalFingerprint: fingerprint,
      reasoningSummary: parsed.reasoningSummary,
      constraintsSatisfied: parsed.constraintsSatisfied,
      constraintsViolated: parsed.constraintsViolated,
      requiresHumanApproval: mandate.requireHumanApproval,
      status: parsed.constraintsViolated.length > 0 ? "BLOCKED" : "PENDING",
      createdAt: new Date().toISOString(),
    };

    store.saveProposal(proposal);

    return {
      proposal,
      isAiGenerated: true,
      modelUsed: model,
      sourceProvenance: `Groq Cloud API (${model}) verified against Database Catalogue`,
    };
  }
}
