"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FileCheck, ShieldCheck, ArrowRight, RefreshCw, Key, CheckCircle2 } from "lucide-react";
import { TransactionPassportData } from "@/types";

export default function PassportsListPage() {
  const [passports, setPassports] = useState<TransactionPassportData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPassports = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/passports");
      const json = await res.json();
      if (json.success) {
        setPassports(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassports();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#102A43]">
            Transaction Passports
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Cryptographically sealed transaction passports. Every event in the purchase lifecycle is chained via SHA-256 and independently verifiable.
          </p>
        </div>

        <button
          onClick={fetchPassports}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF] border border-[#CBD5E1] rounded text-xs font-medium text-[#102A43] hover:bg-[#F0F3F7] transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Passports</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#64748B] bg-white border border-[#E2E8F0] rounded-lg">
          Loading transaction passports...
        </div>
      ) : passports.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E2E8F0] rounded-lg space-y-3">
          <p className="text-sm font-medium text-[#102A43]">No Transaction Passports Issued Yet</p>
          <p className="text-xs text-[#64748B]">Complete a purchase lifecycle through the Authorization Center to generate a verifiable passport.</p>
          <Link
            href="/app/authorization"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1769AA] text-white rounded text-xs font-medium"
          >
            <span>Go to Authorization Center</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {passports.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-[#E2E8F0] rounded-lg p-5 hover:border-[#CBD5E1] transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#102A43]">{p.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        p.verificationStatus === "VERIFIED"
                          ? "bg-[#E8F5E9] text-[#16835D]"
                          : "bg-[#FEE2E2] text-[#C2413B]"
                      }`}
                    >
                      {p.verificationStatus}
                    </span>
                    <span className="font-mono text-[10px] text-[#64748B]">
                      {p.totalEvents} Hash-Linked Events
                    </span>
                  </div>
                  <h2 className="text-xs font-semibold text-[#1769AA] mt-1">
                    {p.summary.productName} • {p.summary.merchantName}
                  </h2>
                  <p className="text-[11px] text-[#64748B] italic mt-0.5">
                    "{p.summary.customerInstruction}"
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-base font-bold font-mono text-[#102A43] tabular-nums">
                    ${p.summary.amount} {p.summary.currency}
                  </span>
                  <p className="text-[11px] text-[#64748B] font-mono">
                    Captured: {new Date(p.summary.capturedAt).toISOString().slice(0, 10)}
                  </p>
                </div>
              </div>

              {/* Cryptographic Footprint */}
              <div className="pt-2 border-t border-[#F0F3F7] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-[11px]">
                <div className="truncate">
                  <span className="text-[#64748B]">Genesis Hash: </span>
                  <span className="text-[#102A43]">{p.genesisHash.slice(0, 24)}...</span>
                </div>
                <div className="truncate text-sm-right">
                  <span className="text-[#64748B]">Terminal Hash: </span>
                  <span className="text-[#102A43]">{p.finalHash.slice(0, 24)}...</span>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2 border-t border-[#F0F3F7] flex items-center justify-between">
                <span className="text-[11px] text-[#16835D] font-mono flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Ed25519 & SHA-256 Integrity Sealed</span>
                </span>

                <Link
                  href={`/app/passports/${p.id}`}
                  className="px-3 py-1.5 bg-[#1769AA] hover:bg-[#12538A] text-white rounded text-xs font-semibold transition-colors inline-flex items-center gap-1"
                >
                  <span>Inspect Audit Ledger</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
