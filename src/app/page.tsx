import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  Receipt,
  FileCheck,
  Lock,
  Scale,
  CreditCard,
  Bot,
  ExternalLink,
} from "lucide-react";
import { IntentLedgerLogo } from "@/components/layout/logo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#102A43] flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="h-16 border-b border-[#E2E8F0] bg-white px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IntentLedgerLogo className="h-7 w-7" />
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-[#102A43] uppercase leading-none font-sans">
              INTENTLEDGER <span className="text-[#1769AA]">AI</span>
            </span>
            <span className="text-[10px] tracking-wider font-mono text-[#64748B] uppercase leading-tight mt-0.5">
              PayPal AI Hackathon
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/app"
            className="px-4 py-2 bg-[#1769AA] hover:bg-[#12538A] text-white rounded text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Launch App</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24 space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#EBF4FB] border border-[#BFDBFE] rounded-full text-xs font-mono text-[#1769AA]">
            <span>fintech infrastructure for autonomous commerce</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#102A43] leading-tight">
            Every AI transaction <br className="hidden sm:inline" />
            <span className="text-[#1769AA]">deserves proof.</span>
          </h1>

          <p className="text-sm md:text-base text-[#64748B] leading-relaxed">
            AI agents can discover products and compare offers, but they cannot be given blind purchasing authority. INTENTLEDGER introduces a deterministic authorization and cryptographic evidence layer between autonomous agents, human intent, and PayPal.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app"
              className="w-full sm:w-auto px-6 py-3 bg-[#1769AA] hover:bg-[#12538A] text-white rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Explore Operational Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/app/intents/new"
              className="w-full sm:w-auto px-6 py-3 bg-white border border-[#CBD5E1] hover:bg-[#F0F3F7] text-[#102A43] rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <span>Create Intent Mandate</span>
            </Link>
          </div>
        </div>

        {/* Core Proposition Callout Banner */}
        <div className="p-6 bg-white border border-[#E2E8F0] rounded-xl shadow-sm text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#1769AA] font-bold">
            The Fundamental Proposition
          </span>
          <p className="text-base font-bold text-[#102A43]">
            "An AI agent can recommend a purchase, but it cannot spend beyond the customer's intent."
          </p>
          <p className="text-xs text-[#64748B] max-w-2xl mx-auto">
            Deterministic policies independently enforce budget limits, authorized merchants, single-use approval fingerprints, and financial reconciliation against PayPal Developer Sandbox.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 border border-[#E2E8F0] rounded-lg space-y-3">
            <div className="p-2.5 bg-[#EBF4FB] rounded w-fit text-[#1769AA]">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-[#102A43]">Intent Mandates</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Customers define exact purchase constraints—budget ceilings, allowlisted merchants, required attributes—sealed with Ed25519 digital signatures.
            </p>
          </div>

          <div className="bg-white p-5 border border-[#E2E8F0] rounded-lg space-y-3">
            <div className="p-2.5 bg-[#E8F5E9] rounded w-fit text-[#16835D]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-[#102A43]">Deterministic Kernel</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              18 independent backend checks ensure zero spend escape. Over-budget or rogue merchant recommendations are blocked deterministically before reaching PayPal.
            </p>
          </div>

          <div className="bg-white p-5 border border-[#E2E8F0] rounded-lg space-y-3">
            <div className="p-2.5 bg-[#FEF3C7] rounded w-fit text-[#B7791F]">
              <FileCheck className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-[#102A43]">Transaction Passports</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Tamper-evident SHA-256 hash chains connect original intent, proposal, approval token, PayPal order, capture, and reconciliation into a verifiable audit dossier.
            </p>
          </div>
        </div>

        {/* End-to-End Lifecycle Sequence */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#102A43] uppercase tracking-wider font-mono">
            Transaction Execution Sequence
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs font-mono">
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded space-y-1">
              <span className="text-[#1769AA] font-bold">1. Mandate</span>
              <p className="text-[11px] text-[#64748B] font-sans">Customer signs $100 budget limit with Ed25519.</p>
            </div>
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded space-y-1">
              <span className="text-[#1769AA] font-bold">2. Proposal</span>
              <p className="text-[11px] text-[#64748B] font-sans">AI generates $85 catalogue-backed proposal.</p>
            </div>
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded space-y-1">
              <span className="text-[#1769AA] font-bold">3. Kernel Check</span>
              <p className="text-[11px] text-[#64748B] font-sans">18 checks verify budget, payee, and single-use token.</p>
            </div>
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded space-y-1">
              <span className="text-[#1769AA] font-bold">4. PayPal Order</span>
              <p className="text-[11px] text-[#64748B] font-sans">Orders API v2 executes Sandbox checkout.</p>
            </div>
            <div className="p-3 bg-[#16835D] text-white rounded space-y-1">
              <span className="text-white font-bold">5. Passport</span>
              <p className="text-[11px] text-white/90 font-sans">Reconciled capture seals tamper-evident hash chain.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white px-6 md:px-12 py-6 text-xs text-[#64748B] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <IntentLedgerLogo className="h-4 w-4" />
          <span className="font-mono text-[#102A43] font-semibold">INTENTLEDGER AI</span>
          <span>— Built for the PayPal AI Hackathon</span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px]">
          <Link href="/app/transactions" className="hover:text-[#102A43]">
            AG Grid Workspace
          </Link>
          <Link href="/app/passports" className="hover:text-[#102A43]">
            Transaction Passports
          </Link>
          <Link href="/app/settings" className="hover:text-[#102A43]">
            Diagnostics
          </Link>
        </div>
      </footer>
    </div>
  );
}
