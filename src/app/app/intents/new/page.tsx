"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Key, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

export default function NewMandatePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("Wireless Headphones Purchase");
  const [naturalInstruction, setNaturalInstruction] = useState(
    "Find wireless headphones under $100 from an approved merchant. Compare the options. Do not purchase anything without my explicit approval."
  );
  const [budgetLimit, setBudgetLimit] = useState("100.00");
  const [currency, setCurrency] = useState("USD");
  const [permittedMerchants, setPermittedMerchants] = useState("Demo Electronics");
  const [restrictedMerchants, setRestrictedMerchants] = useState("ShadyDeals LLC");
  const [requiredAttributes, setRequiredAttributes] = useState("wireless, noise-cancelling");
  const [excludedCategories, setExcludedCategories] = useState("refurbished");
  const [maxQuantity, setMaxQuantity] = useState(1);
  const [requireHumanApproval, setRequireHumanApproval] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState(30);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title,
        naturalInstruction,
        budgetLimit,
        currency,
        permittedMerchants: permittedMerchants
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        restrictedMerchants: restrictedMerchants
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        requiredAttributes: requiredAttributes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        excludedCategories: excludedCategories
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        maxQuantity: Number(maxQuantity),
        requireHumanApproval,
        expiresInDays: Number(expiresInDays),
      };

      const res = await fetch("/api/v1/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to sign mandate");
      }

      router.push(`/app/agent?mandateId=${json.data.id}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb Back */}
      <Link
        href="/app/intents"
        className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#102A43]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Intent Studio</span>
      </Link>

      <div className="border-b border-[#E2E8F0] pb-2">
        <h1 className="text-xl font-bold tracking-tight text-[#102A43]">
          Create & Sign Intent Mandate
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Establish deterministic policy boundaries. The natural-language instruction is translated into structured constraints and signed with Ed25519.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded text-xs text-[#C2413B] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Input Form (2 cols) */}
        <div className="md:col-span-2 space-y-4 bg-white border border-[#E2E8F0] rounded-lg p-5">
          <div>
            <label className="block text-xs font-semibold text-[#102A43] mb-1">
              Mandate Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded text-xs text-[#102A43] focus:outline-none focus:border-[#1769AA]"
              placeholder="e.g. Wireless Headphones Purchase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#102A43] mb-1">
              Natural-Language Instruction
            </label>
            <textarea
              rows={3}
              value={naturalInstruction}
              onChange={(e) => setNaturalInstruction(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded text-xs text-[#102A43] focus:outline-none focus:border-[#1769AA]"
              placeholder="Describe your purchase goals and limits in plain English..."
            />
            <p className="text-[11px] text-[#64748B] mt-1">
              * Note: Natural-language text never silently overrides the structured limits below.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#102A43] mb-1">
                Maximum Budget Limit ($)
              </label>
              <input
                type="text"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                required
                className="w-full px-3 py-2 font-mono text-xs text-[#102A43] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#1769AA]"
                placeholder="100.00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#102A43] mb-1">
                Currency
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                required
                className="w-full px-3 py-2 font-mono text-xs text-[#102A43] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#1769AA]"
                placeholder="USD"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#102A43] mb-1">
                Permitted Merchants (Allowlist)
              </label>
              <input
                type="text"
                value={permittedMerchants}
                onChange={(e) => setPermittedMerchants(e.target.value)}
                className="w-full px-3 py-2 text-xs text-[#102A43] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#1769AA]"
                placeholder="Demo Electronics"
              />
              <p className="text-[10px] text-[#64748B] mt-0.5">Comma-separated</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#102A43] mb-1">
                Restricted Merchants (Blocklist)
              </label>
              <input
                type="text"
                value={restrictedMerchants}
                onChange={(e) => setRestrictedMerchants(e.target.value)}
                className="w-full px-3 py-2 text-xs text-[#102A43] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#1769AA]"
                placeholder="ShadyDeals LLC"
              />
              <p className="text-[10px] text-[#64748B] mt-0.5">Comma-separated</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#102A43] mb-1">
                Required Attributes
              </label>
              <input
                type="text"
                value={requiredAttributes}
                onChange={(e) => setRequiredAttributes(e.target.value)}
                className="w-full px-3 py-2 text-xs text-[#102A43] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#1769AA]"
                placeholder="wireless, noise-cancelling"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#102A43] mb-1">
                Excluded Categories
              </label>
              <input
                type="text"
                value={excludedCategories}
                onChange={(e) => setExcludedCategories(e.target.value)}
                className="w-full px-3 py-2 text-xs text-[#102A43] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#1769AA]"
                placeholder="refurbished"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#102A43] mb-1">
                Max Quantity
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxQuantity}
                onChange={(e) => setMaxQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs text-[#102A43] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#1769AA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#102A43] mb-1">
                Mandate Validity (Days)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs text-[#102A43] border border-[#CBD5E1] rounded focus:outline-none focus:border-[#1769AA]"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requireHumanApproval}
                onChange={(e) => setRequireHumanApproval(e.target.checked)}
                className="h-4 w-4 text-[#1769AA] border-[#CBD5E1] rounded focus:ring-0"
              />
              <span className="text-xs font-medium text-[#102A43]">
                Require explicit proposal-bound human approval before PayPal order execution
              </span>
            </label>
          </div>
        </div>

        {/* Right Column: Cryptographic Preview & Action */}
        <div className="space-y-4">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#102A43]">
              <Key className="h-4 w-4 text-[#1769AA]" />
              <span>Ed25519 Signing Preview</span>
            </div>

            <p className="text-[11px] text-[#64748B]">
              The following canonical structure will be cryptographically signed by the INTENTLEDGER key management facility:
            </p>

            <pre className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-[10px] font-mono text-[#334155] overflow-x-auto">
{JSON.stringify(
  {
    title,
    budgetLimit: Number(budgetLimit).toFixed(2),
    currency,
    permittedMerchants: permittedMerchants.split(",").map((s) => s.trim()).filter(Boolean),
    restrictedMerchants: restrictedMerchants.split(",").map((s) => s.trim()).filter(Boolean),
    requiredAttributes: requiredAttributes.split(",").map((s) => s.trim()).filter(Boolean),
    maxQuantity,
    requireHumanApproval,
    keyVersion: "v1",
  },
  null,
  2
)}
            </pre>

            <div className="p-2 bg-[#E8F5E9] border border-[#C8E6C9] rounded text-[11px] text-[#16835D] flex items-start gap-1.5 font-mono">
              <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Tamper-evident payload. Any future alteration will break the Ed25519 signature.</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-[#1769AA] hover:bg-[#12538A] text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Key className="h-3.5 w-3.5" />
              <span>{submitting ? "Signing & Activating..." : "Sign & Activate Mandate"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

