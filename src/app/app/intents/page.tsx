"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ShieldAlert, CheckCircle2, Clock, XCircle, ArrowRight, RefreshCw, Key } from "lucide-react";
import { IntentMandateData } from "@/types";

export default function IntentsPage() {
  const [mandates, setMandates] = useState<IntentMandateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchMandates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/intents");
      const json = await res.json();
      if (json.success) {
        setMandates(json.data);
      }
    } catch (e) {
      console.error("Failed to load mandates", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMandates();
  }, []);

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this mandate? Revoked mandates cannot authorize new purchases.")) {
      return;
    }
    try {
      setRevokingId(id);
      const res = await fetch(`/api/v1/intents/${id}/revoke`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        fetchMandates();
      }
    } catch (e) {
      console.error("Failed to revoke mandate", e);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#102A43]">Intent Studio</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure, inspect, sign, and revoke autonomous purchasing mandates. Each mandate is sealed with an Ed25519 signature.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMandates}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF] border border-[#CBD5E1] rounded text-xs font-medium text-[#102A43] hover:bg-[#F0F3F7] transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/app/intents/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1769AA] text-white rounded text-xs font-semibold hover:bg-[#12538A] transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Intent Mandate</span>
          </Link>
        </div>
      </div>

      {/* Mandates List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#64748B] bg-white border border-[#E2E8F0] rounded-lg">
          Loading signed mandates...
        </div>
      ) : mandates.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E2E8F0] rounded-lg space-y-3">
          <p className="text-sm font-medium text-[#102A43]">No Intent Mandates Registered</p>
          <p className="text-xs text-[#64748B]">Create your first purchase mandate to establish autonomous shopping boundaries.</p>
          <Link
            href="/app/intents/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1769AA] text-white rounded text-xs font-medium"
          >
            <Plus className="h-4 w-4" />
            <span>Create Mandate</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {mandates.map((m) => {
            const isActive = m.status === "ACTIVE";
            const isExpired = m.status === "EXPIRED";
            const isRevoked = m.status === "REVOKED";

            return (
              <div
                key={m.id}
                className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5 hover:border-[#CBD5E1] transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-[#102A43]">{m.title}</h2>
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                          isActive
                            ? "bg-[#E8F5E9] text-[#16835D]"
                            : isExpired
                            ? "bg-[#FEF3C7] text-[#B7791F]"
                            : "bg-[#FEE2E2] text-[#C2413B]"
                        }`}
                      >
                        {m.status}
                      </span>
                      <span className="font-mono text-[10px] text-[#64748B]">
                        Key {m.signingKeyVersion}
                      </span>
                    </div>
                    <p className="text-xs text-[#334155] mt-1 italic">
                      "{m.naturalInstruction}"
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-base font-bold font-mono text-[#102A43] tabular-nums">
                      Max ${m.budgetLimit} {m.currency}
                    </span>
                    <p className="text-[11px] text-[#64748B] font-mono">
                      Max Qty: {m.maxQuantity} unit
                    </p>
                  </div>
                </div>

                {/* Structured Constraint Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#F0F3F7] text-xs">
                  <div>
                    <span className="text-[11px] text-[#64748B] block font-mono">Permitted Merchants:</span>
                    <span className="font-medium text-[#102A43]">
                      {m.permittedMerchants.length > 0 ? m.permittedMerchants.join(", ") : "Any Verified Merchant"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-[#64748B] block font-mono">Restricted Merchants:</span>
                    <span className="font-medium text-[#C2413B]">
                      {m.restrictedMerchants.length > 0 ? m.restrictedMerchants.join(", ") : "None"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-[#64748B] block font-mono">Approval Policy:</span>
                    <span className="font-medium text-[#1769AA]">
                      {m.requireHumanApproval ? "Exact Human Approval Required" : "Autonomous Pre-approved"}
                    </span>
                  </div>
                </div>

                {/* Cryptographic Footprint & Actions */}
                <div className="pt-2 border-t border-[#F0F3F7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 font-mono text-[10px] text-[#64748B] truncate">
                    <Key className="h-3 w-3 text-[#1769AA]" />
                    <span>Sig: {m.signature ? m.signature.slice(0, 24) + "..." : "UNSIGNED"}</span>
                    <span>•</span>
                    <span>Fingerprint: {m.fingerprint ? m.fingerprint.slice(0, 16) + "..." : "N/A"}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isActive && (
                      <>
                        <button
                          onClick={() => handleRevoke(m.id)}
                          disabled={revokingId === m.id}
                          className="px-2.5 py-1 text-[11px] font-medium text-[#C2413B] hover:bg-[#FFF5F5] border border-[#FDE8E8] rounded transition-colors"
                        >
                          {revokingId === m.id ? "Revoking..." : "Revoke Mandate"}
                        </button>
                        <Link
                          href={`/app/agent?mandateId=${m.id}`}
                          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#1769AA] hover:bg-[#12538A] rounded transition-colors inline-flex items-center gap-1"
                        >
                          <span>Deploy Agent</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

