import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/server/repositories/store";
import { AuthorizationKernel } from "@/server/services/authorization/kernel";
import { PayPalClient } from "@/lib/paypal/client";
import { validateAndResolveRedirectUrls } from "@/lib/paypal/redirects";
import { PaymentRecord } from "@/types";

const CreateOrderSchema = z.object({
  approvalId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await store.ensureInitialized();
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

    // Payee identity resolution: Enforce configured PayPal Sandbox payee priority
    const payeeEmail = store.resolvePayeeEmail(proposal.merchantId);

    if (!payeeEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Unconfigured PayPal Sandbox Payee: PAYPAL_DEMO_PAYEE_EMAIL is missing from environment or unassigned to merchant.",
        },
        { status: 500 }
      );
    }

    // Security: Derive return and cancel URLs strictly from validated server-side APP_BASE_URL.
    // Untrusted client inputs and forwarded request headers are strictly rejected.
    const { returnUrl, cancelUrl } = validateAndResolveRedirectUrls();

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

    await store.savePayment(paymentRecord);

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

