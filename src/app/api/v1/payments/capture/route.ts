import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/server/repositories/store";
import { AuthorizationKernel } from "@/server/services/authorization/kernel";
import { PayPalClient } from "@/lib/paypal/client";
import { TransactionPassportService } from "@/server/services/passport/ledger";

const CaptureOrderSchema = z.object({
  paymentId: z.string().min(1),
  paypalOrderId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId, paypalOrderId } = CaptureOrderSchema.parse(body);

    const payment = store.getPaymentById(paymentId);
    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment record not found" }, { status: 404 });
    }

    if (payment.status === "CAPTURED") {
      return NextResponse.json(
        { success: false, error: "Payment has already been captured.", status: "CAPTURED" },
        { status: 400 }
      );
    }

    const approval = store.getApprovalById(payment.approvalId);
    if (!approval) {
      return NextResponse.json({ success: false, error: "Approval not found" }, { status: 404 });
    }

    const proposal = store.getProposalById(payment.proposalId);
    if (!proposal) {
      return NextResponse.json({ success: false, error: "Proposal not found" }, { status: 404 });
    }

    const mandate = store.getMandateById(payment.mandateId);
    if (!mandate) {
      return NextResponse.json({ success: false, error: "Mandate not found" }, { status: 404 });
    }

    // Critical Security Rule: Revalidate authorization immediately before capture
    const preCaptureEval = AuthorizationKernel.evaluate({
      mandateId: mandate.id,
      proposalId: proposal.id,
      approvalId: approval.id,
      paymentId: payment.id,
    });

    if (preCaptureEval.decision !== "ALLOW") {
      return NextResponse.json(
        {
          success: false,
          error: "Authorization kernel blocked capture execution",
          reasonCodes: preCaptureEval.reasonCodes,
        },
        { status: 403 }
      );
    }

    // Execute capture via PayPal REST API
    const captureResult = await PayPalClient.captureOrder(
      paypalOrderId,
      `capture_${payment.id}_${Date.now()}`
    );

    const capturedAmount = captureResult.amount.value;
    const capturedCurrency = captureResult.amount.currency_code;

    // Financial Reconciliation
    const approvedNum = Number(proposal.proposedAmount);
    const capturedNum = Number(capturedAmount);
    const isReconciled = Math.abs(approvedNum - capturedNum) < 0.001;
    const reconciliationStatus = isReconciled ? "RECONCILED" : "EXCEPTION";

    // Mark approval as USED (single-use enforcement)
    store.markApprovalUsed(approval.id);

    // Update internal payment status
    store.updatePaymentStatus(
      payment.id,
      reconciliationStatus === "RECONCILED" ? "CAPTURED" : "RECONCILIATION_EXCEPTION",
      captureResult.id,
      reconciliationStatus
    );

    // Generate Cryptographic Transaction Passport
    const transactionId = `tx_${Date.now()}`;
    const passport = TransactionPassportService.createPassport({
      transactionId,
      mandate,
      proposal,
      approval,
      payment,
      capturedAmount,
      currency: capturedCurrency,
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        paypalCaptureId: captureResult.id,
        paypalOrderId,
        status: payment.status,
        capturedAmount,
        currency: capturedCurrency,
        reconciliationStatus,
        passportId: passport.id,
        verificationStatus: passport.verificationStatus,
      },
      message: "PayPal payment captured, reconciled, and Transaction Passport issued.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to capture payment" },
      { status: 400 }
    );
  }
}
