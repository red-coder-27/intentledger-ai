"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Key,
  ShieldCheck,
  Download,
  RefreshCw,
  ExternalLink,
  Receipt,
  FileCheck,
} from "lucide-react";
import { TransactionPassportData } from "@/types";

export default function PassportDetailPage() {
  const { id } = useParams() as { id: string };

  const [passport, setPassport] = useState<TransactionPassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyReport, setVerifyReport] = useState<any>(null);

  const fetchPassport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/passports/${id}`);
      const json = await res.json();
      if (json.success) {
        setPassport(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassport();
  }, [id]);

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const res = await fetch(`/api/v1/passports/${id}/verify`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setVerifyReport(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!passport) return;
    const blob = new Blob([JSON.stringify(passport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `INTENTLEDGER_PASSPORT_${passport.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[#64748B] bg-white border border-[#E2E8F0] rounded-lg">
        Loading cryptographic passport records...
      </div>
    );
  }

  if (!passport) {
    return (
      <div className="p-12 text-center bg-white border border-[#E2E8F0] rounded-lg space-y-3">
        <p className="text-sm font-medium text-[#102A43]">Passport Not Found</p>
        <Link href="/app/passports" className="text-xs text-[#1769AA] hover:underline">
          Return to Passports List
        </Link>
      </div>
    );
  }

  const isVerified = passport.verificationStatus === "VERIFIED";

  return (
    <div className="space-y-6">
      {/* Breadcrumb Back */}
      <Link
        href="/app/passports"
        className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#102A43]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Transaction Passports</span>
      </Link>

      {/* Header Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-[#102A43]">{passport.id}</span>
              <span
                className={`px-2.5 py-0.5 rounded font-mono text-xs font-bold ${
                  isVerified
                    ? "bg-[#E8F5E9] text-[#16835D]"
                    : "bg-[#FEE2E2] text-[#C2413B]"
                }`}
              >
                {passport.verificationStatus}
              </span>
              <span className="font-mono text-xs text-[#64748B]">
                {passport.totalEvents} Sequenced Events
              </span>
            </div>

            <h1 className="text-base font-bold text-[#102A43] mt-1">
              {passport.summary.productName}
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Merchant: <strong className="text-[#102A43]">{passport.summary.merchantName}</strong> • Original Mandate: <span className="font-mono text-[#1769AA]">{passport.mandateId}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1769AA] hover:bg-[#12538A] text-white rounded text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${verifying ? "animate-spin" : ""}`} />
              <span>{verifying ? "Verifying Chain..." : "Verify Cryptographic Integrity"}</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#CBD5E1] text-[#102A43] hover:bg-[#F0F3F7] rounded text-xs font-medium transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-[#1769AA]" />
              <span>Export Evidence JSON</span>
            </button>
          </div>
        </div>

        {/* Live Independent Verification Result Banner */}
        {verifyReport && (
          <div
            className={`p-3.5 rounded border text-xs font-mono space-y-1 ${
              verifyReport.verificationStatus === "VERIFIED"
                ? "bg-[#E8F5E9] border-[#C8E6C9] text-[#16835D]"
                : "bg-[#FEE2E2] border-[#FECACA] text-[#C2413B]"
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {verifyReport.verificationStatus === "VERIFIED" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>
                Independent Cryptographic Verification: {verifyReport.verificationStatus}
              </span>
            </div>
            <p className="text-[11px]">
              Chain Valid: {verifyReport.chainValid ? "YES" : "NO"} • Signatures Valid: {verifyReport.signatureValid ? "YES" : "NO"} • Financial Reconciled: {verifyReport.reconciliationValid ? "YES" : "NO"}
            </p>
            {verifyReport.errorDetail && (
              <p className="text-[11px] text-[#C2413B] font-bold">
                Violation Detail: {verifyReport.errorDetail}
              </p>
            )}
          </div>
        )}

        {/* Financial & Settlement Provenance Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-[#F0F3F7] text-xs font-mono">
          <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
            <span className="text-[#64748B] block text-[10px]">Settled Amount</span>
            <span className="text-sm font-bold text-[#102A43] tabular-nums">
              ${passport.summary.amount} {passport.summary.currency}
            </span>
          </div>

          <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
            <span className="text-[#64748B] block text-[10px]">PayPal Sandbox Order</span>
            <span className="font-semibold text-[#1769AA] truncate block">
              {passport.paypalOrderId}
            </span>
          </div>

          <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
            <span className="text-[#64748B] block text-[10px]">PayPal Capture ID</span>
            <span className="font-semibold text-[#102A43] truncate block">
              {passport.paypalCaptureId}
            </span>
          </div>

          <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded">
            <span className="text-[#64748B] block text-[10px]">Settlement Timestamp</span>
            <span className="text-[#102A43] truncate block">
              {new Date(passport.summary.capturedAt).toISOString().slice(0, 19).replace("T", " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Sequential Hash Chain Ledger */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#102A43] uppercase tracking-wider font-mono">
            Cryptographic Event Timeline
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Iterative SHA-256 hash chain: H(n) = SHA256( H(n-1) || CanonicalEvent(n) )
          </p>
        </div>

        <div className="space-y-3">
          {passport.events.map((evt) => (
            <div
              key={evt.id}
              className="p-3.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] space-y-2 hover:border-[#CBD5E1] transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#102A43] text-white flex items-center justify-center font-mono text-[10px] font-bold">
                    {evt.sequenceNumber}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#102A43]">
                    {evt.eventType}
                  </span>
                </div>

                <span className="font-mono text-[10px] text-[#64748B]">
                  {new Date(evt.timestamp).toISOString().replace("T", " ").slice(0, 19)} UTC
                </span>
              </div>

              {/* Hash Linkage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono bg-[#FFFFFF] p-2.5 rounded border border-[#E2E8F0]">
                <div className="truncate">
                  <span className="text-[#64748B]">H(n-1): </span>
                  <span className="text-[#64748B]">{evt.previousHash}</span>
                </div>
                <div className="truncate">
                  <span className="text-[#1769AA] font-bold">H(n): </span>
                  <span className="text-[#102A43] font-semibold">{evt.currentHash}</span>
                </div>
              </div>

              {/* Canonical Payload */}
              <details className="text-[11px] font-mono text-[#334155] cursor-pointer">
                <summary className="text-[10px] text-[#1769AA] hover:underline select-none">
                  Inspect Canonical Payload (RFC 8785) & Signature
                </summary>
                <div className="mt-2 space-y-1">
                  <pre className="p-2 bg-[#F0F3F7] rounded text-[10px] overflow-x-auto text-[#102A43]">
                    {evt.canonicalPayload}
                  </pre>
                  {evt.signature && (
                    <p className="text-[10px] text-[#16835D] break-all">
                      Ed25519 Sig: {evt.signature}
                    </p>
                  )}
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

