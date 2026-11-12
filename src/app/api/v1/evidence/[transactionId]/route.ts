import { NextRequest, NextResponse } from "next/server";
import { store } from "@/server/repositories/store";
import { EvidenceAssessor } from "@/server/services/evidence/assessor";
import { IntentDriftDetector } from "@/server/services/evidence/drift";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  await store.ensureInitialized();
  const { transactionId } = await params;
  const passport = store.getPassportByTransactionId(transactionId) || store.getPassportById(transactionId);

  if (!passport) {
    return NextResponse.json(
      { success: false, error: `No passport or transaction found for ${transactionId}` },
      { status: 404 }
    );
  }

  const mandate = store.getMandateById(passport.mandateId);
  const proposal = store.getProposalById(passport.proposalId);
  const approval = store.getApprovalById(passport.approvalId);
  const payment = store.getPaymentById(passport.paymentId);

  const assessment = EvidenceAssessor.assessTransaction(passport);

  const driftReport = mandate && proposal
    ? IntentDriftDetector.analyzeDrift({
        mandate,
        proposal,
        approval,
        payment,
        capturedAmount: passport.summary.amount,
      })
    : null;

  return NextResponse.json({
    success: true,
    data: {
      assessment,
      driftReport,
      passportSummary: passport.summary,
    },
  });
}

