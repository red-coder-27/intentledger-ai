"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  Search,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Key,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { IntentMandateData, ProductData, PurchaseProposalData } from "@/types";

export default function ShoppingAgentPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-[#64748B]">Loading Shopping Agent...</div>}>
      <ShoppingAgentContent />
    </Suspense>
  );
}

function ShoppingAgentContent() {
  const searchParams = useSearchParams();
  const initialMandateId = searchParams.get("mandateId") || "";

  const [mandates, setMandates] = useState<IntentMandateData[]>([]);
  const [selectedMandateId, setSelectedMandateId] = useState(initialMandateId);
  const [query, setQuery] = useState("wireless headphones under 100");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/intents")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.length > 0) {
          setMandates(json.data);
          if (!selectedMandateId) {
            setSelectedMandateId(json.data[0].id);
          }
        }
      });
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMandateId) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/v1/agent/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandateId: selectedMandateId, query }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to generate proposal");
      }
      setResult(json.data);
    } catch (err: any) {
      setError(err.message || "Failed to generate proposal");
    } finally {
      setLoading(false);
    }
  };

  const selectedMandate = mandates.find((m) => m.id === selectedMandateId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-2">
        <h1 className="text-xl font-bold tracking-tight text-[#102A43]">
          Autonomous Shopping Agent
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          AI assistant discovers catalogue products and constructs structured proposals. All financial limits and availability are grounded in verified database records.
        </p>
      </div>

      {/* Control Panel: Mandate Selection & Query */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#102A43] mb-1">
                Active Intent Mandate
              </label>
              <select
                value={selectedMandateId}
                onChange={(e) => setSelectedMandateId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded focus:outline-none focus:border-[#1769AA] bg-white text-[#102A43]"
              >
                {mandates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} (Max ${m.budgetLimit} {m.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#102A43] mb-1">
                Natural-Language Shopping Request
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Find noise cancelling wireless headphones from approved merchant"
                  className="flex-1 px-3 py-2 text-xs border border-[#CBD5E1] rounded focus:outline-none focus:border-[#1769AA] text-[#102A43]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#1769AA] text-white rounded text-xs font-semibold hover:bg-[#12538A] transition-colors flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                >
                  <Bot className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  <span>{loading ? "Agent Searching..." : "Generate Proposal"}</span>
                </button>
              </div>
            </div>
          </div>
        </form>

        {selectedMandate && (
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-xs flex flex-wrap items-center justify-between gap-2 font-mono">
            <span className="text-[#64748B]">
              Bound Mandate: <strong className="text-[#102A43] font-sans">{selectedMandate.title}</strong>
            </span>
            <span className="text-[#1769AA]">Budget Limit: ${selectedMandate.budgetLimit} {selectedMandate.currency}</span>
            <span className="text-[#16835D]">Permitted: {selectedMandate.permittedMerchants.join(", ") || "Any"}</span>
            <span className="text-[#C2413B]">Restricted: {selectedMandate.restrictedMerchants.join(", ") || "None"}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded text-xs text-[#C2413B]">
          {error}
        </div>
      )}

      {/* Proposal & Policy Result Card */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Proposal Card (2 cols) */}
          <div className="md:col-span-2 bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-wider text-[#1769AA] uppercase font-bold">
                  Structured Agent Recommendation
                </span>
                <h2 className="text-base font-bold text-[#102A43] mt-0.5">
                  {result.proposal.productName}
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5 font-mono">
                  Merchant: <span className="text-[#102A43] font-semibold">{result.proposal.merchantName}</span> (ID: {result.proposal.merchantId})
                </p>
              </div>

              <div className="text-right">
                <span className="text-2xl font-bold font-mono text-[#102A43] tabular-nums">
                  ${result.proposal.proposedAmount}
                </span>
                <span className="text-xs font-mono text-[#64748B] ml-1">
                  {result.proposal.currency}
                </span>
                <p className="text-[10px] text-[#64748B] font-mono">Qty: {result.proposal.quantity}</p>
              </div>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-xs text-[#334155] leading-relaxed">
              <strong>Agent Reasoning:</strong> {result.proposal.reasoningSummary}
            </div>

            {/* Constraint Satisfactions */}
            <div className="space-y-2 pt-2 border-t border-[#F0F3F7]">
              <span className="text-xs font-semibold text-[#102A43] block">
                Mandate Policy Evaluation
              </span>
              <div className="flex flex-wrap gap-2">
                {result.proposal.constraintsSatisfied.map((c: string) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#E8F5E9] text-[#16835D] rounded font-mono text-[10px]"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{c}</span>
                  </span>
                ))}
                {result.proposal.constraintsViolated.map((v: string) => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEE2E2] text-[#C2413B] rounded font-mono text-[10px]"
                  >
                    <XCircle className="h-3 w-3" />
                    <span>{v}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Cryptographic Fingerprint */}
            <div className="pt-2 border-t border-[#F0F3F7] flex items-center justify-between text-xs font-mono text-[11px]">
              <span className="text-[#64748B]">Proposal Fingerprint:</span>
              <span className="text-[#102A43] bg-[#F0F3F7] px-2 py-0.5 rounded">
                {result.proposal.proposalFingerprint.slice(0, 32)}...
              </span>
            </div>
          </div>

          {/* Right Column: Kernel Decision Gate */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#102A43] uppercase tracking-wider font-mono">
                  Kernel Decision
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${
                    result.evaluation.decision === "ALLOW"
                      ? "bg-[#E8F5E9] text-[#16835D]"
                      : result.evaluation.decision === "REQUIRE_APPROVAL"
                      ? "bg-[#E0F2FE] text-[#1769AA]"
                      : "bg-[#FEE2E2] text-[#C2413B]"
                  }`}
                >
                  {result.evaluation.decision}
                </span>
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded space-y-1.5 text-xs">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[#64748B]">Evaluated Amount:</span>
                  <span className="font-bold text-[#102A43]">${result.evaluation.evaluatedAmount}</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[#64748B]">Authorized Limit:</span>
                  <span className="font-bold text-[#1769AA]">${result.evaluation.maximumAmount}</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[#64748B]">Reason Code:</span>
                  <span className="font-bold text-[#102A43]">{result.evaluation.reasonCodes[0]}</span>
                </div>
              </div>

              <p className="text-[11px] text-[#64748B]">
                {result.evaluation.decision === "BLOCK"
                  ? "The deterministic kernel has blocked this proposal. No payment call can be initiated."
                  : "The proposal satisfies all hard policy constraints. Proceed to Human Approval to lock the fingerprint and prepare checkout."}
              </p>
            </div>

            {result.evaluation.decision !== "BLOCK" ? (
              <Link
                href={`/app/authorization?proposalId=${result.proposal.id}`}
                className="w-full py-2 px-4 bg-[#1769AA] hover:bg-[#12538A] text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span>Proceed to Human Approval</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <button
                disabled
                className="w-full py-2 px-4 bg-[#E2E8F0] text-[#94A3B8] rounded text-xs font-medium cursor-not-allowed"
              >
                Execution Prohibited by Policy
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
