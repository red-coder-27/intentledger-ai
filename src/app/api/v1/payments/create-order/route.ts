import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/server/repositories/store";
import { AuthorizationKernel } from "@/server/services/authorization/kernel";
import { PayPalClient } from "@/lib/paypal/client";
import { PaymentRecord } from "@/types";

const CreateOrderSchema = z.object({
  approvalId: z.string().min(1),
  returnUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { approvalId } = CreateOrderSchema.parse(body);

    const approval = store.getApprovalById(approvalId);
    if (!approval) {
      return NextResponse.json({ success: false, error: "Approval not found" }, { status: 404 });
    }

    const proposal = store.getProposalById(approval.proposalId);
    if (!proposal) {
      return NextResponse.json({ success: false, error: "Proposal not found" }, { status: 404 });
    }

    const mandate = store.getMandateById(approval.mandateId);
    if (!mandate) {
      return NextResponse.json({ success: false, error: "Mandate not found" }, { status: 404 });
    }

    // Critical Security Rule: Server-side revalidation immediately before creating order
    const evaluation = AuthorizationKernel.evaluate({
      mandateId: mandate.id,
      proposalId: proposal.id,
      approvalId: approval.id,
    });

    if (evaluation.decision !== "ALLOW") {
      return NextResponse.json(
        {
          success: false,
          error: "Authorization policy rejected order creation",
          reasonCodes: evaluation.reasonCodes,
        },
        { status: 403 }
      );
    }

    // Payee identity resolution: Map demonstration seller to configured PayPal Sandbox payee
    const merchant = store.getMerchantById(proposal.merchantId);
    const payeeEmail = merchant?.paypalPayeeEmail || process.env.PAYPAL_DEMO_PAYEE_EMAIL || "merchant-demo@intentledger.ai";

    const origin = req.nextUrl.origin || "http://localhost:3000";
    const returnUrl = `${origin}/app/transactions?status=approved`;
    const cancelUrl = `${origin}/app/authorization?status=cancelled`;

    // Call PayPal Orders API v2
    const paypalOrder = await PayPalClient.createOrder({
      amount: proposal.proposedAmount,
      currency: proposal.currency,
      referenceId: proposal.id,
      customId: mandate.id,
      description: `INTENTLEDGER: ${proposal.productName}`,
      payeeEmail,
      returnUrl,
      cancelUrl,
      idempotencyKey: `order_${approval.id}_${proposal.proposedAmount}`,
    });

    const paymentId = `pay_${Date.now()}`;
    const paymentRecord: PaymentRecord = {
      id: paymentId,
      approvalId: approval.id,
      mandateId: mandate.id,
      proposalId: proposal.id,
      paypalOrderId: paypalOrder.id,
      paypalPayeeEmail: payeeEmail,
      merchantName: proposal.merchantName,
      productName: proposal.productName,
      amount: proposal.proposedAmount,
      currency: proposal.currency,
      status: "CREATED",
      createdAt: new Date().toISOString(),
    };

    store.savePayment(paymentRecord);

    return NextResponse.json({
      success: true,
      data: {
        paymentId: paymentRecord.id,
        paypalOrderId: paypalOrder.id,
        approvalUrl: paypalOrder.payerActionUrl,
        status: "CREATED",
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        sandboxNotice: "PayPal Developer Sandbox mode active. No actual financial funds transferred.",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create PayPal order" },
      { status: 400 }
    );
  }
}
