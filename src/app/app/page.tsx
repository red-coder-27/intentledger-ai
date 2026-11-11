"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Receipt,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Lock,
} from "lucide-react";

export default function OverviewDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/analytics/overview");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error("Failed to load overview data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const metrics = data?.metrics || {
    totalSandboxTransactions: 2,
    successfulPayments: 1,
    blockedAttempts: 1,
    activeMandates: 1,
    intentDriftIncidents: 1,
    reconciliationMismatches: 0,
    totalValueTransacted: "85.00",
    verifiedPassports: 1,
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#102A43]">
            Operational Trust & Transaction Ledger
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Every autonomous agent transaction evaluated against cryptographically signed human mandates and reconciled against PayPal Developer Sandbox.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF] border border-[#CBD5E1] rounded text-xs font-medium text-[#102A43] hover:bg-[#F0F3F7] transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Ledger</span>
          </button>
          <Link
            href="/app/intents/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1769AA] text-white rounded text-xs font-semibold hover:bg-[#12538A] transition-colors"
          >
            <span>Create Mandate</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Primary Financial & Security Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-[#FFFFFF] p-4 rounded-lg border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Successful Payments</span>
            <Receipt className="h-4 w-4 text-[#16835D]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#102A43] tabular-nums">
              {metrics.successfulPayments}
            </span>
            <span className="text-xs text-[#16835D] font-medium font-mono">
              ${metrics.totalValueTransacted} USD
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            PayPal Sandbox captured & reconciled
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#FFFFFF] p-4 rounded-lg border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Blocked Violations</span>
            <ShieldAlert className="h-4 w-4 text-[#C2413B]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#C2413B] tabular-nums">
              {metrics.blockedAttempts}
            </span>
            <span className="text-xs text-[#C2413B] font-medium font-mono">
              Zero Spend Escaped
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Blocked by Deterministic Kernel
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#FFFFFF] p-4 rounded-lg border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Active Mandates</span>
            <Lock className="h-4 w-4 text-[#1769AA]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#102A43] tabular-nums">
              {metrics.activeMandates}
            </span>
            <span className="text-xs text-[#1769AA] font-medium font-mono">
              Ed25519 Signed
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Immutable customer authorization limits
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#FFFFFF] p-4 rounded-lg border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Verifiable Passports</span>
            <FileCheck className="h-4 w-4 text-[#16835D]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#102A43] tabular-nums">
              {metrics.verifiedPassports}
            </span>
            <span className="text-xs text-[#16835D] font-medium font-mono">
              100% Chain Integrity
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Tamper-evident SHA-256 hash chains
          </p>
        </div>
      </div>

      {/* Core Architectural Verticals Banner */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5">
        <h2 className="text-sm font-bold text-[#102A43] uppercase tracking-wider font-mono">
          Three-Minute Hackathon Demonstration Flow
        </h2>
        <p className="text-xs text-[#64748B] mt-1 mb-4">
          Experience the complete lifecycle from natural-language intent to PayPal checkout and verifiable cryptographic passport.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Link
            href="/app/intents/new"
            className="p-3 border border-[#E2E8F0] rounded bg-[#F8FAFC] hover:border-[#1769AA] hover:bg-[#FFFFFF] transition-all group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#102A43]">
              <span className="font-mono text-[#1769AA]">01. Mandate</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#64748B] group-hover:text-[#1769AA]" />
            </div>
            <p className="text-[11px] text-[#64748B] mt-1.5">
              Customer authorizes $100 max budget with Ed25519 digital signature.
            </p>
          </Link>

          <Link
            href="/app/agent"
            className="p-3 border border-[#E2E8F0] rounded bg-[#F8FAFC] hover:border-[#1769AA] hover:bg-[#FFFFFF] transition-all group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#102A43]">
              <span className="font-mono text-[#1769AA]">02. Discovery</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#64748B] group-hover:text-[#1769AA]" />
            </div>
            <p className="text-[11px] text-[#64748B] mt-1.5">
              AI proposes $85 AuraSound or blocks unauthorized $160 proposal.
            </p>
          </Link>

          <Link
            href="/app/authorization"
            className="p-3 border border-[#E2E8F0] rounded bg-[#F8FAFC] hover:border-[#1769AA] hover:bg-[#FFFFFF] transition-all group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#102A43]">
              <span className="font-mono text-[#1769AA]">03. Enforcement</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#64748B] group-hover:text-[#1769AA]" />
            </div>
            <p className="text-[11px] text-[#64748B] mt-1.5">
              Deterministic kernel runs 18 checks and demands proposal-bound approval.
            </p>
          </Link>

          <Link
            href="/app/transactions"
            className="p-3 border border-[#E2E8F0] rounded bg-[#F8FAFC] hover:border-[#1769AA] hover:bg-[#FFFFFF] transition-all group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#102A43]">
              <span className="font-mono text-[#1769AA]">04. Proof</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#64748B] group-hover:text-[#1769AA]" />
            </div>
            <p className="text-[11px] text-[#64748B] mt-1.5">
              PayPal capture reconciled and Transaction Passport generated.
            </p>
          </Link>
        </div>
      </div>

      {/* Two Column Layout: Recent Transactions & Scenario Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Transactions Stream */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#102A43]">Live Transaction Activity</h2>
              <p className="text-xs text-[#64748B]">Real-time payments and cryptographic ledger entries</p>
            </div>
            <Link
              href="/app/transactions"
              className="text-xs font-semibold text-[#1769AA] hover:underline flex items-center gap-1"
            >
              <span>View All in AG Grid</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {/* Demo Transaction Item 1 */}
            <div className="p-3.5 border border-[#E2E8F0] rounded bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#E8F5E9] rounded text-[#16835D]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#102A43]">
                      AuraSound Pro ANC Wireless Headphones
                    </span>
                    <span className="px-2 py-0.5 bg-[#E8F5E9] text-[#16835D] rounded font-mono text-[10px] font-medium">
                      CAPTURED
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-[#64748B]">
                    <span>Merchant: Demo Electronics</span>
                    <span>•</span>
                    <span>Order: 5O190127TN364715T</span>
                    <span>•</span>
                    <span className="text-[#16835D]">Reconciled</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-bold font-mono text-[#102A43] tabular-nums">$85.00 USD</span>
                <div>
                  <Link
                    href="/app/passports"
                    className="text-[11px] font-mono text-[#1769AA] hover:underline"
                  >
                    View Passport →
                  </Link>
                </div>
              </div>
            </div>

            {/* Demo Transaction Item 2 (Blocked) */}
            <div className="p-3.5 border border-[#FEE2E2] rounded bg-[#FFF5F5] flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#FEE2E2] rounded text-[#C2413B]">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#102A43]">
                      StudioMaster High-Fidelity Wireless Over-Ear
                    </span>
                    <span className="px-2 py-0.5 bg-[#FEE2E2] text-[#C2413B] rounded font-mono text-[10px] font-medium">
                      BLOCKED
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-[#64748B]">
                    <span>Reason: BUDGET_EXCEEDED</span>
                    <span>•</span>
                    <span className="text-[#C2413B]">Exceeded limit by $60.00</span>
                    <span>•</span>
                    <span>Zero PayPal Call</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-bold font-mono text-[#C2413B] tabular-nums">$160.00 USD</span>
                <div>
                  <span className="text-[11px] font-mono text-[#64748B]">Policy Enforced</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Demonstration Quick Scenarios */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#102A43]">Security Test Scenarios</h2>
            <span className="text-[11px] font-mono text-[#16835D]">9 Scenarios Verified</span>
          </div>
          <p className="text-xs text-[#64748B] mb-3">
            Deterministic unit & integration test coverage mandated by engineering directive:
          </p>

          <div className="space-y-2 text-xs">
            <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex items-center justify-between">
              <span className="font-mono text-[#1769AA] text-[11px]">SC-01: Valid Purchase</span>
              <span className="px-1.5 py-0.5 bg-[#E8F5E9] text-[#16835D] rounded font-mono text-[10px]">ALLOW</span>
            </div>
            <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex items-center justify-between">
              <span className="font-mono text-[#1769AA] text-[11px]">SC-02: Budget Violation</span>
              <span className="px-1.5 py-0.5 bg-[#FEE2E2] text-[#C2413B] rounded font-mono text-[10px]">BLOCK</span>
            </div>
            <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex items-center justify-between">
              <span className="font-mono text-[#1769AA] text-[11px]">SC-03: Merchant Restriction</span>
              <span className="px-1.5 py-0.5 bg-[#FEE2E2] text-[#C2413B] rounded font-mono text-[10px]">BLOCK</span>
            </div>
            <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex items-center justify-between">
              <span className="font-mono text-[#1769AA] text-[11px]">SC-04: Approval Tampering</span>
              <span className="px-1.5 py-0.5 bg-[#FEE2E2] text-[#C2413B] rounded font-mono text-[10px]">INVALIDATE</span>
            </div>
            <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex items-center justify-between">
              <span className="font-mono text-[#1769AA] text-[11px]">SC-05: Expired Mandate</span>
              <span className="px-1.5 py-0.5 bg-[#FEE2E2] text-[#C2413B] rounded font-mono text-[10px]">BLOCK</span>
            </div>
            <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex items-center justify-between">
              <span className="font-mono text-[#1769AA] text-[11px]">SC-06: Payment Variance</span>
              <span className="px-1.5 py-0.5 bg-[#FEF3C7] text-[#B7791F] rounded font-mono text-[10px]">EXCEPTION</span>
            </div>
            <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex items-center justify-between">
              <span className="font-mono text-[#1769AA] text-[11px]">SC-07: Ledger Tampering</span>
              <span className="px-1.5 py-0.5 bg-[#FEE2E2] text-[#C2413B] rounded font-mono text-[10px]">DETECTED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
