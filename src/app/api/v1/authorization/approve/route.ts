import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/server/repositories/store";
import { ApprovalData } from "@/types";
import { verifyProposalFingerprint } from "@/lib/crypto/fingerprint";

const ApproveProposalSchema = z.object({
  proposalId: z.string().min(1),
  proposalFingerprint: z.string().min(1),
  customerConsent: z.boolean().refine((val) => val === true, "Explicit customer consent is required"),
});

export async function POST(req: NextRequest) {
  try {
    await store.ensureInitialized();
    const body = await req.json();
    const parsed = ApproveProposalSchema.parse(body);

    const proposal = store.getProposalById(parsed.proposalId);
    if (!proposal) {
      return NextResponse.json({ success: false, error: "Proposal not found" }, { status: 404 });
    }

    const mandate = store.getMandateById(proposal.mandateId);
    if (!mandate) {
      return NextResponse.json({ success: false, error: "Associated mandate not found" }, { status: 404 });
    }

    // Verify fingerprint integrity
    const isFingerprintMatch = verifyProposalFingerprint(parsed.proposalFingerprint, {
      mandateId: mandate.id,
      productId: proposal.productId,
      merchantId: proposal.merchantId,
      proposedAmount: proposal.proposedAmount,
      currency: proposal.currency,
      quantity: proposal.quantity,
    });

    if (!isFingerprintMatch) {
      return NextResponse.json(
        {
          success: false,
          error: "Proposal fingerprint mismatch. Proposal parameters may have been tampered with.",
          reasonCode: "PROPOSAL_FINGERPRINT_MISMATCH",
        },
        { status: 403 }
      );
    }

    // Verify merchant and payee mapping
    const payeeEmail = store.resolvePayeeEmail(proposal.merchantId);

    if (!payeeEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Unconfigured PayPal Sandbox Payee: Proposal merchant is not mapped to a valid PayPal payee.",
          reasonCode: "MERCHANT_NOT_CONFIGURED",
        },
        { status: 500 }
      );
    }

    const approvalId = `appr_${Date.now()}`;
    const approval: ApprovalData = {
      id: approvalId,
      proposalId: proposal.id,
      mandateId: mandate.id,
      proposalFingerprint: parsed.proposalFingerprint,
      customerConsent: true,
      status: "APPROVED",
      approvedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15-minute validity window
    };

    await store.saveApproval(approval);

    // Update proposal status
    proposal.status = "APPROVED";
    await store.saveProposal(proposal);

    return NextResponse.json({
      success: true,
      data: approval,
      message: "Proposal explicitly approved by customer. Ready for PayPal order execution.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to approve proposal" },
      { status: 400 }
    );
  }
}

