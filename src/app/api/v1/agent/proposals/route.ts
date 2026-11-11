import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ShoppingAgentService } from "@/server/services/agent/assistant";
import { AuthorizationKernel } from "@/server/services/authorization/kernel";

const GenerateProposalSchema = z.object({
  mandateId: z.string().min(1),
  query: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mandateId, query } = GenerateProposalSchema.parse(body);

    const result = await ShoppingAgentService.generateProposal(mandateId, query);

    // Run deterministic policy evaluation against the newly generated proposal
    const evaluation = AuthorizationKernel.evaluate({
      mandateId,
      proposalId: result.proposal.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        proposal: result.proposal,
        evaluation,
        provenance: {
          isAiGenerated: result.isAiGenerated,
          modelUsed: result.modelUsed,
          sourceProvenance: result.sourceProvenance,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate proposal" },
      { status: 400 }
    );
  }
}
