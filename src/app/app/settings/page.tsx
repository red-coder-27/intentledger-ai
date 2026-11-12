"use client";

import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Key,
  Database,
  Bot,
  CreditCard,
  Lock,
} from "lucide-react";

export default function SettingsDiagnosticsPage() {
  const [paypalStatus, setPaypalStatus] = useState("Configured (Developer Sandbox)");
  const [dbStatus, setDbStatus] = useState("Active (Dual-Persistence Layer)");
  const [aiStatus, setAiStatus] = useState("Active (Groq + Deterministic Rule Engine)");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-2">
        <h1 className="text-xl font-bold tracking-tight text-[#102A43]">
          System Settings & Infrastructure Diagnostics
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Inspect server configuration, security boundaries, cryptographic signing versions, and gateway readiness. Secrets are never exposed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Gateway & Payment Integration */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#1769AA]" />
            <h2 className="text-sm font-bold text-[#102A43]">PayPal Developer Sandbox</h2>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">Gateway Mode:</span>
              <span className="font-bold text-[#16835D]">Developer Sandbox (api-m.sandbox.paypal.com)</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">Orders API:</span>
              <span className="font-bold text-[#102A43]">v2 Checkout with intent: CAPTURE</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">Webhook Verification:</span>
              <span className="font-bold text-[#16835D]">Cryptographic Signature Check Active</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">Demonstration Payee:</span>
              <span className="font-bold font-mono text-[#102A43]">sb-25i8a53852340@business.example.com</span>
            </div>
          </div>
        </div>

        {/* Card 2: Cryptographic Key Management */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-[#1769AA]" />
            <h2 className="text-sm font-bold text-[#102A43]">Cryptographic Key Management</h2>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">Signature Primitive:</span>
              <span className="font-bold text-[#102A43]">Ed25519 (Curve25519 EdDSA)</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">Audit Ledger Hashing:</span>
              <span className="font-bold text-[#102A43]">SHA-256 on RFC 8785 Canonical JSON</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">Active Key Version:</span>
              <span className="font-bold text-[#1769AA]">v1</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">Private Key Storage:</span>
              <span className="font-bold text-[#16835D]">Server Memory / Environment Only</span>
            </div>
          </div>
        </div>

        {/* Card 3: Deterministic Kernel Policies */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#16835D]" />
            <h2 className="text-sm font-bold text-[#102A43]">Financial Authorization Kernel</h2>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">Policy Check Depth:</span>
              <span className="font-bold text-[#102A43]">18 Deterministic Rules</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">LLM Financial Authority:</span>
              <span className="font-bold text-[#C2413B]">ZERO (Strict Prohibited by ADR-001)</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">Proposal Fingerprinting:</span>
              <span className="font-bold text-[#16835D]">SHA-256 Non-Malleable Binding</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">Approval Consumption:</span>
              <span className="font-bold text-[#16835D]">Single-Use Atomic Enforcement</span>
            </div>
          </div>
        </div>

        {/* Card 4: AI & Persistence Runtime */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#1769AA]" />
            <h2 className="text-sm font-bold text-[#102A43]">Persistence & AI Engine</h2>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">Database Mode:</span>
              <span className="font-bold text-[#102A43]">PostgreSQL / Neon (Prisma ORM)</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">Zero-Setup Local Dev:</span>
              <span className="font-bold text-[#16835D]">In-Memory Test Store Active</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">AI Shopping Assistant:</span>
              <span className="font-bold text-[#102A43]">Groq Cloud (llama-3.3-70b-versatile)</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded flex justify-between">
              <span className="text-[#64748B]">Catalogue Grounding:</span>
              <span className="font-bold text-[#16835D]">16 Curated Database Products</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

