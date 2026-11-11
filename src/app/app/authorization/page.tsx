"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Key,
  CreditCard,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { ApprovalData, IntentMandateData, PurchaseProposalData } from "@/types";

export default function AuthorizationCenterPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-[#64748B]">Loading Authorization Center...</div>}>
      <AuthorizationContent />
    </Suspense>
  );
}

function AuthorizationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetProposalId = searchParams.get("proposalId");

  const [proposals, setProposals] = useState<PurchaseProposalData[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<PurchaseProposalData | null>(null);
  const [mandate, setMandate] = useState<IntentMandateData | null>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [approval, setApproval] = useState<ApprovalData | null>(null);

  const [approving, setApproving] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [paypalResult, setPaypalResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      // Load proposals from store
      const res = await fetch("/api/v1/agent/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mandateId: "mandate_demo_headphones_100",
          query: "wireless headphones",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedProposal(json.data.proposal);
        setEvaluation(json.data.evaluation);

        // Fetch mandate details
        const mRes = await fetch("/api/v1/intents");
        const mJson = await mRes.json();
        if (mJson.success) {
          const matched = mJson.data.find((m: any) => m.id === json.data.proposal.mandateId);
          setMandate(matched);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [targetProposalId]);

  // Step 1: Human Approval of Exact Proposal
  const handleApprove = async () => {
    if (!selectedProposal) return;
    setApproving(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/authorization/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: selectedProposal.id,
          proposalFingerprint: selectedProposal.proposalFingerprint,
          customerConsent: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Approval failed");
      }

      setApproval(json.data);
    } catch (err: any) {
      setError(err.message || "Failed to approve proposal");
    } finally {
      setApproving(false);
    }
  };

  // Step 2: Create PayPal Order
  const handleCreatePayPalOrder = async () => {
    if (!approval) return;
    setCreatingOrder(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId: approval.id }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create PayPal order");
      }

      setPaypalResult(json.data);
    } catch (err: any) {
      setError(err.message || "PayPal order creation failed");
    } finally {
      setCreatingOrder(false);
    }
  };

  // Step 3: Capture Order & Reconcile
  const handleCaptureOrder = async () => {
    if (!paypalResult) return;
    setCapturing(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/payments/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: paypalResult.paymentId,
          paypalOrderId: paypalResult.paypalOrderId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to capture payment");
      }

      // Redirect to newly generated Transaction Passport!
      router.push(`/app/passports/${json.data.passportId}`);
    } catch (err: any) {
      setError(err.message || "Payment capture failed");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-2">
        <h1 className="text-xl font-bold tracking-tight text-[#102A43]">
          Authorization Center & PayPal Checkout Gate
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Explicit proposal-bound human approval. No payment can be created or captured without an exact matching cryptographic fingerprint.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded text-xs text-[#C2413B] flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {selectedProposal && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Review Proposal & Mandate (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Purchase Details */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[#1769AA] uppercase font-bold">
                    Pending Authorization
                  </span>
                  <h2 className="text-base font-bold text-[#102A43] mt-0.5">
                    {selectedProposal.productName}
                  </h2>
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">
                    Merchant: <strong className="text-[#102A43]">{selectedProposal.merchantName}</strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-bold font-mono text-[#102A43] tabular-nums">
                    ${selectedProposal.proposedAmount}
                  </span>
                  <span className="text-xs font-mono text-[#64748B] ml-1">{selectedProposal.currency}</span>
                </div>
              </div>

              {/* Mandate Comparison Table */}
              <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded space-y-2 text-xs">
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1.5 font-mono">
                  <span className="text-[#64748B]">Original Customer Instruction:</span>
                  <span className="text-[#102A43] font-sans font-medium text-right max-w-xs">
                    "{mandate?.naturalInstruction || "Find wireless headphones under $100..."}"
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1.5 font-mono">
                  <span className="text-[#64748B]">Signed Mandate Budget Limit:</span>
                  <span className="font-bold text-[#1769AA]">${mandate?.budgetLimit || "100.00"} USD</span>
                </div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-1.5 font-mono">
                  <span className="text-[#64748B]">Remaining Authorized Headroom:</span>
                  <span className="font-bold text-[#16835D]">
                    ${(Number(mandate?.budgetLimit || 100) - Number(selectedProposal.proposedAmount)).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between font-mono pt-0.5">
                  <span className="text-[#64748B]">PayPal Sandbox Target Payee:</span>
                  <span className="text-[#102A43] font-medium">merchant-demo@intentledger.ai</span>
                </div>
              </div>

              {/* Proposal Fingerprint */}
              <div className="p-3 bg-[#F0F3F7] rounded text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-[#102A43] font-mono font-semibold">
                  <Key className="h-3.5 w-3.5 text-[#1769AA]" />
                  <span>Proposal SHA-256 Fingerprint:</span>
                </div>
                <p className="font-mono text-[11px] text-[#334155] break-all">
                  {selectedProposal.proposalFingerprint}
                </p>
                <p className="text-[10px] text-[#64748B]">
                  * Any change to price, product, merchant, or quantity will invalidate this fingerprint immediately.
                </p>
              </div>

              {/* Policy Checks Detail */}
              {evaluation?.checksDetail && (
                <div className="pt-2 border-t border-[#F0F3F7] space-y-2">
                  <span className="text-xs font-bold text-[#102A43] block">
                    Deterministic Kernel Policy Verification (18 Checks)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                    {evaluation.checksDetail.slice(0, 8).map((c: any) => (
                      <div
                        key={c.checkName}
                        className={`p-2 border rounded flex items-center justify-between ${
                          c.passed
                            ? "bg-[#E8F5E9] border-[#C8E6C9] text-[#16835D]"
                            : "bg-[#FEE2E2] border-[#FECACA] text-[#C2413B]"
                        }`}
                      >
                        <span className="truncate">{c.checkName}</span>
                        {c.passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Approval & PayPal Execution Steps */}
          <div className="space-y-4">
            {/* Step 1: Human Approval */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#1769AA] text-white flex items-center justify-center font-mono text-xs font-bold">
                  1
                </span>
                <h3 className="text-xs font-bold text-[#102A43] uppercase tracking-wider font-mono">
                  Exact Human Approval
                </h3>
              </div>

              <p className="text-xs text-[#64748B]">
                Explicitly bind your authorization to the exact proposal parameters:
              </p>

              <div className="p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[11px] text-[#334155]">
                "I authorize <strong>{selectedProposal.productName}</strong> for exactly <strong>${selectedProposal.proposedAmount} USD</strong> under mandate {selectedProposal.mandateId}."
              </div>

              {!approval ? (
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="w-full py-2.5 px-4 bg-[#1769AA] hover:bg-[#12538A] text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{approving ? "Locking Fingerprint..." : "Authorize Exact Proposal"}</span>
                </button>
              ) : (
                <div className="p-2.5 bg-[#E8F5E9] border border-[#C8E6C9] rounded text-xs text-[#16835D] flex items-center gap-2 font-mono">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Approval Locked: {approval.id}</span>
                </div>
              )}
            </div>

            {/* Step 2: PayPal Order Creation */}
            <div className={`bg-white border rounded-lg p-5 space-y-3 ${approval ? "border-[#E2E8F0]" : "border-[#E2E8F0] opacity-50"}`}>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#102A43] text-white flex items-center justify-center font-mono text-xs font-bold">
                  2
                </span>
                <h3 className="text-xs font-bold text-[#102A43] uppercase tracking-wider font-mono">
                  PayPal Order Creation
                </h3>
              </div>

              <p className="text-xs text-[#64748B]">
                Issue server-side call to PayPal Orders API v2 with payee binding:
              </p>

              {approval && !paypalResult && (
                <button
                  onClick={handleCreatePayPalOrder}
                  disabled={creatingOrder}
                  className="w-full py-2.5 px-4 bg-[#102A43] hover:bg-[#1B3A4B] text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>{creatingOrder ? "Creating Sandbox Order..." : "Create PayPal Sandbox Order"}</span>
                </button>
              )}

              {paypalResult && (
                <div className="space-y-2">
                  <div className="p-2.5 bg-[#E8F5E9] border border-[#C8E6C9] rounded text-xs text-[#16835D] font-mono">
                    <span className="block font-bold">PayPal Order: {paypalResult.paypalOrderId}</span>
                    <span className="text-[11px]">Status: {paypalResult.status}</span>
                  </div>

                  {paypalResult.approvalUrl && (
                    <a
                      href={paypalResult.approvalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 border border-[#CBD5E1] rounded text-xs font-mono text-[#102A43] hover:bg-[#F0F3F7] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Open PayPal Sandbox Window</span>
                      <ExternalLink className="h-3.5 w-3.5 text-[#1769AA]" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: PayPal Capture & Transaction Passport Generation */}
            <div className={`bg-white border rounded-lg p-5 space-y-3 ${paypalResult ? "border-[#E2E8F0]" : "border-[#E2E8F0] opacity-50"}`}>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#16835D] text-white flex items-center justify-center font-mono text-xs font-bold">
                  3
                </span>
                <h3 className="text-xs font-bold text-[#102A43] uppercase tracking-wider font-mono">
                  Capture & Generate Passport
                </h3>
              </div>

              <p className="text-xs text-[#64748B]">
                Capture approved order, verify settlement, and seal cryptographic hash chain:
              </p>

              {paypalResult && (
                <button
                  onClick={handleCaptureOrder}
                  disabled={capturing}
                  className="w-full py-2.5 px-4 bg-[#16835D] hover:bg-[#126B4B] text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{capturing ? "Capturing & Sealing..." : "Capture & Seal Passport"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
