import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ShoppingAgentService } from "@/server/services/agent/assistant";
import { AuthorizationKernel } from "@/server/services/authorization/kernel";

import { store } from "@/server/repositories/store";

const GenerateProposalSchema = z.object({
  mandateId: z.string().min(1),
  query: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await store.ensureInitialized();
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

export async function GET(req: NextRequest) {
  try {
    await store.ensureInitialized();
    const { searchParams } = new URL(req.url);
    let proposalId = searchParams.get("proposalId");
    const orderId = searchParams.get("orderId");

    // Recover via orderId if provided
    let matchedPayment = orderId ? store.getPaymentByOrderId(orderId) : undefined;
    if (orderId && !matchedPayment) {
      const { prisma } = await import("@/lib/database/prisma");
      const dbPayment = await prisma.payment.findUnique({
        where: { paypalOrderId: orderId },
      });
      if (dbPayment) {
        matchedPayment = {
          id: dbPayment.id,
          approvalId: dbPayment.approvalId,
          mandateId: dbPayment.mandateId,
          proposalId: dbPayment.proposalId,
          paypalOrderId: dbPayment.paypalOrderId,
          paypalPayeeEmail: dbPayment.paypalPayeeEmail,
          merchantName: "Demo Electronics",
          productName: "AuraSound Pro ANC Wireless Headphones",
          amount: Number(dbPayment.amount).toFixed(2),
          currency: dbPayment.currency,
          status: dbPayment.status as any,
          createdAt: dbPayment.createdAt.toISOString(),
        };
      }
    }

    if (!proposalId && matchedPayment) {
      proposalId = matchedPayment.proposalId;
    }

    if (proposalId) {
      let proposal = store.getProposalById(proposalId);
      if (!proposal) {
        // Fallback to Neon if not in memory
        const { prisma } = await import("@/lib/database/prisma");
        const dbProposal = await prisma.purchaseProposal.findUnique({
          where: { id: proposalId },
        });
        if (dbProposal) {
          const prod = store.getProductById(dbProposal.productId);
          const merch = store.getMerchantById(dbProposal.merchantId);
          proposal = {
            id: dbProposal.id,
            mandateId: dbProposal.mandateId,
            productId: dbProposal.productId,
            productName: prod ? prod.name : "Authorized Product",
            merchantId: dbProposal.merchantId,
            merchantName: merch ? merch.name : "Demo Electronics",
            proposedAmount: Number(dbProposal.proposedAmount).toFixed(2),
            currency: dbProposal.currency,
            quantity: dbProposal.quantity,
            proposalFingerprint: dbProposal.proposalFingerprint,
            reasoningSummary: dbProposal.reasoningSummary,
            constraintsSatisfied: (dbProposal.constraintsSatisfied as string[]) || [],
            constraintsViolated: (dbProposal.constraintsViolated as string[]) || [],
            requiresHumanApproval: dbProposal.requiresHumanApproval,
            status: dbProposal.status as any,
            createdAt: dbProposal.createdAt.toISOString(),
          };
        }
      }

      if (!proposal) {
        return NextResponse.json({ success: false, error: "Proposal not found" }, { status: 404 });
      }

      const merchant = store.getMerchantById(proposal.merchantId);
      const payeeEmail = store.resolvePayeeEmail(proposal.merchantId);

      // Find matching approval
      let matchedApproval = store.getApprovalByProposalId(proposal.id);
      if (!matchedApproval) {
        const { prisma } = await import("@/lib/database/prisma");
        const dbApp = await prisma.approval.findFirst({
          where: { proposalId: proposal.id },
          orderBy: { approvedAt: "desc" },
        });
        if (dbApp) {
          matchedApproval = {
            id: dbApp.id,
            proposalId: dbApp.proposalId,
            mandateId: dbApp.mandateId,
            proposalFingerprint: dbApp.proposalFingerprint,
            customerConsent: dbApp.customerConsent,
            status: dbApp.status as any,
            approvedAt: dbApp.approvedAt.toISOString(),
            expiresAt: dbApp.expiresAt.toISOString(),
            usedAt: dbApp.usedAt?.toISOString(),
          };
        }
      }

      // If matchedPayment wasn't found by orderId, look up by proposalId
      if (!matchedPayment) {
        matchedPayment = store.getPaymentByProposalId(proposal.id);
      }
      if (!matchedPayment) {
        const { prisma } = await import("@/lib/database/prisma");
        const dbPay = await prisma.payment.findFirst({
          where: { proposalId: proposal.id },
          orderBy: { createdAt: "desc" },
        });
        if (dbPay) {
          matchedPayment = {
            id: dbPay.id,
            approvalId: dbPay.approvalId,
            mandateId: dbPay.mandateId,
            proposalId: dbPay.proposalId,
            paypalOrderId: dbPay.paypalOrderId,
            paypalPayeeEmail: dbPay.paypalPayeeEmail,
            merchantName: proposal.merchantName,
            productName: proposal.productName,
            amount: Number(dbPay.amount).toFixed(2),
            currency: dbPay.currency,
            status: dbPay.status as any,
            createdAt: dbPay.createdAt.toISOString(),
          };
        }
      }

      const evaluation = AuthorizationKernel.evaluate({
        mandateId: proposal.mandateId,
        proposalId: proposal.id,
        approvalId: matchedApproval?.id,
        paymentId: matchedPayment?.id,
      });

      return NextResponse.json({
        success: true,
        data: {
          proposal: {
            ...proposal,
            paypalPayeeEmail: payeeEmail,
          },
          evaluation,
          merchant: merchant ? { ...merchant, paypalPayeeEmail: payeeEmail } : null,
          payeeEmail,
          approval: matchedApproval || null,
          payment: matchedPayment || null,
        },
      });
    }

    const proposals = store.listProposals();
    return NextResponse.json({
      success: true,
      data: proposals,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch proposal" },
      { status: 500 }
    );
  }
}

