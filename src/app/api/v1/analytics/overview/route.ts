import { NextResponse } from "next/server";
import { store } from "@/server/repositories/store";

export async function GET() {
  const mandates = store.listMandates();
  const activeMandates = mandates.filter((m) => m.status === "ACTIVE").length;

  const decisions = store.listDecisions();
  const blockedAttempts = decisions.filter((d) => d.decision === "BLOCK").length;
  const allowedDecisions = decisions.filter((d) => d.decision === "ALLOW").length;

  const payments = store.listPayments();
  const successfulPayments = payments.filter((p) => p.status === "CAPTURED").length;
  const reconciliationMismatches = payments.filter(
    (p) => p.status === "RECONCILIATION_EXCEPTION" || p.reconciliationStatus === "EXCEPTION"
  ).length;

  const totalValueTransacted = payments
    .filter((p) => p.status === "CAPTURED")
    .reduce((sum, p) => sum + Number(p.amount), 0)
    .toFixed(2);

  const passports = store.listPassports();
  const verifiedPassports = passports.filter((p) => p.verificationStatus === "VERIFIED").length;

  return NextResponse.json({
    success: true,
    data: {
      metrics: {
        totalSandboxTransactions: payments.length,
        successfulPayments,
        blockedAttempts,
        activeMandates,
        intentDriftIncidents: blockedAttempts,
        reconciliationMismatches,
        totalValueTransacted,
        verifiedPassports,
      },
      provenance: {
        source: "Persisted Application Database Records",
        sandboxMode: true,
        generatedAt: new Date().toISOString(),
      },
      recentActivity: payments.slice(0, 5),
    },
  });
}
